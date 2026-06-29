# Nexrender Tarinakioski

## Tarkoitus

Tämä projekti luo Tarinakioski-videoita After Effects -templateista Nexrenderin avulla.

Projektissa on paikallinen lomake, paikallinen API ja Nexrender-renderöintiputki. Käyttäjä täyttää lomakkeen, valitsee renderöitävät videot ja hyväksyy tarinan. Sen jälkeen paikallinen API tallentaa aineiston, muodostaa tarinalle id:n ja käynnistää valitut renderöinnit.

Projektissa on kaksi renderöintiversiota:

- Instagram-video
- HD-video

Renderöinnissä vaihdetaan tarinakohtaisesti:

- puhujan video
- taustakuva
- tarinan otsikko
- kertoja
- renderöitävät formaatit

Nykyinen työnkulku ei käytä Whisperiä, automaattisia tekstityksiä eikä `STATIC_TITLE`-layeria.

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
6. seuraa renderöinnin etenemistä lomakkeella
7. valmis video syntyy `output/<id>`-kansioon
8. lomake näyttää lopuksi valmiin videon kansiopolun

---

## Projektin nykyinen rakenne

```text
C:\nexrender-tarinakioski
├─ input
│  └─ <id>
│     ├─ video.mov
│     ├─ background.jpg
│     └─ metadata.json
├─ output
│  └─ <id>
│     ├─ job-auto-insta.json
│     ├─ job-auto-hd.json
│     ├─ <id>_<author>_<title>_insta.mp4
│     └─ <id>_<author>_<title>_hd.mp4
├─ templates
│  ├─ tarinakioski_template_insta_v3.aep
│  └─ tarinakioski_template_v6.aep
├─ tarinakioski-lomake
│  ├─ server
│  │  ├─ index.js
│  │  └─ config.js
│  └─ src
│     ├─ components
│     │  └─ Tarinalomake.tsx
│     └─ features
│        └─ tarinalomake
│           ├─ RenderCompleteMessage.tsx
│           ├─ RenderFailedMessage.tsx
│           ├─ RenderProgressPanel.tsx
│           ├─ StoryFormFields.tsx
│           ├─ StoryReview.tsx
│           ├─ StoryStatusMessages.tsx
│           ├─ storyApi.ts
│           ├─ storyFormData.ts
│           ├─ types.ts
│           ├─ useRenderProgress.ts
│           └─ utils.ts
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

Nykyinen suositeltu työnkulku käyttää MOV-videota, jotta taustattoman videon alpha eli läpinäkyvyys säilyy. Videossa tulee olla tausta valmiiksi poistettuna ennen renderöintiä. Tässä työssä taustanpoisto on tehty Adobe After Effects Rotobrush -työkalulla.

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
  "date": "2026-06-26"
}
```

Kentät:

```text
id      Tarinan tunniste
title   Tarinan otsikko
author  Tarinan kertoja
date    Päivämäärä
```

---

## Output-kansio

Renderöinnin tulokset syntyvät `output/<id>`-kansioon.

Esimerkki:

```text
output/003/
  job-auto-insta.json
  job-auto-hd.json
  003_Kaisa Ahonen_Virpojaisloru_insta.mp4
  003_Kaisa Ahonen_Virpojaisloru_hd.mp4
```

Lomake näyttää renderöinnin valmistuttua käyttäjälle valmiin videon kansiopolun, esimerkiksi:

```text
C:\nexrender-tarinakioski\output\003
```

Tämä on nykyisessä demossa paikallisen kehityskoneen polku. Museon koneella vastaava polku määrittyy käytettävän asennuskansion mukaan.

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

Kentät:

```text
Nimi
Tarinan otsikko
Päivämäärä
Taustakuva
Video
Luotavat videot
```

Otsikon maksimipituus on 50 merkkiä. Tämä helpottaa tekstin asettelua After Effects -templateissa.

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

Hyväksymisen jälkeen:

- painike lukittuu
- lomake näyttää, että videoita luodaan
- tuplaklikkaus estetään
- käyttäjälle näytetään tarinan numero
- käyttäjälle näytetään käynnistetyt renderöinnit
- käyttäjälle näytetään renderöinnin eteneminen prosentteina
- valmistumisen jälkeen käyttäjälle näytetään output-kansion polku
- käyttäjä voi aloittaa uuden tarinan painikkeella **Aloita uusi tarina**

---

## Frontendin rakenne

Lomakkeen pääkomponentti:

```text
tarinakioski-lomake/src/components/Tarinalomake.tsx
```

Pääkomponentti ohjaa lomakkeen tilaa ja käyttäjän etenemistä.

Lomakkeen osat on refaktoroitu pienempiin tiedostoihin:

```text
tarinakioski-lomake/src/features/tarinalomake/
```

Tärkeimmät tiedostot:

