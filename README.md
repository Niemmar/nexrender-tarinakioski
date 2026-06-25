# Nexrender Tarinakioski

## Tarkoitus

Tämä projekti luo Tarinakioski-videoita After Effects -templateista Nexrenderin avulla.

Projektissa on kaksi renderöintiversiota:

- Instagram-video
- HD-video

Käyttäjä täyttää paikallisen lomakkeen, valitsee renderöitävät videot ja hyväksyy tarinan. Sen jälkeen paikallinen API tallentaa aineiston, muodostaa tarinalle id:n ja käynnistää valitut renderöinnit.

Renderöinnissä vaihdetaan tarinakohtaisesti:

- puhujan video
- taustakuva
- tarinan otsikko
- kertoja
- renderöitävät formaatit

---

## Työnkulku

```text
React-lomake
  ↓
Paikallinen Express/Multer-API
  ↓
input/<id>/video.mov
input/<id>/background.jpg
input/<id>/metadata.json
  ↓
prepare-story-insta-render.js / prepare-story-hd-render.js
  ↓
Nexrender + After Effects
  ↓
output/<id>/valmis MP4
```

Käyttäjän näkökulmasta normaali työnkulku on:

1. täytä tarinan tiedot lomakkeella
2. lataa taustakuva ja puhujavideo
3. valitse Instagram-video, HD-video tai molemmat
4. tarkista tiedot
5. paina **Hyväksy ja luo videot**
6. valmis video syntyy `output/<id>`-kansioon

---

## Kansiorakenne

```text
C:\nexrender-tarinakioski
├─ input
│  └─ 003
│     ├─ video.mov
│     ├─ background.jpg
│     └─ metadata.json
├─ output
│  └─ 003
│     ├─ job-auto-insta.json
│     ├─ job-auto-hd.json
│     ├─ 003_Kaisa Ahonen_Virpojaisloru_insta.mp4
│     └─ 003_Kaisa Ahonen_Virpojaisloru_hd.mp4
├─ templates
│  ├─ tarinakioski_template_insta_v3.aep
│  └─ tarinakioski_template_v6.aep
├─ server
│  ├─ index.js
│  └─ config.js
├─ tarinakioski-lomake
│  └─ src
│     └─ Tarinalomake.tsx
├─ prepare-story-insta-render.js
├─ prepare-story-hd-render.js
├─ job-template-insta.json
├─ job-template-hd.json
├─ package.json
└─ README.md
```

---

## Tarinakohtainen input-kansio

Jokainen tarina tallennetaan omaan kansioonsa `input`-kansion alle.

Esimerkki:

```text
input/003/
  video.mov
  background.jpg
  metadata.json
```

Tarina-id muodostetaan automaattisesti seuraavasta vapaasta numerosta.

Jos `input`-kansiossa ovat jo:

```text
001
002
```

seuraava tarina saa id:n:

```text
003
```

---

## Tarinan tiedostot

### video.mov

Puhujan video tallennetaan nimellä:

```text
video.mov
```

Nykyinen työnkulku käyttää MOV-videota, jotta taustattoman videon alpha eli läpinäkyvyys säilyy.

### background.jpg

Taustakuva tallennetaan `background`-nimellä.

Sallitut muodot:

```text
background.jpg
background.jpeg
background.png
background.webp
```

### metadata.json

Tarinan metatiedot tallennetaan tiedostoon:

```text
metadata.json
```

Esimerkki:

```json
{
  "id": "003",
  "title": "Virpojaisloru",
  "author": "Kaisa Ahonen",
  "renderFormats": ["insta", "hd"]
}
```

Kentät:

```text
id              Tarinan tunniste
title           Tarinan otsikko
author          Tarinan kertoja
renderFormats   Renderöitävät formaatit
```

`renderFormats` voi olla esimerkiksi:

```json
["insta"]
```

```json
["hd"]
```

```json
["insta", "hd"]
```

---

## Lomake

Lomake sijaitsee kansiossa:

```text
tarinakioski-lomake
```

Lomake on kaksivaiheinen.

### 1. Tietojen syöttö

Ensimmäisessä vaiheessa käyttäjä täyttää tarinan tiedot ja valitsee renderöitävät videot.

Lomakkeella näkyvät muun muassa:

```text
Uusi tarina
Syötä tarinan perustiedot ja valitse, mitkä videot luodaan.
```

Renderöintivalinnat:

```text
Luo Instagram-video
Luo HD-video
```

Ensimmäisen vaiheen painike:

```text
Seuraava
```

### 2. Tarkistus

Toisessa vaiheessa käyttäjä tarkistaa tiedot.

Yhteenvetonäkymän otsikko:

