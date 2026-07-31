# Tarinakioski – ympäristön pystytys

Tämä ohje kuvaa, miten **Nexrender Tarinakioski** -projekti otetaan käyttöön Windows 11 -koneella.

Ohje koskee branchia:

```text
taustanpoisto-maski
```

Tässä versiossa taustanpoisto tuottaa alkuperäisen värivideon rinnalle harmaasävyisen maskivideon:

```text
video-mask.mov
```

After Effects käyttää maskivideota alkuperäisen värivideon luma-mattena.

---

## 1. Tarvittavat ohjelmat

Koneelle tarvitaan:

- Git
- Git LFS
- Node.js 20.19 tai uudempi
- npm
- Python 3.12
- FFmpeg
- Adobe After Effects 2026
- ajantasainen NVIDIA-näytönohjaimen ajuri GPU-taustanpoistoa varten
- Visual Studio Code tai muu tekstieditori

Projektissa toimivaksi todettu ympäristö:

```text
Windows 11
Node.js 24.x
npm 11.x
Python 3.12.x
Adobe After Effects 2026
```

---

## 2. Tarkista asennukset

Avaa PowerShell ja tarkista ohjelmat:

```powershell
git --version
git lfs version
node --version
npm --version
py -3.12 --version
ffmpeg -version
```

Jos `npm` antaa PowerShell-virheen:

```text
npm.ps1 cannot be loaded because running scripts is disabled
```

salli paikallisten skriptien suorittaminen nykyiselle käyttäjälle:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Vastaa vahvistuskysymykseen:

```text
Y
```

Sulje PowerShell ja avaa se uudelleen.

Vaihtoehtoisesti npm-komennon voi ajaa muodossa:

```powershell
npm.cmd --version
```

---

## 3. Ota Git LFS käyttöön

Git LFS tarvitaan repossa olevia suuria videotiedostoja varten.

```powershell
git lfs install
```

Jos `git lfs` -komentoa ei löydy, asenna Git LFS ja aja komento uudelleen.

---

## 4. Kloonaa projekti

Siirry C-aseman juureen:

```powershell
cd C:\
```

Kloonaa repository:

```powershell
git clone https://github.com/Niemmar/nexrender-tarinakioski.git
```

Siirry projektikansioon:

```powershell
cd C:\nexrender-tarinakioski
```

Vaihda maskivideo-branchiin:

```powershell
git switch taustanpoisto-maski
```

Hae branchin uusin versio:

```powershell
git pull origin taustanpoisto-maski
```

Hae Git LFS -tiedostot:

```powershell
git lfs pull
```

Tarkista tila:

```powershell
git status
```

Odotettu tulos:

```text
On branch taustanpoisto-maski
Your branch is up to date with 'origin/taustanpoisto-maski'.
nothing to commit, working tree clean
```

---

## 5. Asenna projektin Node-riippuvuudet

Projektissa on kaksi erillistä `package.json`-tiedostoa:

1. projektin juuressa ovat Nexrender- ja renderöintiriippuvuudet
2. `tarinakioski-lomake`-kansiossa ovat lomakkeen ja API:n riippuvuudet

### 5.1 Projektin juuren riippuvuudet

```powershell
cd C:\nexrender-tarinakioski
npm install --ignore-scripts
```

Tämä asentaa muun muassa:

```text
@nexrender/cli
@nexrender/action-copy
ffprobe-static
fluent-ffmpeg
```

Nexrenderin paikallinen komentotiedosto syntyy polkuun:

```text
C:\nexrender-tarinakioski\node_modules\.bin\nexrender-cli.cmd
```

### 5.2 Lomakkeen ja API:n riippuvuudet

```powershell
cd C:\nexrender-tarinakioski\tarinakioski-lomake
npm install
```

Tämä asentaa muun muassa:

```text
React
Vite
TypeScript
Express
Multer
Tailwind CSS
```

---

