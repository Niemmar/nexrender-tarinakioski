import argparse
import io
import os
import pathlib
import threading
from queue import Empty, Queue
from shutil import rmtree

import ffmpeg
import numpy as np
from PIL import Image
from rembg import new_session, remove

os.environ.setdefault(
    "PYTORCH_CUDA_ALLOC_CONF",
    "expandable_segments:True,managed_memory:True",
)

parser = argparse.ArgumentParser(
    description=(
        "Creates a full-resolution grayscale ProRes 422 Proxy mask video "
        "from an input video."
    )
)
parser.add_argument("input", type=str, help="Input color video")
parser.add_argument(
    "-o",
    type=str,
    default="export/output_mask.mov",
    help="Output ProRes 422 Proxy mask video path",
)
parser.add_argument(
    "--model",
    type=str,
    default="u2net_human_seg",
    help="rembg model to use (default: u2net_human_seg)",
)
parser.add_argument(
    "--workers",
    type=int,
    default=1,
    help="Number of concurrent background-removal workers (default: 1)",
)
parser.add_argument(
    "--smooth",
    type=int,
    default=3,
    help="Temporal mask smoothing window in frames (default: 3, 0 disables)",
)
parser.add_argument(
    "--buffer-size",
    type=int,
    default=8,
    help="Maximum number of frames held in each processing queue",
)
parser.add_argument(
    "--smooth-workers",
    type=int,
    default=os.cpu_count() or 4,
    help="Number of CPU threads used for mask smoothing",
)
args = parser.parse_args()


def is_oom_error(exc):
    text = str(exc).lower()
    return any(
        phrase in text
        for phrase in (
            "out of memory",
            "cuda out of memory",
            "failed to allocate",
            "oom",
            "memory error",
        )
    )


def image_to_tiff_bytes(image):
    grayscale = image.convert("L")
    with io.BytesIO() as buffer:
        grayscale.save(buffer, format="TIFF", compression="raw")
        return buffer.getvalue()


def result_to_alpha_mask(result):
    if isinstance(result, (bytes, bytearray)):
        image = Image.open(io.BytesIO(bytes(result)))
    elif isinstance(result, np.ndarray):
        image = Image.fromarray(result)
    elif isinstance(result, Image.Image):
        image = result
    else:
        raise RuntimeError(
            f"Unexpected rembg result type: {type(result).__name__}"
        )

    return image.convert("RGBA").getchannel("A")


def remove_with_fallback(
    image_bytes,
    session,
    scales=(1.0, 0.8, 0.6, 0.4),
):
    original = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    width, height = original.size
    last_exception = None

    for scale in scales:
        try:
            if scale == 1.0:
                source_bytes = image_bytes
            else:
                resized = original.resize(
                    (
                        max(1, int(width * scale)),
                        max(1, int(height * scale)),
                    ),
                    Image.Resampling.LANCZOS,
                )
                with io.BytesIO() as buffer:
                    resized.save(buffer, format="TIFF", compression="raw")
                    source_bytes = buffer.getvalue()

            result = remove(source_bytes, session=session)
            mask = result_to_alpha_mask(result)

            if mask.size != (width, height):
                mask = mask.resize(
                    (width, height),
                    Image.Resampling.LANCZOS,
                )

            return image_to_tiff_bytes(mask)

        except Exception as exc:
            last_exception = exc

            if not is_oom_error(exc):
                raise RuntimeError(
                    "Background removal failed unexpectedly."
                ) from exc

            if scale == scales[-1]:
                raise RuntimeError(
                    "Insufficient GPU memory: background removal failed "
                    "even after fallback downscales."
                ) from exc

            print(
                f"OOM detected at scale {scale:.2f}; "
                "retrying with a lower-resolution mask...",
                flush=True,
            )

    raise RuntimeError(
        "Background removal failed unexpectedly."
    ) from last_exception


probe = ffmpeg.probe(args.input)
video_stream = next(
    (
        stream
        for stream in probe["streams"]
        if stream["codec_type"] == "video"
    ),
    None,
)