```text
Tarkista tiedot
```

Painikkeet:

```text
Muokkaa tietoja
Hyväksy ja luo videot
Tyhjennä
```

`Hyväksy ja luo videot` lähettää tiedot paikalliselle API:lle ja käynnistää tallennus- ja renderöintiputken.

---

## Paikallinen API

Paikallinen API sijaitsee `server`-kansiossa.

Tärkeimmät tiedostot:

```text
server/index.js
server/config.js
```

API vastaanottaa lomakkeen lähettämän `FormData`-datan.

API tekee seuraavat asiat:

1. vastaanottaa tekstikentät ja tiedostot
2. muodostaa seuraavan vapaan tarina-id:n
3. luo uuden `input/<id>`-kansion
4. tallentaa videon nimellä `video.mov`
5. tallentaa taustakuvan `background`-nimellä
6. kirjoittaa `metadata.json`-tiedoston
7. ajaa valittujen formaattien prepare-skriptit
8. käynnistää Nexrender-renderöinnin

Konekohtaiset polut määritellään tiedostossa:

```text
server/config.js
```

---

## After Effects -templatet

Käytössä olevat templatet:

```text
templates/tarinakioski_template_insta_v3.aep
templates/tarinakioski_template_v6.aep
```

Molemmissa pääcomposition nimi on:

```text
MAIN
```

Nexrender vaihtaa seuraavat layerit:

```text
VIDEO_PLACEHOLDER
BACKGROUND_PHOTO
STORY_TITLE
STORY_AUTHOR
```

Layerien roolit:

```text
VIDEO_PLACEHOLDER   Puhujavideo
BACKGROUND_PHOTO    Taustakuva
STORY_TITLE         Tarinan otsikko
STORY_AUTHOR        Tarinan kertoja
```

Nykyinen työnkulku ei käytä Whisperiä, automaattisia tekstityksiä eikä `STATIC_TITLE`-layeria.

---

## Renderöintiskriptit

### Instagram

Instagram-version valmisteluskripti:

```text
prepare-story-insta-render.js
```

Job-template:

```text
job-template-insta.json
```

Muodostuva jobi:

```text
output/<id>/job-auto-insta.json
```

Valmis video:

```text
output/<id>/<id>_<author>_<title>_insta.mp4
```

### HD

HD-version valmisteluskripti:

```text
prepare-story-hd-render.js
```

Job-template:

```text
job-template-hd.json
```

Muodostuva jobi:

```text
output/<id>/job-auto-hd.json
```

Valmis video:

```text
output/<id>/<id>_<author>_<title>_hd.mp4
```

---

## Videon kesto

Renderöintiskriptit tunnistavat puhujavideon keston ffprobella.

Nykyiset perusasetukset:

```text
Alkutekstit: 7 sekuntia
Maksimikesto yhteensä:
Instagram-video 4 minuuttia
HD-video 10 minuuttia
FPS: 25
```

Lopullinen renderöintikesto lasketaan automaattisesti puhujavideon todellisen keston perusteella.

---

## Käynnistäminen

### 1. Asenna projektin riippuvuudet

Projektin juuressa:

```powershell
npm install
```

Lomakekansiossa:

```powershell
cd tarinakioski-lomake
npm install
```

### 2. Käynnistä paikallinen API

Projektin juuressa:

```powershell
node server/index.js
```

Jos palvelimelle on lisätty oma npm-scripti, käytä sitä.

### 3. Käynnistä lomake

```powershell
cd tarinakioski-lomake
npm run dev
```

Avaa selaimessa Viten ilmoittama paikallinen osoite.

---

## Manuaalinen renderöinti

Normaalisti renderöinti käynnistyy lomakkeelta, mutta renderöintejä voi ajaa myös käsin.

### Instagram

```powershell
npm run prepare:insta -- 003
npm run render -- output/003/job-auto-insta.json
```

### HD

```powershell
npm run prepare:hd -- 003
npm run render -- output/003/job-auto-hd.json
```

### Molemmat

```powershell
npm run prepare:insta -- 003
npm run render -- output/003/job-auto-insta.json

npm run prepare:hd -- 003
npm run render -- output/003/job-auto-hd.json
```

---

## Vaatimukset

- Adobe After Effects 2026
- Node.js
- Nexrender CLI
- FFmpeg / ffprobe
- paikallinen React-lomake
- paikallinen Express/Multer-API

Nexrender CLI:n ja copy-actionin voi asentaa globaalisti:

```powershell
npm install -g @nexrender/cli @nexrender/action-copy
```

After Effectsin renderöijän polku määritellään projektin asetuksissa.

Nykyisellä kehityskoneella polku on ollut:

```text
C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\aerender.exe
```
