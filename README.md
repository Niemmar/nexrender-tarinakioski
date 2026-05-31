# Nexrender Tarinakioski

## Tarkoitus

Tämä projekti renderöi After Effects -pohjasta tarinavideon MP4-muotoon Nexrenderin avulla.

Renderöinnissä voidaan vaihtaa:

- puhujan video
- taustakuva
- tarinan otsikko
- kertoja / tekijä
- tekstitykset
- lopullisen videon tallennuspaikka

Nykyinen tekstitysmalli toimii paikallisesti Open Source Whisperillä. Video lähetetään ensin paikalliselle Whisperille, joka tunnistaa puheen ja luo SRT-tekstityksen. Node-skripti muuntaa tekstityksen After Effects -templatelle sopivaksi dataksi, lisää tekstityksiin alkutekstin vaatiman aikasiirron, pilkkoo pitkät tekstitysrivit lyhyemmiksi ja muodostaa Nexrenderille valmiin renderöintijobin.

Sama työnkulku säilyttää aiemmin toteutetun automaattisen videon keston tunnistuksen: lopullisen videon pituus määräytyy puhujavideon todellisen keston ja templaten alkutekstin perusteella.

---

## Nykyinen työnkulku

```text
video.mp4
  ↓
paikallinen Whisper
  ↓
SRT-tekstitys
  ↓
Node: SRT → subtitles.json
  ↓
Node: pitkien tekstitysrivien pilkkominen
  ↓
Node: 4 sekunnin tekstitysoffset alkutekstiä varten
  ↓
Node: videon keston tunnistus ffprobella
  ↓
job-auto-subtitles.json
  ↓
Nexrender + After Effects
  ↓
valmis MP4
```

---

## Kansiorakenne

Esimerkkirakenne:

```text
C:\nexrender-tarinakioski
├─ templates
│  └─ tarinakioski_template_v3.aep
├─ assets
│  ├─ tarina.mp4
│  ├─ kakisalmi.jpg
│  ├─ tarina.srt
│  └─ subtitles.json
├─ output
│  └─ subtitles-test.mp4
├─ job-template.json
├─ job-auto-subtitles.json
├─ prepare-story-render.js
├─ render-auto-subtitles.js
├─ convert-srt-to-subtitles-json.js
└─ README.md
```

### Tärkeimmät tiedostot nykyisessä mallissa

```text
prepare-story-render.js
```

Yhdistävä valmisteluskripti. Ajaa paikallisen Whisperin, muuntaa SRT:n JSONiksi, lisää tekstitysoffsetin, pilkkoo pitkät tekstitykset, tunnistaa videon keston ja muodostaa valmiin Nexrender-jobin.

```text
job-template.json
```

Lähtöjobi, jossa määritellään After Effects -template, layerit, tekstit, video, taustakuva ja output-polku. Tätä käytetään pohjana uuden automaattisen jobin luomiseen.

```text
job-auto-subtitles.json
```

Automaattisesti muodostettu renderöintijobi. Tämä annetaan Nexrenderille.

```text
assets/subtitles.json
```

Node-skriptin muodostama tekstitystiedosto, jota käytetään After Effects -templaten `SUBTITLES`-layerissa.

```text
assets/tarina.srt
```

Whisperin muodostama SRT-tekstitystiedosto.

---

## Vaatimukset

- Adobe After Effects 2026
- Node.js LTS
- VS Code tai muu koodieditori
- Nexrender CLI
- Python
- Open Source Whisper paikallisesti
- FFmpeg / ffprobe-tuki videon ja äänen käsittelyyn

After Effectsin renderöijän pitää löytyä polusta:

```text
C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\aerender.exe
```

---

## Nexrenderin asennus

Aja PowerShellissä:

```powershell
npm install -g @nexrender/cli @nexrender/action-copy
```

Tarkista asennus:

```powershell
nexrender-cli -h
```

---

## Projektin Node-paketit

Projektikansion juuressa:

```powershell
npm install fluent-ffmpeg ffprobe-static
```

Näitä käytetään videon pituuden automaattiseen tunnistamiseen.

---

## Whisperin paikallinen käyttö

Projektissa käytetään Whisperin paikallisesti ajettavaa Open Source -versiota.

Whisperiä voidaan ajaa komentoriviltä esimerkiksi näin:

```powershell
python -m whisper assets/tarina.mp4 --language Finnish --model small --output_format srt --output_dir assets
```

Tämä luo esimerkiksi tiedoston:

```text
assets/tarina.srt
```

Nykyisessä normaalissa työnkulussa tätä komentoa ei tarvitse ajaa erikseen, koska `prepare-story-render.js` ajaa Whisperin osana valmisteluvaihetta.

---

## After Effects -template

Template sijaitsee kansiossa:

```text
templates/tarinakioski_template_v3.aep
```

Pääcomposition nimi:

```text
MAIN
```

Käytetyt layerit:

```text
LOGO
STATIC_TITLE
STORY_TITLE
STORY_AUTHOR
SUBTITLES
VIDEO_CIRCLE_FRAME
VIDEO_PLACEHOLDER
BACKGROUND_PHOTO
```

### Layerien roolit

- `LOGO` = pysyvä logo
- `STATIC_TITLE` = pysyvä otsikko, esimerkiksi “Minun tarinani”
- `STORY_TITLE` = tarinan vaihtuva otsikko
- `STORY_AUTHOR` = tarinan vaihtuva kertoja / tekijä
- `SUBTITLES` = puheesta muodostettu tekstitys
- `VIDEO_CIRCLE_FRAME` = pysyvä ympyräkehys videolle
- `VIDEO_PLACEHOLDER` = vaihdettava puhujavideo
- `BACKGROUND_PHOTO` = vaihdettava taustakuva