```text
StoryFormFields.tsx        Ensimmäisen vaiheen lomakekentät
StoryReview.tsx            Tarkistusnäkymä
StoryStatusMessages.tsx    Tallennus-, onnistumis- ja virheviestit
RenderProgressPanel.tsx    Renderöinnin etenemispalkki
RenderCompleteMessage.tsx  Valmisnäkymä ja output-kansiopolku
RenderFailedMessage.tsx    Renderöinnin epäonnistumisilmoitus
useRenderProgress.ts       Renderöinnin etenemistiedon haku API:lta
storyApi.ts                Frontendin API-kutsu
storyFormData.ts           Lomakedatan lukeminen ja validointi
types.ts                   Yhteiset TypeScript-tyypit
utils.ts                   Yhteiset apufunktiot
```

---

## Paikallinen API

Paikallinen API sijaitsee lomakeprojektin `server`-kansiossa:

```text
tarinakioski-lomake/server/index.js
tarinakioski-lomake/server/config.js
```

API vastaanottaa lomakkeen lähettämän `FormData`-datan.

API tekee seuraavat asiat:

1. vastaanottaa tekstikentät ja tiedostot
2. muodostaa seuraavan vapaan tarina-id:n
3. luo uuden `input/<id>`-kansion
4. tallentaa videon nimellä `video.mov`
5. tallentaa taustakuvan `background`-nimellä
6. kirjoittaa `metadata.json`-tiedoston
7. alustaa renderöinnin tilatiedon
8. ajaa valittujen formaattien prepare-skriptit
9. käynnistää Nexrender-renderöinnin
10. välittää renderöinnin etenemistiedon frontendille

Konekohtaiset polut määritellään tiedostossa:

```text
tarinakioski-lomake/server/config.js
```

API:n terveystarkistuksen voi avata selaimessa:

```text
http://localhost:3001/api/health
```

---

## Renderöinnin etenemistieto

Nexrender tulostaa renderöinnin etenemistä API:n konsoliin. API lukee näitä lokirivejä ja tallentaa etenemistiedon paikalliseen muistiin.

Frontend kysyy etenemistietoa API:lta noin kahden sekunnin välein.

Etenemistiedon endpoint:

```text
GET /api/stories/:storyId/status
```

Lomakkeella käyttäjä näkee esimerkiksi:

```text
Renderöinnin eteneminen
Instagram-video
Renderöidään 47 %
```

Jos renderöinti epäonnistuu, käyttäjä näkee virheilmoituksen lomakkeella. Tarkempi tekninen virhe näkyy API:n PowerShell-ikkunassa.

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
Instagram-videon maksimikesto: 4 minuuttia
HD-videon maksimikesto: 10 minuuttia
FPS: 25
```

---

## Käynnistäminen

### 1. Asenna projektin riippuvuudet

Projektin juuressa:

```powershell
cd C:\nexrender-tarinakioski
npm install --ignore-scripts
```

`--ignore-scripts` estää npm:ää ajamasta mahdollisia asennuksen aikaisia skriptejä vahingossa.

Lomakekansiossa:

```powershell
cd C:\nexrender-tarinakioski\tarinakioski-lomake
npm install
```

### 2. Käynnistä paikallinen API

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

Avaa toinen PowerShell-ikkuna ja aja:

```powershell
cd C:\nexrender-tarinakioski\tarinakioski-lomake
npm run dev
```

Avaa selaimessa Viten ilmoittama paikallinen osoite.

Tyypillisesti osoite on esimerkiksi:

```text
http://localhost:5173
```

Normaalissa kehityskäytössä ajetaan siis yhtä aikaa:

```text
npm run api
npm run dev
```

---

## Manuaalinen renderöinti

Normaalisti renderöinti käynnistyy lomakkeelta, mutta renderöintejä voi ajaa myös käsin.

### Instagram

Projektin juuressa:

```powershell
node prepare-story-insta-render.js 003
.\node_modules\.bin\nexrender-cli.cmd --file output/003/job-auto-insta.json
```

### HD

Projektin juuressa:

```powershell
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

Nykyisessä kehitysympäristössä käytössä on ollut Node 24.16.0.

After Effectsin renderöijän polku määritellään projektin asetuksissa.

Nykyisellä kehityskoneella polku on ollut:

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

Tämä on vakaampi ratkaisu kuin globaali `nexrender-cli`, koska renderöinti ei riipu siitä, mikä Node-versio tai globaali npm-polku on aktiivisena.

## Huomio museokäytöstä

Tämä on paikallisesti toimiva demo- ja kehitysversio Tarinakioskista.

Museon koneella tavoite olisi, että käyttäjän ei tarvitse käynnistää komentoriviltä erikseen API:a ja lomaketta, vaan kokonaisuus käynnistyisi esimerkiksi työpöydän pikakuvakkeesta.

Tällä hetkellä kehityskäytössä API ja lomake käynnistetään erikseen:

```text
npm run api
npm run dev
```

Myöhemmin nämä voidaan yhdistää museokoneelle sopivaksi käynnistystavaksi.
