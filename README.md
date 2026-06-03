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

Nykyinen tekstitysmalli toimii paikallisesti Open Source Whisperillä. Video lähetetään paikalliselle Whisperille, joka tunnistaa puheen ja luo SRT-tekstityksen. Node-skripti muuntaa tekstityksen After Effects -templatelle sopivaksi dataksi, lisää tekstityksiin alkutekstin vaatiman aikasiirron, pilkkoo pitkät tekstitysrivit lyhyemmiksi ja muodostaa Nexrenderille valmiin renderöintijobin.

Sama työnkulku tunnistaa automaattisesti puhujavideon keston. Lopullisen videon pituus määräytyy puhujavideon todellisen keston ja templaten alkutekstin perusteella.

---

## Nykyinen työnkulku

```text
input/story-XXX/video.mp4
  ↓
paikallinen Whisper
  ↓
output/story-XXX/video.srt
  ↓
Node: SRT → subtitles.json
  ↓
Node: pitkien tekstitysrivien pilkkominen
  ↓
Node: 4 sekunnin tekstitysoffset alkutekstiä varten
  ↓
Node: videon keston tunnistus ffprobella
  ↓
output/story-XXX/job-auto.json
  ↓
Nexrender + After Effects
  ↓
output/story-XXX/valmis MP4
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
│  └─ kakisalmi.jpg
├─ input
│  └─ story-001
│     ├─ video.mp4
│     ├─ background.jpg
│     └─ metadata.json
├─ output
│  └─ story-001
│     ├─ video.srt
│     ├─ subtitles.json
│     ├─ job-auto.json
│     └─ Veikko Veikkolainen_Venemuisto Käkisalmesta.mp4
├─ job-template.json
├─ prepare-story-render.js
├─ package.json
└─ README.md
```

---

## Tarinakohtainen aineisto

Jokainen tarina sijoitetaan omaan kansioonsa `input`-kansion alle.

Esimerkki:

```text
input/story-001/
  video.mp4
  background.jpg
  metadata.json
```

Tarinakansion tiedostot:

```text
video.mp4
```

Puhujan video, jossa on mukana puheääni.

```text
background.jpg
```

Tarinavideon taustakuva.

```text
metadata.json
```

Tarinan otsikko ja kertoja / tekijä.

Esimerkki:

```json
{
  "title": "Venemuisto Käkisalmesta",
  "author": "Veikko Veikkolainen"
}
```

Näiden perusteella skripti muodostaa valmiin videon nimen muodossa:

```text
Author_Title.mp4
```

Esimerkiksi:

```text
Veikko Veikkolainen_Venemuisto Käkisalmesta.mp4
```

---

## Tärkeimmät tiedostot

```text
prepare-story-render.js
```

Yhdistävä valmisteluskripti. Ajaa paikallisen Whisperin, muuntaa SRT:n JSONiksi, lisää tekstitysoffsetin, pilkkoo pitkät tekstitykset, tunnistaa videon keston ja muodostaa valmiin Nexrender-jobin.

```text
job-template.json
```

Lähtöjobi, jossa määritellään After Effects -template, layerit, tekstit, video, taustakuva ja output-polku. Tätä käytetään pohjana uuden automaattisen jobin luomiseen.

```text
output/story-XXX/job-auto.json
```

Automaattisesti muodostettu renderöintijobi. Tämä annetaan Nexrenderille.

```text
output/story-XXX/video.srt
```

Whisperin muodostama SRT-tekstitystiedosto.

```text
output/story-XXX/subtitles.json
```

Node-skriptin muodostama tekstitystiedosto tarkastelua ja jatkokäyttöä varten. Varsinaiset tekstitykset syötetään After Effectsiin Nexrender-jobin expressioninä.

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
npm install
```

Projektissa käytetään muun muassa paketteja:

```text
fluent-ffmpeg
ffprobe-static
```

Näitä käytetään videon pituuden automaattiseen tunnistamiseen.

---

## Whisperin paikallinen käyttö

Projektissa käytetään Whisperin paikallisesti ajettavaa Open Source -versiota.

Whisperiä voidaan ajaa komentoriviltä esimerkiksi näin:

```powershell
python -m whisper input/story-001/video.mp4 --language Finnish --model small --output_format srt --output_dir output/story-001
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

## Käyttö

### 1. Lisää tarinan aineisto

Luo uusi tarinakansio `input`-kansion alle.

Esimerkiksi:

```text
input/story-001/
```

Lisää sinne:

```text
video.mp4
background.jpg
metadata.json
```

Esimerkki `metadata.json`-tiedostosta:

```json
{
  "title": "Venemuisto Käkisalmesta",
  "author": "Veikko Veikkolainen"
}
```

---

### 2. Valmistele tekstitykset ja renderöintijobi

Aja projektikansion juuressa:

```powershell
npm run prepare -- story-001
```

Tämä tekee seuraavat asiat:

1. ajaa paikallisen Whisperin videolle
2. luo SRT-tiedoston tarinan omaan output-kansioon
3. muuntaa SRT:n `subtitles.json`-muotoon
4. lisää tekstityksiin 4 sekunnin offsetin
5. pilkkoo pitkät tekstitysrivit lyhyemmiksi
6. tunnistaa videon todellisen keston
7. lisää jobiin oikean `frameEnd`-arvon
8. vaihtaa jobiin oikean videon, taustakuvan, otsikon ja kertojan
9. asettaa lopullisen MP4:n tallennuspolun tarinan omaan output-kansioon
10. luo tiedoston `output/story-001/job-auto.json`

---

### 3. Renderöi video Nexrenderillä

PowerShellissä:

```powershell
npm run render -- output/story-001/job-auto.json
```

Vaihtoehtoisesti suoraan Nexrenderillä:

```powershell
nexrender-cli --file output/story-001/job-auto.json --binary "C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\aerender.exe"
```

---

### 4. Tarkista valmis video

Valmis MP4 löytyy tarinan omasta output-kansiosta.

Esimerkiksi:

```text
output/story-001/Veikko Veikkolainen_Venemuisto Käkisalmesta.mp4
```

---

## Normaali käyttöjärjestys

```text
1. Luo uusi tarinakansio input-kansion alle.
2. Lisää kansioon video.mp4, background.jpg ja metadata.json.
3. Aja valmisteluskripti.
4. Aja renderöinti.
5. Tarkista valmis MP4 tarinan omasta output-kansiosta.
```

Komennot:

```powershell
npm run prepare -- story-001

npm run render -- output/story-001/job-auto.json
```

---

## Nykyinen tilanne

- paikallinen Whisper-tekstitys
- SRT:n muunto `subtitles.json`-muotoon
- tekstitysten 4 sekunnin aikasiirto alkutekstin vuoksi
- pitkien tekstitysrivien automaattinen pilkkominen
- videon todellisen keston tunnistus ffprobella
- tarinakohtainen input-rakenne
- tarinakohtainen output-rakenne
- automaattisen Nexrender-jobin muodostaminen
- tekstitysten näyttäminen After Effects -templaten `SUBTITLES`-layerissa
- valmiin videon nimeäminen metadata-tietojen perusteella
- npm-komennot valmisteluun ja renderöintiin

---
