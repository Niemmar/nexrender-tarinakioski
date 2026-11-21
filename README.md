# Nexrender Tarinakioski

> **WORK IN PROGRESS – Museon tuotantoversio**
>
> Tuotantoversion kehitys jatkuu `museo-tuotanto`-haarassa.
> Sovelluksen toimintalogiikkaa yksinkertaistetaan ja testataan.
>
> Tämä repositorio toimii toistaiseksi kehitystyön versionhallintana.
> Lopullinen tuotantokoodi, After Effects -pohjat, lähdemateriaalit
> sekä päivitetyt README- ja SETUP.md-ohjeet kootaan myöhemmin
> museon omaan repositorioon.
>
> Alla oleva dokumentaatio kuvaa aiempaa toteutusta.

## Tarkoitus

Tämä projekti luo Tarinakioski-videoita After Effects -templateista Nexrenderin avulla.

Projektissa on:

- paikallinen React- ja Vite-lomake
- paikallinen Express- ja Multer-API
- Pythonilla toteutettu videon taustanpoisto
- Nexrender- ja After Effects -renderöintiputki

Käyttäjä täyttää lomakkeen, lataa taustakuvan ja puhujavideon, valitsee halutut videoformaatit ja hyväksyy tarinan. API tallentaa aineiston, muodostaa tarinalle automaattisen id:n ja käynnistää tarvittavat taustanpoisto- ja renderöintivaiheet.

Projektissa voidaan luoda:

- Instagram-video
- HD-video
- molemmat videot samalla lomakelähetyksellä

Lomakkeelta voidaan lisäksi valita, poistetaanko ladatusta videosta tausta ennen lopullisten videoiden renderöintiä.

---

## Nykyinen toimiva toteutus

Nykyinen taustanpoisto perustuu **lumamatte-maskivideoon**.

Kun käyttäjä valitsee taustanpoiston:

1. alkuperäinen värivideo säilytetään
2. alkuperäisestä videosta luodaan harmaasävyinen maskivideo
3. After Effects käyttää maskivideota värivideon luma mattena
4. kuva ja ääni tulevat alkuperäisestä värivideosta
5. maskivideo määrittää, mitkä värivideon osat näkyvät

HD- ja Instagram-versiot on testattu onnistuneesti:

- manuaalisesti Nexrenderillä
- lomakkeen ja API:n kautta koko käsittelyketjulla

Toimiva ketju on:

```text
lomake
  ↓
API
  ↓
alkuperäinen värivideo
  ↓
maskivideon luominen
  ↓
HD- ja/tai Instagram-renderöinti
  ↓
valmiit MP4-videot
```

Aiempi alpha-kanavalliseen ProRes 4444 MOV-videoon perustuva malli on säilytetty vertailutestausta varten, mutta nykyinen aktiivinen lomakeputki käyttää lumamattea.

---

## Työnkulku

```text
React-lomake
  ↓
Paikallinen Express/Multer-API
  ↓
input/<id>/
  background.<pääte>
  metadata.json
  video.<alkuperäinen pääte>
  video-mask.mov          jos taustanpoisto on valittu
  ↓
tarvittaessa taustanpoisto
  ↓
prepare-story-insta-render.js
prepare-story-hd-render.js
  ↓
Nexrender + After Effects
  ↓
output/<id>/
  valmis Instagram-MP4
  valmis HD-MP4
```

Käyttäjän näkökulmasta työnkulku on:

1. täytä tarinan tiedot lomakkeella
2. lataa taustakuva ja puhujavideo
3. valitse tarvittaessa **Tee henkilövideosta taustaton**
4. valitse Instagram-video, HD-video tai molemmat
5. tarkista syötetyt tiedot
6. paina **Hyväksy ja luo videot**
7. seuraa taustanpoiston ja renderöintien etenemistä
8. keskeytä työ tarvittaessa
9. valmiit videot syntyvät `output/<id>`-kansioon

---

## Taustanpoistolla ja ilman taustanpoistoa

### Taustanpoisto valittuna

```text
video.mp4
  ├─ kuva ja ääni → VIDEO_PLACEHOLDER
  └─ taustanpoisto → video-mask.mov → VIDEO_MASK
```

Renderöintiin annetaan kaksi erillistä videotiedostoa:

```text
video.<pääte>    alkuperäinen värivideo ja ääni
video-mask.mov  harmaasävyinen lumamatte
```

