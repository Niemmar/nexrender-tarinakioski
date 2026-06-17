# Nexrender Tarinakioski

## Tarkoitus

Tämä projekti renderöi Tarinakioski-videoita After Effects -templateista Nexrenderin avulla.

Projektissa on tällä hetkellä kaksi renderöintiversiota:

- HD-versio
- Instagram-versio

Molemmat versiot käyttävät samaa tarinakohtaista input-kansiota, samaa `metadata.json`-tiedostoa, samaa puhujavideota ja samaa taustakuvaa. Käyttäjä tai myöhemmin rakennettava lomake voi valita, tehdäänkö HD-versio, Instagram-versio vai molemmat.

Renderöinnissä voidaan vaihtaa:

- puhujan video
- taustakuva
- tarinan otsikko
- kertoja
- lopullisen videon tallennuspaikka

---

## Nykyinen työnkulku

```text
input/001/video.mov
input/001/background.jpg
input/001/metadata.json
  ↓
Node: videon keston tunnistus ffprobella
  ↓
Node: Nexrender-jobin muodostaminen valitulle versiolle
  ↓
output/001/job-auto-hd.json
tai
output/001/job-auto-insta.json
  ↓
Nexrender + After Effects
  ↓
output/001/valmis MP4
```

---

## Kansiorakenne

Esimerkkirakenne:

```text
C:\nexrender-tarinakioski
├─ templates
│  ├─ tarinakioski_template_v6.aep
│  └─ tarinakioski_template_insta_v3.aep
├─ input
│  └─ 001
│     ├─ video.mov
│     ├─ background.jpg
│     └─ metadata.json
├─ output
│  └─ 001
│     ├─ job-auto-hd.json
│     ├─ job-auto-insta.json
│     ├─ 001_Kaisa Ahonen_Virpojaisloru_hd.mp4
│     └─ 001_Kaisa Ahonen_Virpojaisloru_insta.mp4
├─ job-template-hd.json
├─ job-template-insta.json
├─ prepare-story-hd-render.js
├─ prepare-story-insta-render.js
├─ package.json
└─ README.md
```

---

## Tarinakohtainen aineisto

Jokainen tarina sijoitetaan omaan kansioonsa `input`-kansion alle.

Tarinat nimetään juoksevalla numerolla:

```text
001
002
003
...
```

Esimerkki:

```text
input/001/
  video.mov
  background.jpg
  metadata.json
```

### video.mov

Puhujan video.

Tällä hetkellä renderöintiskriptit odottavat tiedoston nimeksi:

```text
video.mov
```

MOV-muotoa käytetään, jotta taustattoman videon läpinäkyvyys (alpha) säilyy.

### background.jpg

Tarinavideon taustakuva.

Taustakuvan nimi saa olla jokin näistä:

```text
background.jpg
background.jpeg
background.png
background.webp
```

Skriptit etsivät tarinakansiosta tiedoston, jonka nimi on `background` ja jonka tiedostopääte on jokin sallituista päätteistä.

### metadata.json

Tarinan metatiedot.

Esimerkki:

```json
{
  "id": "001",
  "title": "Virpojaisloru",
  "author": "Kaisa Ahonen",
  "renderFormats": ["hd", "insta"]
}
```

Kenttien merkitys:

```text
id              Tarinan tunniste. Sama kuin input-kansion nimi.
title           Tarinan otsikko. Meneee STORY_TITLE-layerille.
author          Kertoja. Menee STORY_AUTHOR-layerille.
renderFormats   Tieto siitä, mitä versioita tarinasta on tarkoitus tehdä.
```

`metadata.json` ei ole pakollinen. Jos se puuttuu, renderöinti voidaan silti tehdä. Tällöin `STORY_TITLE` ja `STORY_AUTHOR` jätetään tyhjiksi.

`title` ja `author` eivät ole pakollisia. Jos jompikumpi puuttuu, vastaava After Effects -tekstilayer korvataan tyhjällä tekstillä.

Jos `metadata.json` sisältää `id`-kentän, sen pitää vastata komentona annettua storyId:tä. Esimerkiksi komennolla:

```powershell
npm run prepare:hd -- 001
```

tiedoston `input/001/metadata.json` pitää sisältää joko:

```json
{
  "id": "001"
}
```

tai id-kenttä voidaan jättää pois.

Jos metadata sanoo esimerkiksi `"id": "002"` mutta komento ajetaan storyId:llä `001`, skripti pysähtyy virheeseen.

---

## Renderöintiversiot

## HD-versio

HD-versio käyttää tiedostoa:

```text
templates/tarinakioski_template_v6.aep
```

Valmisteluskripti:

```text
prepare-story-hd-render.js
```

Job-template:

```text
job-template-hd.json
```

Automaattisesti muodostettava jobi:

```text
output/001/job-auto-hd.json
```

Valmis video nimetään muodossa:

```text
ID_AUTHOR_TITLE_hd.mp4
```

Esimerkiksi:

```text
001_Kaisa Ahonen_Virpojaisloru_hd.mp4
```

Jos title ja author puuttuvat, tiedostonimeksi tulee esimerkiksi:

```text
001_hd.mp4
```

---

## Instagram-versio

Instagram-versio käyttää tiedostoa:

```text
templates/tarinakioski_template_insta_v3.aep
```

Valmisteluskripti:

```text
prepare-story-insta-render.js
```

Job-template:

```text
job-template-insta.json
```

Automaattisesti muodostettava jobi:

```text
output/001/job-auto-insta.json
```

Valmis video nimetään muodossa:

```text
ID_AUTHOR_TITLE_insta.mp4
```

Esimerkiksi:

```text
001_Kaisa Ahonen_Virpojaisloru_insta.mp4
```

Jos title ja author puuttuvat, tiedostonimeksi tulee esimerkiksi:

```text
001_insta.mp4
```

---

## After Effects -templatet

Templatet sijaitsevat kansiossa:

```text
templates/
```

Käytössä olevat templatet:

```text
templates/tarinakioski_template_v6.aep
templates/tarinakioski_template_insta_v3.aep
```

Pääcomposition nimi molemmissa:

```text
MAIN
```

Nexrenderin vaihtamat layerit:

```text
VIDEO_PLACEHOLDER
BACKGROUND_PHOTO
STORY_TITLE
STORY_AUTHOR
```

Layerien roolit:

```text
VIDEO_PLACEHOLDER   Vaihdettava puhujavideo
BACKGROUND_PHOTO    Vaihdettava taustakuva
STORY_TITLE         Tarinan vaihtuva otsikko
STORY_AUTHOR        Tarinan vaihtuva kertoja / tekijä
```

Templatessa on määritelty videoiden maksimikestoksi 4 minuuttia. Lopullinen renderöintikesto asetetaan automaattisesti videon todellisen keston mukaan. Liian pitkä video katkeaa lopusta.

Instagram-templatessa puhujavideo on rajattu neliömäiseen matte-alueeseen, jonka avulla video rajautuu oikeaan alareunaan. Video on templatessa keskitetty tähän rajattuun alueeseen eli puhujan tulee olla keskellä videota.

---

## Tärkeimmät tiedostot

### prepare-story-hd-render.js

HD-version valmisteluskripti.

Tekee seuraavat asiat:

1. tarkistaa tarvittavat tiedostot
2. lukee metadata.json-tiedoston, jos se on olemassa
3. tarkistaa metadata-id:n suhteessa komentona annettuun storyId:hen
4. etsii taustakuvan
5. tunnistaa videon todellisen keston ffprobella
6. laskee renderöinnin pituuden
7. vaihtaa Nexrender-jobiin videon, taustakuvan, otsikon ja tekijän
8. asettaa lopullisen MP4:n tallennuspolun
9. luo tiedoston `output/001/job-auto-hd.json`

### prepare-story-insta-render.js

Instagram-version valmisteluskripti.

Tekee samat valmistelut kuin HD-versio, mutta käyttää Instagram-templatea ja muodostaa Instagram-version jobin.

Luo tiedoston:

```text
output/001/job-auto-insta.json
```

### job-template-hd.json

HD-version Nexrender-pohjajobi.

Sisältää After Effects -templaten, assetit, data-layerit ja postrender-copy-toiminnon.

### job-template-insta.json

Instagram-version Nexrender-pohjajobi.

Sisältää After Effects -templaten, assetit, data-layerit ja postrender-copy-toiminnon.

### output/001/job-auto-hd.json

Automaattisesti muodostettu HD-renderöintijobi.

### output/001/job-auto-insta.json

Automaattisesti muodostettu Instagram-renderöintijobi.

---

## Vaatimukset

- Adobe After Effects 2026
- Node.js LTS
- VS Code tai muu koodieditori
- Nexrender CLI
- FFmpeg / ffprobe-tuki videon keston tunnistamiseen

After Effectsin renderöijän pitää löytyä polusta:

```text
C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\aerender.exe
```

Nykyinen HD- ja Instagram-työnkulku ei vaadi Whisperiä eikä Pythonia.

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

## package.json scripts

Tällä hetkellä käytössä olevat komennot ovat esimerkiksi:

```json
{
  "scripts": {
    "prepare": "node prepare-story-render.js",
    "prepare:hd": "node prepare-story-hd-render.js",
    "prepare:insta": "node prepare-story-insta-render.js",
    "render": "nexrender-cli --binary \"C:\\Program Files\\Adobe\\Adobe After Effects 2026\\Support Files\\aerender.exe\" --file"
  }
}
```

`prepare` on vanha valmistelukomento. Sitä ei käytetä nykyiseen HD- ja Instagram-työnkulkuun.

Nykyiset komennot ovat:

```powershell
npm run prepare:hd -- 001
npm run prepare:insta -- 001
npm run render -- output/001/job-auto-hd.json
npm run render -- output/001/job-auto-insta.json
```

---

## Käyttö: HD-version tekeminen

### 1. Lisää tarinan aineisto

Luo uusi tarinakansio `input`-kansion alle.

Esimerkiksi:

```text
input/001/
```

Lisää sinne:

```text
video.mov
background.jpg
metadata.json
```

