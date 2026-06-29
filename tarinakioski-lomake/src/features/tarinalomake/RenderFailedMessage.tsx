type RenderFailedMessageProps = {
  isVisible: boolean;
};

export function RenderFailedMessage({ isVisible }: RenderFailedMessageProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="mt-3 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <p className="font-semibold">Renderöinti epäonnistui.</p>

      <p className="mt-1">
        Tarina on tallennettu, mutta videon luonti ei onnistunut. Tarkista API:n
        PowerShell-ikkunasta tarkempi virhe.
      </p>
    </div>
  );
}