Maskivideo ei sisällä varsinaista tarinavideon kuvaa tai ääntä. Sen tehtävänä on määrittää, mikä osa alkuperäisestä värivideosta näytetään.

### Ilman taustanpoistoa

Jos taustanpoistoa ei valita:

```text
video.<pääte> → VIDEO_PLACEHOLDER
```

Maskivideota ei luoda, eikä `VIDEO_MASK`-layeria käytetä.

Renderöintiskripti valitsee automaattisesti sellaisen After Effects -templaten, jossa ei ole lumamattea.

---

## Projektin rakenne

```text
C:\nexrender-tarinakioski
├─ input
│  └─ <id>
│     ├─ background.jpg
│     ├─ metadata.json
│     ├─ video.mp4
│     └─ video-mask.mov
│
├─ output
│  └─ <id>
│     ├─ job-auto-insta.json
│     ├─ job-auto-hd.json
│     ├─ <id>_<author>_<title>_insta.mp4
│     └─ <id>_<author>_<title>_hd.mp4
│
├─ templates
│  ├─ tarinakioski_template_insta_v3.aep
│  ├─ tarinakioski_template_insta_v4.aep
│  ├─ tarinakioski_template_v6.aep
│  ├─ tarinakioski_template_v8.aep
│  └─ templatejen lähdemateriaalikansiot
│
├─ tools
│  └─ taustanpoisto
│     ├─ rembg_video.py
│     └─ .venv
│
├─ tarinakioski-lomake
│  ├─ server
│  │  ├─ index.js
│  │  ├─ config.js
│  │  └─ services
│  │     └─ backgroundRemoval.js
│  │
│  └─ src
│     ├─ components
│     │  └─ Tarinalomake.tsx
│     └─ features
│        └─ tarinalomake
│
├─ prepare-story-insta-render.js
├─ prepare-story-hd-render.js
├─ job-template-insta.json
├─ job-template-hd.json
├─ package.json
├─ SETUP.md
└─ README.md
```

Taustakuvan ja videon tiedostopäätteet voivat vaihdella käyttäjän lataamien tiedostojen mukaan.

---

## Tarinakohtainen input-kansio

Jokainen tarina tallennetaan omaan kansioonsa `input`-kansion alle.

Esimerkki ilman taustanpoistoa:

```text
input/008/
├─ background.jpg
├─ metadata.json
└─ video.mp4
```

Esimerkki taustanpoiston kanssa:

```text
input/009/
├─ background.jpg
├─ metadata.json
├─ video.mp4
└─ video-mask.mov
```

Tarina-id muodostetaan automaattisesti seuraavasta vapaasta numerosta.

Jos `input`-kansiossa ovat jo esimerkiksi kansiot:

```text
001
002
008
```

seuraava tarina saa id:n:

```text
009
```

Id täydennetään vähintään kolmen numeron mittaiseksi.

---

## Tarinan tiedostot

### `video.<pääte>`

Lomakkeelle ladattu alkuperäinen puhujavideo tallennetaan nimellä:

```text
video.<alkuperäinen tiedostopääte>
```

Esimerkiksi:

```text
video.mp4
video.mov
```

Alkuperäinen video säilytetään myös silloin, kun taustanpoisto valitaan.

Videon kuvaa ja ääntä käytetään lopullisessa After Effects -renderöinnissä.

### `video-mask.mov`

Kun taustanpoisto on valittu, Python-skripti luo tiedoston:

```text
video-mask.mov
```

Tiedosto on:

- täyden resoluution harmaasävyvideo
- ProRes 422 Proxy -muotoinen
- tarkoitettu After Effectsin luma matteksi
- äänetön
- erillinen alkuperäisestä värivideosta

Valkoiset maskin alueet näyttävät henkilön. Mustat alueet piilottavat alkuperäisen videon taustan. Harmaat alueet muodostavat osittain läpinäkyviä reunoja.

### `background.<pääte>`

Taustakuva tallennetaan `background`-nimellä ja alkuperäisellä tiedostopäätteellään.

Tuetut muodot:

```text
background.jpg
background.jpeg
background.png
background.webp
```

### `metadata.json`

Tarinan metatiedot tallennetaan tiedostoon:

```text
metadata.json
```

Esimerkki taustanpoiston kanssa:

```json
{
  "id": "009",
  "title": "Virpojaisloru",
  "author": "Kaisa Ahonen",
  "date": "2026-07-31",
  "removeBackground": true,
  "videoFile": "video.mp4",
  "maskVideoFile": "video-mask.mov"
}
```

Esimerkki ilman taustanpoistoa:

```json
{
  "id": "010",
  "title": "Muisto Käkisalmesta",
  "author": "Kaisa Ahonen",
  "date": "2026-07-31",
  "removeBackground": false,
  "videoFile": "video.mp4"
}
```

---

## Lomake

Lomake sijaitsee kansiossa:

```text
tarinakioski-lomake
```

Lomakkeella käyttäjä syöttää:

```text
Nimi
Tarinan otsikko
Päivämäärä
Taustakuva
Video
Videon esikäsittely
Luotavat videot
```

Tarinan otsikon enimmäispituus on:

```text
50 merkkiä
```

Videon esikäsittelyn valinta:

```text
Tee henkilövideosta taustaton
```

Renderöintivalinnat:

```text
Luo Instagram-video
Luo HD-video
```

Vähintään yksi videoformaatti on valittava. Käyttäjä voi valita myös molemmat.

Lomake on kaksivaiheinen:

1. tietojen syöttö
2. tietojen tarkistus ja hyväksyminen

Hyväksymisen jälkeen lomake:

- lukitsee uuden lähetyksen käsittelyn ajaksi
- näyttää tarina-id:n
- näyttää taustanpoiston etenemisen
- näyttää HD- ja Instagram-renderöintien etenemisen erikseen
- tarjoaa keskeytyspainikkeen työn ollessa käynnissä
- näyttää lopuksi valmiiden videoiden output-kansion

---

## Frontendin rakenne

Lomakkeen pääkomponentti:

```text
tarinakioski-lomake/src/components/Tarinalomake.tsx
```

Lomakkeen muut osat sijaitsevat kansiossa:

```text
tarinakioski-lomake/src/features/tarinalomake
```

Tärkeimmät tiedostot:

```text
StoryFormFields.tsx        Lomakekentät ja tiedostovalinnat
StoryReview.tsx            Tarkistusnäkymä ennen hyväksymistä
StoryStatusMessages.tsx    Tallennus-, onnistumis- ja virheviestit
RenderProgressPanel.tsx    Taustanpoiston ja renderöintien eteneminen
RenderCompleteMessage.tsx  Valmisnäkymä ja output-kansiopolku
RenderFailedMessage.tsx    Epäonnistumisilmoitus ja virheen tiedot
useRenderProgress.ts       Etenemistiedon hakeminen API:lta
storyApi.ts                Frontendin API-kutsut
storyFormData.ts           Lomakedatan muodostaminen ja validointi
types.ts                   Yhteiset TypeScript-tyypit
utils.ts                   Yhteiset apufunktiot
```

---

## Paikallinen API

Paikallinen API sijaitsee kansiossa:

```text
tarinakioski-lomake/server
```

Tärkeimmät tiedostot:

```text
index.js
```

API, käsittelyn tilat, keskeyttäminen ja renderöintiputken ohjaus.

```text
config.js
```

Projektin ja ulkoisten ohjelmien konekohtaiset polut.

```text
services/backgroundRemoval.js
```

Python-taustanpoistoprosessin käynnistäminen ja sen etenemisen tulkitseminen.

API tekee seuraavat asiat:

1. vastaanottaa lomakkeen lähettämän `FormData`-datan
2. tarkistaa pakolliset kentät ja tiedostot
3. tarkistaa otsikon enimmäispituuden
4. tarkistaa, että vähintään yksi videoformaatti on valittu
5. muodostaa seuraavan vapaan tarina-id:n
6. luo `input/<id>`-kansion
7. tallentaa taustakuvan ja alkuperäisen videon
8. kirjoittaa `metadata.json`-tiedoston
9. alustaa etenemistiedon
10. luo tarvittaessa maskivideon
11. ajaa valittujen formaattien prepare-skriptit
12. käynnistää Nexrenderin
13. välittää etenemistiedon frontendille
14. keskeyttää aktiiviset prosessit käyttäjän pyynnöstä

Konekohtaiset polut määritellään tiedostossa:

```text
tarinakioski-lomake/server/config.js
```

---

## API-endpointit

### Uuden tarinan luominen

```http
POST /api/stories
```