Esimerkki `metadata.json`-tiedostosta:

```json
{
  "id": "001",
  "title": "Virpojaisloru",
  "author": "Kaisa Ahonen",
  "renderFormats": ["hd"]
}
```

### 2. Valmistele HD-renderöintijobi

Aja projektikansion juuressa:

```powershell
npm run prepare:hd -- 001
```

Tämä luo tiedoston:

```text
output/001/job-auto-hd.json
```

### 3. Renderöi HD-video

Aja:

```powershell
npm run render -- output/001/job-auto-hd.json
```

Vaihtoehtoisesti suoraan Nexrenderillä:

```powershell
nexrender-cli --file output/001/job-auto-hd.json --binary "C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\aerender.exe"
```

### 4. Tarkista valmis HD-video

Valmis MP4 löytyy tarinan omasta output-kansiosta.

Esimerkiksi:

```text
output/001/001_Kaisa Ahonen_Virpojaisloru_hd.mp4
```

---

## Käyttö: Instagram-version tekeminen

### 1. Lisää tarinan aineisto

Samaa input-kansiota voidaan käyttää kuin HD-versiossa.

Esimerkiksi:

```text
input/001/
  video.mov
  background.jpg
  metadata.json
```

Esimerkki `metadata.json`-tiedostosta:

```json
{
  "id": "001",
  "title": "Virpojaisloru",
  "author": "Kaisa Ahonen",
  "renderFormats": ["insta"]
}
```

Jos samasta tarinasta tehdään sekä HD että Instagram:

```json
{
  "id": "001",
  "title": "Virpojaisloru",
  "author": "Kaisa Ahonen",
  "renderFormats": ["hd", "insta"]
}
```

### 2. Valmistele Instagram-renderöintijobi

Aja projektikansion juuressa:

```powershell
npm run prepare:insta -- 001
```

Tämä luo tiedoston:

```text
output/001/job-auto-insta.json
```

### 3. Renderöi Instagram-video

Aja:

```powershell
npm run render -- output/001/job-auto-insta.json
```

Vaihtoehtoisesti suoraan Nexrenderillä:

```powershell
nexrender-cli --file output/001/job-auto-insta.json --binary "C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\aerender.exe"
```

### 4. Tarkista valmis Instagram-video

Valmis MP4 löytyy tarinan omasta output-kansiosta.

Esimerkiksi:

```text
output/001/001_Kaisa Ahonen_Virpojaisloru_insta.mp4
```

---

## Normaali käyttöjärjestys

### Vain HD

```powershell
npm run prepare:hd -- 001
npm run render -- output/001/job-auto-hd.json
```

### Vain Instagram

```powershell
npm run prepare:insta -- 001
npm run render -- output/001/job-auto-insta.json
```

### Molemmat versiot

```powershell
npm run prepare:hd -- 001
npm run render -- output/001/job-auto-hd.json

npm run prepare:insta -- 001
npm run render -- output/001/job-auto-insta.json
```

---

## Tuleva lomakekäyttö

Myöhemmässä vaiheessa käyttäjä ei kirjoita komentoja itse.

Tavoiteltu tuotantoputki:

```text
Käyttäjä täyttää paikallisen lomakkeen
  ↓
Käyttäjä valitsee version: HD, Instagram tai molemmat
  ↓
Sovellus luo seuraavan vapaan storyId:n, esimerkiksi 001
  ↓
Sovellus luo kansion input/001
  ↓
Sovellus tallentaa metadata.json-tiedoston
  ↓
Sovellus tallentaa tai kopioi videon nimellä video.mov
  ↓
Sovellus tallentaa tai kopioi taustakuvan nimellä background.jpg / .png / .webp
  ↓
Sovellus ajaa valitun valmisteluskriptin
  ↓
Sovellus voi käynnistää Nexrender-renderöinnin
```

Tärkeä periaate:

```text
Tarina on yksi asia.
Renderöintiversio on käyttäjän valinta.
```

Sama `input/001` voi siis tuottaa HD-version, Instagram-version tai molemmat.

---

## Nykyinen tilanne

Nykyisessä versiossa:

- HD- ja Instagram-versiot toimivat erillisinä valmisteluskripteinä
- molemmat käyttävät samaa input-rakennetta
- storyId on juokseva numero, esimerkiksi `001`
- metadata.json voi olla mukana mutta ei ole pakollinen
- title ja author voivat puuttua
- metadata.id tarkistetaan storyId:tä vasten, jos id on annettu
- taustakuva etsitään nimellä `background` ja sallitulla tiedostopäätteellä
- video odotetaan nimellä `video.mov`
- renderöinnin pituus lasketaan videon todellisen keston mukaan
- 7 sekunnin alkutekstit lisätään videon keston päälle
- varsinaisen videon maksimikesto on 4 minuuttia
- valmis tiedosto nimetään muodossa `ID_AUTHOR_TITLE_hd.mp4` tai `ID_AUTHOR_TITLE_insta.mp4`
- Nexrender-jobit muodostuvat tarinan omaan output-kansioon

Nykyinen normaali työnkulku ei käytä Whisperiä eikä tekstityksiä.
