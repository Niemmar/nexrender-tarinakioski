# Nexrender Tarinakioski

## Tarkoitus

After Effects -pohjan automaattinen renderöinti MP4-videoksi käyttäen Nexrenderiä. Renderöinnissä voidaan vaihtaa tarinan tekstit, puhujan video, taustakuva ja tekstitykset JSON-tiedoston perusteella.

Järjestelmä osaa lukea puhujan videon todellisen keston ja rajata lopullisen videon automaattisesti oikean mittaiseksi.

Projektissa on aloitettu myös puheen automaattinen tekstittäminen paikallisesti Open Source Whisperillä. Whisper muuntaa videon äänen tekstiksi, josta muodostetaan tekstitystiedostot renderöintiä varten.

---

## Kansiorakenne

```text
C:\nexrender-tarinakioski
├─ templates
│  └─ tarinakioski_template_v3.aep
├─ assets
│  ├─ esineet2.mp4
│  └─ patsaat.jpg
├─ subtitles
│  ├─ esineet2.srt
│  ├─ esineet2.subtitles.json
│  └─ subtitles-data.json
├─ output
│  └─ full-test.mp4
├─ job-full-test.json
├─ job-auto.json
├─ job-esineet2-subtitles.json
├─ render-auto.js
├─ transcribe-video.js
├─ create-subtitle-job.js
└─ README.md
```

---

## Vaatimukset

- Adobe After Effects 2026
- Node.js LTS
- VS Code
- Nexrender CLI
- FFmpeg
- Python
- Open Source Whisper paikallisessa Python-virtuaaliympäristössä

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

## Videon automaattisen keston lisäpaketit

Projektikansion juuressa:

```powershell
npm install fluent-ffmpeg ffprobe-static
```

Näitä käytetään videon pituuden automaattiseen tunnistamiseen.

---

## Whisper ja tekstitykset

Projektissa on aloitettu paikallisen Open Source Whisperin käyttöönotto videon äänen muuttamiseksi tekstitykseksi.

Tavoite:

1. video sisältää puhetta
2. Whisper tunnistaa puheen tekstiksi
3. tekstistä muodostetaan SRT- ja JSON-muotoiset tekstitystiedostot
4. JSON-tekstitys syötetään Nexrender-jobin kautta After Effects -templaten `SUBTITLES`-layeriin
5. tekstitys näkyy lopullisessa renderöidyssä MP4-videossa

Tekstitysten käsittelyyn liittyviä tiedostoja:

```text
transcribe-video.js
create-subtitle-job.js
subtitles/
```

Whisper tuottaa ensin tekstitysdatan, jota Node-skriptit muokkaavat renderöintiin sopivaan muotoon.

Tekstitysten ajoitusta ja ulkoasua hienosäädetään vielä myöhemmin.

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

### Huomioita

- `VIDEO_PLACEHOLDER` = vaihdettava video
- `BACKGROUND_PHOTO` = vaihdettava taustakuva
- `VIDEO_CIRCLE_FRAME` = pysyvä kehys
- `STORY_TITLE` = tarinan vaihtuva otsikko
- `STORY_AUTHOR` = tarinan vaihtuva kertoja / tekijä
- `SUBTITLES` = puheesta muodostettu tekstitys
- Tekstilayerit voidaan korvata JSON-datalla
- Tekstitys voidaan syöttää Nexrender-jobissa expressionin kautta

Template voi olla esimerkiksi 30 sekuntia pitkä, vaikka lopullinen video renderöidään automaattisesti lyhyemmäksi.

---

## Testiaineiston lisääminen

Lisää vaihdettavat tiedostot kansioon. Esim:

```text
assets/esineet.mp4
assets/patsaat.jpg
```

Tekstitettävässä videossa tulee olla ääni mukana.

---

## Renderöintijob

Projektissa käytetään testauksessa esimerkiksi tiedostoja:

```text
job-full-test.json
job-auto.json
job-esineet2-subtitles.json
```

Jobissa määritellään:

- template
- tekstit
- video
- taustakuva
- tekstitys
- valmiin videon tallennuspaikka

---

## Automaattinen videon keston tunnistus

Projektissa käytetään tiedostoa:

```text
render-auto.js
```

Sen tehtävä on:

1. lukea videon todellinen kesto
2. huomioida templaten alkutekstit
3. luoda uusi renderöintijobi `job-auto.json`

Esimerkiksi:

- video = 8 s
- alkutekstit = 4 s
- lopullinen renderöinti ≈ 12 s

---

## Tekstityksen automaattinen muodostaminen

Projektissa käytetään tiedostoa:

```text
transcribe-video.js
```

Sen tehtävä on:

1. ajaa paikallinen Whisper valitulle videolle
2. muodostaa SRT-tekstitystiedosto
3. muodostaa JSON-muotoinen tekstitystiedosto
4. pilkkoa liian pitkät tekstiblokit lyhyemmiksi tekstityspätkiksi

Esimerkiksi:

```powershell
node transcribe-video.js assets\esineet2.mp4
```

Tämä luo tiedostot `subtitles`-kansioon.

---

## Tekstitetyn renderöintijobin muodostaminen

Projektissa käytetään tiedostoa:

```text
create-subtitle-job.js
```

Sen tehtävä on muodostaa Nexrender-job, jossa tekstitys syötetään After Effectsin `SUBTITLES`-layerille.

Esimerkiksi:

```powershell
node create-subtitle-job.js assets\esineet2.mp4
```

Tämä luo videokohtaisen renderöintijobin.

---

## Käyttö

### 1. Luo automaattinen tekstitys

```powershell
node transcribe-video.js assets\esineet2.mp4
```

### 2. Luo tekstityksen sisältävä renderöintijobi

```powershell
node create-subtitle-job.js assets\esineet2.mp4
```

### 3. Käynnistä renderöinti

PowerShellissä:

```powershell
nexrender-cli --file job-esineet2-subtitles.json --binary "C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\aerender.exe"
```

Git Bashissa:

```bash
nexrender-cli --file job-esineet2-subtitles.json --binary "/c/Program Files/Adobe/Adobe After Effects 2026/Support Files/aerender.exe"
```

---

## Valmis video

Renderöity MP4 löytyy kansiosta:

```text
output/
```

Esimerkiksi:

```text
output/esineet2-with-subtitles.mp4
```

---

## Normaali käyttöjärjestys

1. Lisää uusi video ja taustakuva `assets`-kansioon

2. Luo videolle tekstitys:

```powershell
node transcribe-video.js assets\esineet2.mp4
```

3. Luo renderöintijobi:

```powershell
node create-subtitle-job.js assets\esineet2.mp4
```

4. Aja Nexrender:

```powershell
nexrender-cli --file job-esineet2-subtitles.json --binary "C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\aerender.exe"
```

5. Tarkista valmis video `output`-kansiosta

---

### KESKENERÄISET

- Whisperin lisääminen hukkasi osan aiemmista asetuksista, näiden palautus on yhä kesken.
- tekstityksen ajoituksen hienosäätö suhteessa templaten alkuteksteihin
- tekstityksen rivimäärän ja merkkimäärän säätö
- lopullisen renderöintikeston yhdistäminen tekstitysvaiheeseen
- yhden komennon työnkulku: tekstitys + jobin luonti + renderöinti
- vaihtuvan taustakuvan ja tarinatietojen automatisointi samaan työnkulkuun
- tarkemmat ohjeet Whisperin asennuksesta ja ylläpidosta