Pyyntö lähetetään `multipart/form-data`-muodossa.

Tiedostokentät:

```text
backgroundImage
storyVideo
```

Muita tietoja ovat esimerkiksi:

```text
title
author
date
removeBackground
renderFormats
```

### Etenemistiedon hakeminen

```http
GET /api/stories/:storyId/status
```

Vastaus sisältää:

- taustanpoiston tilan
- taustanpoiston osavaiheiden etenemisen
- Instagram-renderöinnin tilan
- HD-renderöinnin tilan
- keskeytystilan
- tiedon siitä, voidaanko työ vielä keskeyttää

### Työn keskeyttäminen

```http
POST /api/stories/:storyId/cancel
```

Keskeytys pysäyttää tarinaan liittyvät aktiiviset prosessit, kuten:

- Python-taustanpoiston
- renderöinnin valmisteluskriptin
- Nexrenderin ja sen käynnistämän prosessipuun

Keskeytettyä työtä ei merkitä epäonnistuneeksi.

---

## Etenemistieto

Frontend hakee etenemistietoa API:lta säännöllisesti.

Taustanpoisto näytetään kolmessa vaiheessa:

```text
1. Esikäsittely
2. Taustan poistaminen
3. Viimeistely
```

Renderöinnit näytetään erillisinä riveinä:

```text
Instagram-video
HD-video
```

Mahdollisia renderöinnin tiloja ovat esimerkiksi:

```text
Odottaa
Valmistellaan
Renderöidään
Valmis
Epäonnistui
Keskeytetty
```

Etenemistieto säilytetään tällä hetkellä API-prosessin muistissa. Jos API käynnistetään uudelleen kesken käsittelyn, aiempi etenemistieto ei enää ole API:n saatavilla, vaikka jo tallennetut input- ja output-tiedostot säilyvät levyllä.

---

## Taustanpoisto

Taustanpoiston koodi sijaitsee kansiossa:

```text
tools/taustanpoisto
```

Käytettävä skripti:

```text
tools/taustanpoisto/rembg_video.py
```

Backend kutsuu taustanpoistoa suoraan virtuaaliympäristön Python-tiedostolla:

```text
tools/taustanpoisto/.venv/Scripts/python.exe
```

Virtuaaliympäristöä ei tarvitse aktivoida erikseen PowerShellissä, kun taustanpoisto käynnistetään lomakkeen ja API:n kautta.

Taustanpoiston polut määritellään tiedostossa:

```text
tarinakioski-lomake/server/config.js
```

Asetukset:

```text
backgroundRemoval.toolDir
backgroundRemoval.pythonPath
backgroundRemoval.scriptPath
```

Taustanpoiston työnkulku:

```text
input/<id>/video.mp4
  ↓
videon purkaminen TIFF-kuvajonoksi
  ↓
rembg ja u2net_human_seg
  ↓
harmaasävymaskien luominen
  ↓
maskien ajallinen pehmennys
  ↓
ProRes 422 Proxy -maskivideo
  ↓
input/<id>/video-mask.mov
```

Taustanpoistoskriptin nykyisiä oletusasetuksia:

```text
Malli: u2net_human_seg
Taustanpoistotyöntekijät: 1
Ajallinen pehmennysikkuna: 3 framea
Käsittelyjonon koko: 8 framea
Maskivideon resoluutio: alkuperäisen videon resoluutio
Maskivideon muoto: ProRes 422 Proxy
```

Skripti yrittää käyttää CUDAa, mutta voi käyttää myös CPU:ta. Jos GPU-muisti loppuu, maskin laskentaa yritetään automaattisesti pienemmällä resoluutiolla ja tulos skaalataan takaisin alkuperäiseen kokoon.

Taustanpoistossa syntyvät väliaikaiset kuvajonot poistetaan prosessin päätyttyä.

---

## After Effects -templatet

Molempien lopullisten videoformaattien pääcomposition nimi on:

```text
MAIN
```

### Ilman lumamattea

Instagram:

```text
templates/tarinakioski_template_insta_v3.aep
```

HD:

```text
templates/tarinakioski_template_v6.aep
```

### Lumamatten kanssa

Instagram:

```text
templates/tarinakioski_template_insta_v4.aep
```

HD:

```text
templates/tarinakioski_template_v8.aep
```

Renderöintiskripti valitsee templaten automaattisesti sen perusteella, sisältääkö `metadata.json` arvon:

```json
"maskVideoFile": "video-mask.mov"
```

Nexrender vaihtaa seuraavien layerien sisällön:

```text
VIDEO_PLACEHOLDER
VIDEO_MASK
BACKGROUND_PHOTO
STORY_TITLE
STORY_AUTHOR
```

`VIDEO_MASK` poistetaan Nexrender-jobista silloin, kun maskivideota ei käytetä.

---

## Renderöintiskriptit

### Instagram

Valmisteluskripti:

```text
prepare-story-insta-render.js
```

Nexrender-jobin pohja:

```text
job-template-insta.json
```

Automaattisesti luotava jobi:

```text
output/<id>/job-auto-insta.json
```

Valmis tiedosto:

```text
output/<id>/<id>_<author>_<title>_insta.mp4
```

### HD

Valmisteluskripti:

```text
prepare-story-hd-render.js
```

Nexrender-jobin pohja:

```text
job-template-hd.json
```

Automaattisesti luotava jobi:

```text
output/<id>/job-auto-hd.json
```

Valmis tiedosto:

```text
output/<id>/<id>_<author>_<title>_hd.mp4
```

---

## Videon kesto

Renderöintiskriptit tunnistavat alkuperäisen puhujavideon keston ffprobella.

Nykyiset asetukset:

```text
FPS: 25
Alkutekstit: 7 sekuntia
Instagram-tarinavideon maksimikesto: 4 minuuttia
HD-tarinavideon maksimikesto: 4 minuuttia
```

Lopullisen videon enimmäiskesto on siten:

```text
4 minuuttia 7 sekuntia
```

Jos ladattu video on yli neljä minuuttia pitkä, se lyhennetään renderöinnissä neljään minuuttiin. Alkuperäistä input-tiedostoa ei leikata.

---

## Kehitysympäristön asennus

Projektin kehitysympäristön asennus ja käyttöönotto kuvataan erillisessä tiedostossa:

[SETUP.md](SETUP.md)

Asennusohjeeseen kuuluvat esimerkiksi:

- tarvittavien ohjelmien ja versioiden asentaminen
- Git-repositorion kloonaaminen
- Node-riippuvuuksien asentaminen
- Python-virtuaaliympäristön luominen
- taustanpoiston riippuvuuksien asentaminen
- After Effectsin ja Nexrenderin asetukset
- templatejen ja lähdemateriaalien sijoittaminen
- ensimmäinen testirenderöinti
- tavallisimpien asennusongelmien ratkaisut

---

## Käynnistäminen

Kun kehitysympäristö on asennettu, API ja lomake käynnistetään erillisissä PowerShell-ikkunoissa.

### 1. Käynnistä API

```powershell
cd C:\nexrender-tarinakioski\tarinakioski-lomake
npm run api
```

API käynnistyy osoitteeseen:

```text
http://localhost:3001
```

### 2. Käynnistä lomake

Avaa toinen PowerShell-ikkuna:

```powershell
cd C:\nexrender-tarinakioski\tarinakioski-lomake
npm run dev
```

Avaa selaimessa Viten ilmoittama osoite, yleensä:

```text
http://localhost:5173
```

Normaalissa kehitys- ja testikäytössä ajetaan yhtä aikaa:

```text
PowerShell 1: npm run api
PowerShell 2: npm run dev
```

API käynnistetään ensisijaisesti komennolla:

```powershell
npm run api
```

---

## Lomakkeen kautta tehtävä testi

1. käynnistä API
2. käynnistä lomake
3. avaa lomake selaimessa
4. kirjoita nimi, otsikko ja päivämäärä
5. valitse taustakuva
6. valitse ääntä sisältävä tavallinen video
7. valitse **Tee henkilövideosta taustaton**
8. valitse **Luo Instagram-video**
9. valitse **Luo HD-video**
10. tarkista tiedot
11. käynnistä videoiden luominen
12. seuraa käsittelyn etenemistä
13. tarkista valmiit tiedostot `output/<id>`-kansiosta

Onnistuneen lumamatte-testin jälkeen `input/<id>`-kansiossa pitäisi olla esimerkiksi:

```text
background.jpg
metadata.json
video.mp4
video-mask.mov
```

Output-kansiossa pitäisi olla:

```text
job-auto-insta.json
job-auto-hd.json
<id>_<author>_<title>_insta.mp4
<id>_<author>_<title>_hd.mp4
```