## 6. Luo Python-ympäristö taustanpoistolle

Siirry taustanpoistokansioon:

```powershell
cd C:\nexrender-tarinakioski\tools\taustanpoisto
```

Luo Python 3.12 -virtuaaliympäristö:

```powershell
py -3.12 -m venv .venv
```

Päivitä pip:

```powershell
.\.venv\Scripts\python.exe -m pip install --upgrade pip
```

Asenna projektin lukitut Python-riippuvuudet:

```powershell
.\.venv\Scripts\python.exe -m pip install -r .\requirements-taustanpoisto.txt
```

Riippuvuuksiin kuuluvat muun muassa:

```text
rembg
onnxruntime-gpu
ffmpeg-python
numpy
Pillow
scipy
scikit-image
```

Virtuaaliympäristöä ei tallenneta Gitiin. Se pitää luoda jokaiselle koneelle erikseen.

---

## 7. Tarkista Python-ympäristö

Tarkista taustanpoistoskriptin käynnistyminen:

```powershell
cd C:\nexrender-tarinakioski\tools\taustanpoisto
.\.venv\Scripts\python.exe .\rembg_video.py --help
```

Odotettu alku:

```text
usage: rembg_video.py
```

Tarkista ONNX Runtime -suorittimet:

```powershell
.\.venv\Scripts\python.exe -c "import onnxruntime as ort; print(ort.get_available_providers())"
```

GPU-asennuksessa tuloksessa pitäisi näkyä:

```text
CUDAExecutionProvider
```

Myös tämä näkyy yleensä:

```text
CPUExecutionProvider
```

Jos vain CPU-suoritin näkyy, tarkista NVIDIA-ajuri ja käynnistä kone uudelleen.

---

## 8. Tarkista FFmpeg

Taustanpoistoskripti tarvitsee `ffmpeg.exe`-ohjelman.

Tarkista:

```powershell
ffmpeg -version
```

Jos komentoa ei löydy, asenna FFmpeg ja varmista, että sen `bin`-kansio on Windowsin `PATH`-ympäristömuuttujassa.

Sulje asennuksen jälkeen kaikki PowerShell-ikkunat ja avaa uusi PowerShell.

---

## 9. Tarkista After Effects

Projektissa käytetään Adobe After Effects 2026:ta.

Oletuspolku:

```text
C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\aerender.exe
```

Tarkista tiedoston olemassaolo PowerShellissä:

```powershell
Test-Path "C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\aerender.exe"
```

Odotettu tulos:

```text
True
```

Polku määritellään tiedostossa:

```text
tarinakioski-lomake\server\config.js
```

Asetus:

```javascript
aerenderPath:
  "C:\\Program Files\\Adobe\\Adobe After Effects 2026\\Support Files\\aerender.exe",
```

Jos After Effects on eri polussa tai eri versiona, päivitä tämä asetus.

---

## 10. Tarkista Python-polku API:n asetuksista

API käynnistää taustanpoiston suoraan virtuaaliympäristön Pythonilla.

Tiedosto:

```text
tarinakioski-lomake\server\config.js
```

Polku muodostetaan automaattisesti projektin sijainnista:

```text
tools\taustanpoisto\.venv\Scripts\python.exe
```

Projektin odotettu polku on:

```text
C:\nexrender-tarinakioski
```

Tarkista Python:

```powershell
Test-Path "C:\nexrender-tarinakioski\tools\taustanpoisto\.venv\Scripts\python.exe"
```

Odotettu tulos:

```text
True
```

---

## 11. Tarkista After Effects -templatet

Renderöintiskriptit tarvitsevat seuraavat tiedostot:

```text
templates\tarinakioski_template_v6.aep
templates\tarinakioski_template_v8.aep
templates\tarinakioski_template_insta_v3.aep
templates\tarinakioski_template_insta_v4.aep
```

Niiden käyttötarkoitukset:

| Formaatti | Ilman taustanpoistoa                 | Maskivideon kanssa                   |
| --------- | ------------------------------------ | ------------------------------------ |
| HD        | `tarinakioski_template_v6.aep`       | `tarinakioski_template_v8.aep`       |
| Instagram | `tarinakioski_template_insta_v3.aep` | `tarinakioski_template_insta_v4.aep` |

Tarkista tiedostot:

```powershell
cd C:\nexrender-tarinakioski

Test-Path .\templates\tarinakioski_template_v6.aep
Test-Path .\templates\tarinakioski_template_v8.aep
Test-Path .\templates\tarinakioski_template_insta_v3.aep
Test-Path .\templates\tarinakioski_template_insta_v4.aep
```

Kaikkien komentojen pitäisi palauttaa:

```text
True
```

Jos template käyttää ulkoisia lähdemateriaaleja, varmista myös, että materiaalit ovat mukana ja linkitetty oikein After Effectsissä.

---

## 12. Käynnistä API

Avaa ensimmäinen PowerShell-ikkuna:

```powershell
cd C:\nexrender-tarinakioski\tarinakioski-lomake
npm run api
```

Odotettu ilmoitus:

```text
Tarinakioski API käynnissä: http://localhost:3001
```

Jätä ikkuna auki.

---

## 13. Käynnistä lomake

Avaa toinen PowerShell-ikkuna:

```powershell
cd C:\nexrender-tarinakioski\tarinakioski-lomake
npm run dev
```

Vite näyttää selaimessa avattavan osoitteen, yleensä:

```text
http://localhost:5173
```

Jätä myös tämä PowerShell-ikkuna auki.

Normaalissa käytössä tarvitaan siis kaksi yhtä aikaa käynnissä olevaa komentoa:

```text
npm run api
npm run dev
```

---

## 14. Ensimmäinen testi

1. Avaa lomake selaimessa.
2. Syötä kertojan nimi, tarinan otsikko ja päivämäärä.
3. Lisää taustakuva.
4. Lisää värillinen puhujavideo.
5. Valitse **Tee henkilövideosta taustaton**.
6. Valitse HD-video, Instagram-video tai molemmat.
7. Hyväksy tiedot.
8. Seuraa taustanpoiston ja renderöinnin etenemistä lomakkeella.

API luo tarinalle uuden kansion:

```text
input\<id>
```

Esimerkki:

```text
input\001
```

Maskiversiossa kansioon syntyvät esimerkiksi:

```text
background.jpg
metadata.json
video.mp4
video-mask.mov
```

Valmiit videot syntyvät kansioon:

```text
output\<id>
```

Ensimmäinen taustanpoisto voi kestää tavallista pidempään, koska `rembg` voi ladata käyttämänsä mallin koneelle ensimmäisellä ajokerralla.

---

## 15. Manuaalinen renderöintitesti

Normaalisti renderöinti käynnistetään lomakkeelta. Olemassa olevan tarinan voi testata myös käsin.

Korvaa `001` halutulla tarina-id:llä.

### HD

```powershell
cd C:\nexrender-tarinakioski
node .\prepare-story-hd-render.js 001
.\node_modules\.bin\nexrender-cli.cmd --file .\output\001\job-auto-hd.json --binary "C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\aerender.exe"
```

### Instagram

```powershell
cd C:\nexrender-tarinakioski
node .\prepare-story-insta-render.js 001
.\node_modules\.bin\nexrender-cli.cmd --file .\output\001\job-auto-insta.json --binary "C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\aerender.exe"
```

---

## 16. Projektin normaali käynnistys myöhemmin

Kun ympäristö on jo asennettu, käynnistykseen tarvitaan vain kaksi PowerShell-ikkunaa.

### PowerShell 1 – API

```powershell
cd C:\nexrender-tarinakioski\tarinakioski-lomake
npm run api
```

### PowerShell 2 – lomake

```powershell
cd C:\nexrender-tarinakioski\tarinakioski-lomake
npm run dev
```