if video_stream is None:
    raise ValueError(
        f"No video stream found in input file: {args.input}"
    )

width = int(video_stream["width"])
height = int(video_stream["height"])
frame_size = f"{width}x{height}"
framerate = video_stream["avg_frame_rate"]

script_dir = pathlib.Path(__file__).resolve().parent
frames_dir = script_dir / "frames"
processed_dir = script_dir / "processed"
smoothed_dir = script_dir / "processed_smoothed"

rmtree(frames_dir, ignore_errors=True)
rmtree(processed_dir, ignore_errors=True)
rmtree(smoothed_dir, ignore_errors=True)

frames_dir.mkdir(parents=True)
processed_dir.mkdir(parents=True)

print("Extracting video frames...", flush=True)

input_stream = ffmpeg.input(args.input)
frame_output = ffmpeg.output(
    input_stream.video,
    str(frames_dir / "%04d.tiff"),
)


duration_seconds = float(
    video_stream.get("duration")
    or probe.get("format", {}).get("duration")
    or 0
)


progress_output = frame_output.global_args(
    "-progress", "pipe:1",
    "-nostats"
)

process = ffmpeg.run_async(
    progress_output,
    overwrite_output=True,
    pipe_stdout=True
)

last_percent = -1

for raw_line in process.stdout:
    line = raw_line.decode("utf-8", errors="replace").strip()

    if not line.startswith("out_time=") or duration_seconds <= 0:
        continue

    try:
        hours, minutes, seconds = line.split("=", 1)[1].split(":")
        elapsed = (
            int(hours) * 3600
            + int(minutes) * 60
            + float(seconds)
        )
    except (ValueError, IndexError):
        continue

    percent = max(
        0,
        min(99, int(elapsed / duration_seconds * 100))
    )

    if percent != last_percent:
        print(
            f"Preprocessing progress {percent}/100",
            flush=True
        )
        last_percent = percent

if process.wait() != 0:
    raise RuntimeError("Video frames extraction failed.")

print("Preprocessing progress 100/100", flush=True)


_SENTINEL = object()