Tekstitykset syötetään `SUBTITLES`-layeriin Nexrender-jobin expressioninä.

Template voi olla pidempi kuin lopullinen video. Lopullinen renderöintikesto asetetaan automaattisesti videon todellisen keston mukaan.

---

## Alkuteksti ja tekstitysten aikasiirto

Templatessa on 4 sekunnin alkutekstiosuus ennen varsinaista puhujavideota.

Siksi tekstityksiin lisätään 4 sekunnin offset:

```text
Whisperin 0.0 s → After Effectsin 4.0 s
Whisperin 4.0 s → After Effectsin 8.0 s
```

Tämä estää tekstityksiä näkymästä liian aikaisin alkutekstin päällä.

Skriptissä tähän käytetään arvoja:

```js
const introSeconds = 4;
const subtitleOffsetSeconds = 4;
```

`introSeconds` vaikuttaa renderöinnin kokonaiskestoon.

`subtitleOffsetSeconds` vaikuttaa siihen, milloin tekstitykset alkavat näkyä After Effectsissä.

---

## Pitkien tekstitysten pilkkominen

Whisper voi tuottaa pitkiä tekstitysrivejä. Pitkät rivit eivät aina mahdu After Effectsin tekstitysalueeseen, jolloin viimeiset sanat voivat leikkautua pois.

Tämän vuoksi `prepare-story-render.js` pilkkoo pitkät tekstitykset lyhyemmiksi pätkiksi ennen Nexrender-jobin muodostamista.

Esimerkiksi pitkä tekstitys:

```text
Nimenjälkiosa viittaa salmeen, joka muodostui tärkeäksi kauppareittien risteyskohdaksi.
```

voidaan jakaa useampaan ajastettuun tekstityspätkään.

Näin After Effects näyttää kerralla lyhyemmän ja luettavamman tekstin.

---

## Lähtöjobi

Nykyisessä mallissa käytetään lähtöjobia, esimerkiksi:

```text
job-template.json
```

Lähtöjobissa määritellään:

- After Effects -template
- composition
- videoassetti
- taustakuva
- staattinen otsikko
- tarinan otsikko
- kertoja
- `SUBTITLES`-layer
- renderöidyn MP4:n tallennuspaikka

`prepare-story-render.js` lukee tämän jobin, päivittää siihen uuden videon, lisää tekstitysexpressionin ja asettaa oikean `frameEnd`-arvon videon todellisen keston mukaan.

---

## Käyttö

### 1. Lisää aineisto

Lisää video ja taustakuva `assets`-kansioon.

Esimerkiksi:

```text
assets/tarina.mp4
assets/kakisalmi.jpg
```

Videossa tulee olla puheääni mukana.

Varmista myös, että lähtöjobissa käytetään oikeaa taustakuvaa ja oikeita tekstejä.

---

### 2. Valmistele tekstitykset ja renderöintijobi

Aja projektikansion juuressa:

```powershell
node prepare-story-render.js job-template.json job-auto-subtitles.json assets/tarina.mp4
```

Tämä tekee seuraavat asiat:

1. ajaa paikallisen Whisperin videolle
2. luo SRT-tiedoston `assets`-kansioon
3. muuntaa SRT:n `assets/subtitles.json`-muotoon
4. lisää tekstityksiin 4 sekunnin offsetin
5. pilkkoo pitkät tekstitysrivit lyhyemmiksi
6. tunnistaa videon todellisen keston
7. lisää jobiin oikean `frameEnd`-arvon
8. luo tiedoston `job-auto-subtitles.json`

---

### 3. Renderöi video Nexrenderillä

PowerShellissä:

```powershell
nexrender-cli --file job-auto-subtitles.json --binary "C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\aerender.exe"
```

Git Bashissa:

```bash
nexrender-cli --file job-auto-subtitles.json --binary "/c/Program Files/Adobe/Adobe After Effects 2026/Support Files/aerender.exe"
```

---

### 4. Tarkista valmis video

Valmis MP4 löytyy `output`-kansiosta tai siitä polusta, joka on määritelty jobin `@nexrender/action-copy`-asetuksessa.

Esimerkiksi:

```text
output/subtitles-test.mp4
```

---

## Normaali käyttöjärjestys

```text
1. Lisää uusi video ja taustakuva assets-kansioon.
2. Päivitä lähtöjobiin tarvittaessa otsikko, kertoja, taustakuva ja output-polku.
3. Aja prepare-story-render.js.
4. Aja Nexrender job-auto-subtitles.json-tiedostolla.
5. Tarkista valmis MP4 output-kansiosta.
```

Komennot:

```powershell
node prepare-story-render.js job-template.json job-auto-subtitles.json assets/tarina.mp4

nexrender-cli --file job-auto-subtitles.json --binary "C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\aerender.exe"
```

---

## Nykyinen tilanne

- paikallinen Whisper-tekstitys
- SRT:n muunto `subtitles.json`-muotoon
- tekstitysten 4 sekunnin aikasiirto alkutekstin vuoksi
- pitkien tekstitysrivien automaattinen pilkkominen
- videon todellisen keston tunnistus ffprobella
- automaattisen Nexrender-jobin muodostaminen
- tekstitysten näyttäminen After Effects -templaten `SUBTITLES`-layerissa