Tarkista lopputuloksista:

- taustan poistuminen
- henkilön reunojen laatu
- värivideon oikea sijainti
- äänen kuuluminen
- otsikko ja tekijän nimi
- videon kokonaiskesto
- HD-version kuvasuhde
- Instagram-version kuvasuhde

---

## Manuaalinen renderöinti

Normaalisti renderöinti käynnistyy lomakkeelta, mutta renderöintejä voidaan ajaa myös käsin.

Tarinan `input/<id>`-kansiossa pitää olla tarvittavat tiedostot ja oikein muodostettu `metadata.json`.

### Instagram

```powershell
cd C:\nexrender-tarinakioski
node prepare-story-insta-render.js 009
.\node_modules\.bin\nexrender-cli.cmd --file output/009/job-auto-insta.json
```

### HD

```powershell
cd C:\nexrender-tarinakioski
node prepare-story-hd-render.js 009
.\node_modules\.bin\nexrender-cli.cmd --file output/009/job-auto-hd.json
```

Jos After Effectsin `aerender.exe`-polku pitää antaa erikseen:

```powershell
.\node_modules\.bin\nexrender-cli.cmd `
  --file output/009/job-auto-hd.json `
  --binary "C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\aerender.exe"
```

---

## Vaatimukset

- Windows-kehitysympäristö
- Adobe After Effects 2026
- Node.js 20.19+ tai 22.12+ tai uudempi yhteensopiva versio
- npm
- paikallinen React- ja Vite-lomake
- paikallinen Express- ja Multer-API
- Nexrender CLI
- `@nexrender/action-copy`
- FFmpeg
- ffprobe
- Python 3
- projektin Python-virtuaaliympäristö
- rembg
- taustanpoistomalli `u2net_human_seg`

Nykyisessä kehitysympäristössä on käytetty Node 24 -versiota.

After Effectsin renderöijän polku määritellään tiedostossa:

```text
tarinakioski-lomake/server/config.js
```

Nykyisellä kehityskoneella polku on:

```text
C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\aerender.exe
```

Python-tulkki oletetaan polkuun:

```text
C:\nexrender-tarinakioski\tools\taustanpoisto\.venv\Scripts\python.exe
```

---

## Nexrender

Nexrender CLI ja copy-action asennetaan projektin juureen paikallisiksi riippuvuuksiksi:

```powershell
cd C:\nexrender-tarinakioski
npm install --ignore-scripts @nexrender/cli @nexrender/action-copy
```

Paikallinen API käyttää Nexrenderiä projektin omasta `node_modules`-kansiosta:

```text
C:\nexrender-tarinakioski\node_modules\.bin\nexrender-cli.cmd
```

Nexrender käynnistää After Effectsin `aerender.exe`-ohjelman ja kopioi valmiin `result.mp4`-tiedoston tarinan omaan output-kansioon.

---

## Kehitystilanne 31.7.2026

Toimiviksi testatut ominaisuudet:

- lomakkeen kaksivaiheinen syöttö ja tarkistus
- taustakuvan ja videon lataaminen
- automaattinen tarina-id
- Instagram- ja HD-version valitseminen
- molempien videoiden luominen samalla lähetyksellä
- lumamatte-maskivideon automaattinen luominen
- maskin käyttäminen HD-templatessa
- maskin käyttäminen Instagram-templatessa
- alkuperäisen värivideon ja maskivideon käyttäminen rinnakkain
- etenemisen näyttäminen lomakkeella
- taustanpoiston osavaiheiden näyttäminen
- Instagram- ja HD-renderöintien erillinen eteneminen
- käynnissä olevan työn keskeyttäminen
- valmiiden MP4-tiedostojen muodostaminen output-kansioon

## Huomio

Tämä on paikallisesti toimiva demo- ja kehitysversio Tarinakioskista.

Tällä hetkellä:

- API ja lomake käynnistetään erikseen
- tiedostot tallennetaan paikallisesti
- käsittelyn tilat säilytetään API:n muistissa
- lopputiedostot tallennetaan projektin `output`-kansioon
- järjestelmää ei ole vielä paketoitu museon lopulliseksi yhden painikkeen kioskiympäristöksi

Normaalissa kehityskäytössä tarvitaan kaksi käynnissä olevaa PowerShell-ikkunaa:

```text
npm run api
npm run dev
```