try:
    files = sorted(
        file.name
        for file in frames_dir.iterdir()
        if file.is_file()
    )
    total_files = len(files)

    if total_files == 0:
        raise RuntimeError("No video frames were extracted.")

    print(
        f"Loading rembg session (model={args.model})...",
        flush=True,
    )

    session = new_session(
        args.model,
        providers=[
            "CUDAExecutionProvider",
            "CPUExecutionProvider",
        ],
    )

    read_queue = Queue(maxsize=args.buffer_size)
    write_queue = Queue(maxsize=args.buffer_size)
    errors = []
    active_processors = [args.workers]
    active_processors_lock = threading.Lock()

    def reader():
        try:
            for index, filename in enumerate(files, 1):
                frame_path = frames_dir / filename

                with open(frame_path, "rb") as frame_file:
                    frame_data = frame_file.read()

                read_queue.put((index, filename, frame_data))
                frame_path.unlink()
        except Exception as exc:
            errors.append(exc)
        finally:
            for _ in range(args.workers):
                read_queue.put(_SENTINEL)

    def processor():
        try:
            while True:
                item = read_queue.get()

                if item is _SENTINEL:
                    break

                index, filename, input_data = item

                print(
                    f"Processing frame {index}/{total_files}: {filename}",
                    flush=True,
                )

                mask_data = remove_with_fallback(
                    input_data,
                    session=session,
                )
                write_queue.put((index, filename, mask_data))
        except Exception as exc:
            errors.append(exc)
        finally:
            with active_processors_lock:
                active_processors[0] -= 1
                if active_processors[0] == 0:
                    write_queue.put(_SENTINEL)

    def writer():
        try:
            while True:
                item = write_queue.get()

                if item is _SENTINEL:
                    break

                index, filename, mask_data = item
                output_path = processed_dir / filename

                with open(output_path, "wb") as output_file:
                    output_file.write(mask_data)

                print(
                    f"Written mask {index}/{total_files}: {filename}",
                    flush=True,
                )
        except Exception as exc:
            errors.append(exc)

    reader_thread = threading.Thread(target=reader, daemon=True)
    processor_threads = [
        threading.Thread(target=processor, daemon=True)
        for _ in range(args.workers)
    ]
    writer_thread = threading.Thread(target=writer, daemon=True)

    reader_thread.start()
    for thread in processor_threads:
        thread.start()
    writer_thread.start()

    reader_thread.join()
    for thread in processor_threads:
        thread.join()
    writer_thread.join()

    if errors:
        raise errors[0]

    if args.smooth > 0:
        files = sorted(
            file.name
            for file in processed_dir.iterdir()
            if file.is_file()
        )

        total = len(files)
        window = args.smooth
        half_window = window // 2

        print(
            f"Applying temporal mask smoothing "
            f"(window={window}, workers={args.smooth_workers})...",
            flush=True,
        )

        smoothed_dir.mkdir(parents=True)
        smoothing_errors = []
        progress_lock = threading.Lock()
        progress_count = [0]
        smooth_queue = Queue()

        for frame_index in range(total):
            smooth_queue.put(frame_index)

        def get_mask(frame_index):
            frame_path = processed_dir / files[frame_index]
            with Image.open(frame_path) as image:
                return np.array(
                    image.convert("L"),
                    dtype=np.float32,
                )

        def smooth_frame(write_index):
            try:
                start = max(0, write_index - half_window)
                end = min(total - 1, write_index + half_window)

                masks = np.stack(
                    [
                        get_mask(index)
                        for index in range(start, end + 1)
                    ]
                )

                smoothed_mask = np.mean(
                    masks,
                    axis=0,
                ).astype(np.uint8)

                filename = files[write_index]
                Image.fromarray(smoothed_mask).save(
                    smoothed_dir / filename,
                    format="TIFF",
                    compression="raw",
                )

                with progress_lock:
                    progress_count[0] += 1
                    print(
                        f"Smoothed frame "
                        f"{progress_count[0]}/{total}: {filename}",
                        flush=True,
                    )
            except Exception as exc:
                smoothing_errors.append(exc)

        def smoothing_worker():
            while True:
                try:
                    write_index = smooth_queue.get_nowait()
                except Empty:
                    return

                if smoothing_errors:
                    return

                smooth_frame(write_index)

        smoothing_threads = [
            threading.Thread(
                target=smoothing_worker,
                daemon=True,
            )
            for _ in range(max(1, args.smooth_workers))
        ]

        for thread in smoothing_threads:
            thread.start()
        for thread in smoothing_threads:
            thread.join()

        if smoothing_errors:
            raise smoothing_errors[0]

        rmtree(processed_dir)
        smoothed_dir.rename(processed_dir)

    output_path = pathlib.Path(args.o)
    output_path.parent.mkdir(
        exist_ok=True,
        parents=True,
    )

    print(
        "Encoding full-resolution ProRes 422 Proxy mask video...",
        flush=True,
    )

    mask_stream = ffmpeg.input(
        str(processed_dir / "%04d.tiff"),
        r=framerate,
        f="image2",
        s=frame_size,
    )

    output_stream = ffmpeg.output(
        mask_stream,
        str(output_path),
        vcodec="prores_ks",
        pix_fmt="yuv422p10le",
        **{
            "profile:v": "0",
        },
    )

    ffmpeg.run(
        output_stream,
        overwrite_output=True,
    )

    print(
        f"Mask video created: {output_path}",
        flush=True,
    )

except KeyboardInterrupt:
    print(
        "\nInterrupted by user",
        flush=True,
    )

finally:
    print(
        "Removing temporary files...",
        flush=True,
    )

    rmtree(processed_dir, ignore_errors=True)
    rmtree(frames_dir, ignore_errors=True)
    rmtree(smoothed_dir, ignore_errors=True)