---

## 17. Projektin päivittäminen Gitistä

Ennen päivittämistä tarkista paikalliset muutokset:

```powershell
cd C:\nexrender-tarinakioski
git status
```

Vaihda tarvittaessa oikeaan branchiin:

```powershell
git switch taustanpoisto-maski
```

Hae muutokset:

```powershell
git pull origin taustanpoisto-maski
git lfs pull
```

Jos `package.json` tai `package-lock.json` on muuttunut, aja riippuvuudet uudelleen.

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

Python-riippuvuudet voi päivittää requirements-tiedoston mukaisiksi näin:

```powershell
cd C:\nexrender-tarinakioski\tools\taustanpoisto
.\.venv\Scripts\python.exe -m pip install -r .\requirements-taustanpoisto.txt
```

---

## 18. Yleisimmät virheet

### `vite is not recognized`

Syy: lomakkeen `node_modules` puuttuu.

Korjaus:

```powershell
cd C:\nexrender-tarinakioski\tarinakioski-lomake
npm install
npm run dev
```

### `npm.ps1 cannot be loaded`

Korjaus:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Tai käytä:

```powershell
npm.cmd install
npm.cmd run dev
```

### `Taustanpoiston Pythonia ei löytynyt`

Tarkista:

```powershell
Test-Path "C:\nexrender-tarinakioski\tools\taustanpoisto\.venv\Scripts\python.exe"
```

Jos tulos on `False`, luo `.venv` uudelleen tämän ohjeen kohdan 6 mukaan.

### `ffmpeg`-komentoa ei löydy

FFmpeg puuttuu tai sen `bin`-kansio ei ole PATH-muuttujassa.

Tarkista uudessa PowerShellissä:

```powershell
ffmpeg -version
```

### `aerender.exe`-tiedostoa ei löydy

Tarkista After Effectsin asennuspolku ja päivitä:

```text
tarinakioski-lomake\server\config.js
```

### Template puuttuu

Tarkista kohdan 11 neljä AEP-tiedostoa. Renderöintiskripti valitsee templaten sen perusteella, onko tarinalla `video-mask.mov`.

### Git näyttää pienen tekstitiedoston videotiedoston sijasta

Kyseessä voi olla Git LFS -osoitintiedosto.

Aja:

```powershell
cd C:\nexrender-tarinakioski
git lfs pull
```

### Branchin vaihto estyy paikallisten muutosten vuoksi

Tarkista ensin:

```powershell
git status
```

Älä poista tai ylikirjoita paikallisia muutoksia ennen kuin tiedät, haluatko säilyttää ne, commitoida ne vai siirtää ne talteen.

---

## 19. Asennuksen tarkistuslista

- [ ] Git toimii
- [ ] Git LFS toimii
- [ ] repository on kloonattu
- [ ] aktiivinen branch on `taustanpoisto-maski`
- [ ] `git lfs pull` on ajettu
- [ ] Node.js toimii
- [ ] projektin juuren `npm install --ignore-scripts` on ajettu
- [ ] lomakekansion `npm install` on ajettu
- [ ] Python 3.12 toimii
- [ ] `.venv` on luotu
- [ ] `requirements-taustanpoisto.txt` on asennettu
- [ ] `rembg_video.py --help` toimii
- [ ] FFmpeg toimii
- [ ] NVIDIA-ajuri on asennettu
- [ ] `CUDAExecutionProvider` näkyy
- [ ] After Effects 2026 on asennettu
- [ ] `aerender.exe` löytyy määritetystä polusta
- [ ] kaikki neljä AEP-templatea löytyvät
- [ ] `npm run api` käynnistyy
- [ ] `npm run dev` käynnistyy
- [ ] lomake avautuu selaimessa
- [ ] testivideo syntyy `output\<id>`-kansioon

---

Päivitetty 31.7.2026 branchin `taustanpoisto-maski` nykytilan perusteella.
