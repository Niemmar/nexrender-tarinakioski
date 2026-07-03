# Nexrender Tarinakioski

## Tarkoitus

Tämä projekti luo Tarinakioski-videoita After Effects -templateista Nexrenderin avulla.

Projektissa on paikallinen React-lomake, paikallinen Express/Multer-API ja Nexrender-renderöintiputki. Käyttäjä täyttää lomakkeen, lataa taustakuvan ja videon, valitsee halutut videoformaatit ja hyväksyy tarinan. API tallentaa aineiston, muodostaa tarinalle id:n ja käynnistää tarvittavat käsittely- ja renderöintivaiheet.

Projektissa voidaan luoda:

- Instagram-video
- HD-video

Lomakkeelta voidaan myös valita, poistetaanko ladatusta videosta tausta ennen renderöintiä.

Nykyinen työnkulku ei käytä Whisperiä, automaattisia tekstityksiä eikä `STATIC_TITLE`-layeria.

---

## Työnkulku

```text
React-lomake
  ↓
Paikallinen Express/Multer-API
  ↓
input/<id>/
  background.jpg
  metadata.json
  original-video.mp4   jos taustanpoisto on valittu
  video.mov            renderöintiin menevä video
  ↓
tarvittaessa taustanpoisto
  ↓
prepare-story-insta-render.js / prepare-story-hd-render.js
  ↓
Nexrender + After Effects
  ↓
output/<id>/valmis MP4
```

Käyttäjän näkökulmasta työnkulku on:

1. täytä tarinan tiedot lomakkeella
2. lataa taustakuva ja puhujavideo
3. valitse tarvittaessa **Tee henkilövideosta taustaton**
4. valitse Instagram-video, HD-video tai molemmat
5. tarkista tiedot
6. paina **Hyväksy ja luo videot**
7. seuraa videon käsittelyn etenemistä lomakkeella
8. valmis video syntyy `output/<id>`-kansioon

---

## Projektin rakenne

```text
C:\nexrender-tarinakioski
├─ input
│  └─ <id>
│     ├─ background.jpg
│     ├─ metadata.json
│     ├─ original-video.mp4
│     └─ video.mov
├─ output
│  └─ <id>
│     ├─ job-auto-insta.json
│     ├─ job-auto-hd.json
│     ├─ <id>_<author>_<title>_insta.mp4
│     └─ <id>_<author>_<title>_hd.mp4
├─ templates
│  ├─ tarinakioski_template_insta_v3.aep
│  └─ tarinakioski_template_v6.aep
├─ tools
│  └─ taustanpoisto
│     └─ rembg_video.py
├─ tarinakioski-lomake
│  ├─ server
│  │  ├─ index.js
│  │  ├─ config.js
│  │  └─ services
│  │     └─ backgroundRemoval.js
│  └─ src
│     └─ features
│        └─ tarinalomake
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
  background.jpg
  metadata.json
  video.mov
```

Jos taustanpoisto on valittu, kansioon tallennetaan myös alkuperäinen ladattu video:

```text
input/003/
  background.jpg
  metadata.json
  original-video.mp4
  video.mov
```

Tarina-id muodostetaan automaattisesti seuraavasta vapaasta numerosta. Jos `input`-kansiossa ovat jo `001` ja `002`, seuraava tarina saa id:n `003`.

---

## Tiedostot

### `video.mov`

Renderöintiin menevä puhujavideo tallennetaan nimellä:

```text
video.mov
```

Jos käyttäjä lataa valmiiksi taustattoman MOV-videon eikä valitse taustanpoistoa, video tallennetaan suoraan renderöintiä varten.

Jos käyttäjä valitsee taustanpoiston, alkuperäinen video tallennetaan ensin nimellä `original-video.<tiedostopääte>`, ja taustanpoistovaihe tuottaa renderöintiä varten uuden `video.mov`-tiedoston.

### `background.jpg`

Taustakuva tallennetaan `background`-nimellä.

Sallitut muodot:

```text
background.jpg
background.jpeg
background.png
background.webp
```

### `metadata.json`

Tarinan metatiedot tallennetaan tiedostoon:

```json
{
  "id": "003",
  "title": "Virpojaisloru",
  "author": "Kaisa Ahonen",
  "date": "2026-06-26",
  "removeBackground": true,
  "videoFile": "video.mov",
  "originalVideoFile": "original-video.mp4"
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

Videon esikäsittelyn valinta:

```text
Tee henkilövideosta taustaton
```

Renderöintivalinnat:

```text
Luo Instagram-video
Luo HD-video
```

Lomake on kaksivaiheinen:

1. tietojen syöttö
2. tarkistus ja hyväksyminen

Hyväksymisen jälkeen lomake näyttää käsittelyn etenemisen ja lopuksi valmiin videon output-kansion.

---

## Frontendin rakenne

Lomakkeen pääkomponentti:

```text
tarinakioski-lomake/src/components/Tarinalomake.tsx
```

Lomakkeen osat:

```text
tarinakioski-lomake/src/features/tarinalomake/
```

Tärkeimmät tiedostot:

```text
StoryFormFields.tsx        Lomakekentät
StoryReview.tsx            Tarkistusnäkymä
StoryStatusMessages.tsx    Tallennus-, onnistumis- ja virheviestit
RenderProgressPanel.tsx    Käsittelyn eteneminen
RenderCompleteMessage.tsx  Valmisnäkymä ja output-kansiopolku
RenderFailedMessage.tsx    Epäonnistumisilmoitus
useRenderProgress.ts       Etenemistiedon haku API:lta
storyApi.ts                Frontendin API-kutsu
storyFormData.ts           Lomakedatan lukeminen ja validointi
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
index.js                         API ja renderöintiputken ohjaus
config.js                        Polut ja asetukset
services/backgroundRemoval.js    Taustanpoiston käynnistäminen Pythonilla
```

API tekee seuraavat asiat:

1. vastaanottaa lomakkeen lähettämän `FormData`-datan
2. tarkistaa pakolliset kentät ja tiedostot
3. muodostaa seuraavan vapaan tarina-id:n
4. luo `input/<id>`-kansion
5. tallentaa kuvan ja videon
6. ajaa tarvittaessa taustanpoiston
7. kirjoittaa `metadata.json`-tiedoston
8. alustaa etenemistiedon
9. ajaa valittujen formaattien prepare-skriptit
10. käynnistää Nexrenderin
11. välittää etenemistiedon frontendille

Konekohtaiset polut määritellään tiedostossa:

```text
tarinakioski-lomake/server/config.js
```

---

## Taustanpoisto

Taustanpoiston koodi sijaitsee kansiossa:

```text
tools/taustanpoisto
```

Backend kutsuu taustanpoistoa suoraan Python-ympäristön `python.exe`-tiedostolla. Virtuaaliympäristöä ei aktivoida erikseen PowerShellissä.

Taustanpoiston asetukset ovat `config.js`-tiedostossa:

```text
backgroundRemoval.toolDir
backgroundRemoval.pythonPath
backgroundRemoval.scriptPath
```

Kun taustanpoisto on valittu:

```text
ladattu video
  ↓
input/<id>/original-video.mp4
  ↓
tools/taustanpoisto/rembg_video.py
  ↓
input/<id>/video.mov
  ↓
Nexrender
```

Taustanpoisto tuottaa alpha-kanavallisen MOV-videon, jota After Effects ja Nexrender käyttävät renderöinnissä.

---

## Etenemistieto

Frontend hakee etenemistietoa API:lta säännöllisesti.

Endpoint:

```text
GET /api/stories/:storyId/status
```

Tällä hetkellä etenemistietoa näytetään renderöintien mukaan. Seuraavaksi etenemisnäkymää kehitetään niin, että käyttäjälle näkyvät erillisinä vaiheina esimerkiksi:

```text
1. Taustan poistaminen videosta
2. Lopullisen videon luominen
```

Tavoitteena on, että pitkän taustanpoiston aikana käyttäjä näkee, missä vaiheessa videon käsittely on.

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

---

## Renderöintiskriptit

### Instagram

```text
prepare-story-insta-render.js
job-template-insta.json
output/<id>/job-auto-insta.json
output/<id>/<id>_<author>_<title>_insta.mp4
```

### HD

```text
prepare-story-hd-render.js
job-template-hd.json
output/<id>/job-auto-hd.json
output/<id>/<id>_<author>_<title>_hd.mp4
```

---

## Videon kesto

Renderöintiskriptit tunnistavat puhujavideon keston ffprobella.

Nykyiset perusasetukset:

```text
Alkutekstit: 7 sekuntia
Instagram-videon maksimikesto: 4 minuuttia
HD-videon maksimikesto: 10 minuuttia
FPS: 25
```

---

## Käynnistäminen

### 1. Asenna riippuvuudet

Projektin juuressa:

```powershell
cd C:\nexrender-tarinakioski
npm install --ignore-scripts
```

Lomakekansiossa:

```powershell
cd C:\nexrender-tarinakioski\tarinakioski-lomake
npm install
```

### 2. Käynnistä API

Lomakekansiossa:

```powershell
cd C:\nexrender-tarinakioski\tarinakioski-lomake
npm run api
```

API käynnistyy osoitteeseen:

```text
http://localhost:3001
```

### 3. Käynnistä lomake

Avaa toinen PowerShell-ikkuna:

```powershell
cd C:\nexrender-tarinakioski\tarinakioski-lomake
npm run dev
```

Avaa selaimessa Viten ilmoittama osoite, yleensä:

```text
http://localhost:5173
```

Normaalissa kehityskäytössä ajetaan yhtä aikaa:

```text
npm run api
npm run dev
```

---

## Manuaalinen renderöinti

Normaalisti renderöinti käynnistyy lomakkeelta, mutta renderöintejä voi ajaa myös käsin.

### Instagram

```powershell
cd C:\nexrender-tarinakioski
node prepare-story-insta-render.js 003
.\node_modules\.bin\nexrender-cli.cmd --file output/003/job-auto-insta.json
```

### HD

```powershell
cd C:\nexrender-tarinakioski
node prepare-story-hd-render.js 003
.\node_modules\.bin\nexrender-cli.cmd --file output/003/job-auto-hd.json
```

Jos After Effectsin `aerender.exe`-polku pitää antaa erikseen, se voidaan antaa Nexrender-komennolle `--binary`-parametrilla tai määrittää API:n asetuksiin.

---

## Vaatimukset

- Adobe After Effects 2026
- Node.js 20.19+ tai uudempi
- paikallinen React/Vite-lomake
- paikallinen Express/Multer-API
- Nexrender CLI
- FFmpeg / ffprobe
- Python-ympäristö taustanpoistolle

Nykyisessä kehitysympäristössä käytössä on ollut Node 24.16.0.

After Effectsin renderöijän polku määritellään asetuksissa. Nykyisellä kehityskoneella polku on ollut:

```text
C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\aerender.exe
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

---

## Huomio

Tämä on paikallisesti toimiva demo- ja kehitysversio Tarinakioskista.

Tällä hetkellä kehityskäytössä API ja lomake käynnistetään erikseen:

```text
npm run api
npm run dev
```
