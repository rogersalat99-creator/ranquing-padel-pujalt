# Rànquing de Pàdel de Pujalt

Web estàtica en català (HTML, CSS mínim i JavaScript, sense frameworks ni servidor) que mostra el rànquing de pàdel de Pujalt a partir d'un full de càlcul de Google publicat com a CSV.

## 1. Què és i quines seccions té

La web llegeix les dades en carregar la pàgina i cada 5 minuts. Mostra quatre seccions:

1. **Classificació:** una taula per grup (1 a 5), calculada a la web a partir dels partits jugats. Columnes: Posició, Parella, PJ, PG, PP, Sets, Jocs, Punts.
2. **Resultats:** partits jugats, de més recent a més antic.
3. **Pròxims partits:** partits pendents, ordenats per data i hora. Si no hi ha hora, es mostra "per confirmar". Els pendents amb data anterior a avui es mostren com a "pendent de resultat" (no s'amaguen).
4. **Disponibilitat de pista:** graella dels pròxims 7 dies, amb franges d'1 hora de 9:00 a 22:00. Cada franja és "Lliure", "Ocupada" o "Partit rànquing · Grup X". Mai es mostra qui ha fet la reserva.

A la capçalera hi ha l'hora de l'última lectura de dades ("Dades llegides el...").

Si una pestanya no es pot llegir, la secció afectada mostra un missatge d'error. Si ja s'havien llegit dades abans, es mantenen amb un avís.

### Estructura de fitxers

| Fitxer | Què fa |
|---|---|
| `index.html` | Pàgina principal amb les quatre seccions |
| `css/estil.css` | Estils bàsics (taules llegibles, mòbil) |
| `js/config.js` | URLs de les pestanyes publicades en CSV |
| `js/dades.js` | Llegeix els CSV i retorna objectes (res de visual). Per canviar la font de dades només cal tocar aquest fitxer |
| `js/classificacio.js` | Calcula la classificació a partir dels partits |
| `js/vistes.js` | Pinta les seccions a partir de les dades (no llegeix fitxers) |
| `js/app.js` | Coordina les altres parts i refresca cada 5 minuts |

## 2. Com publicar-la a GitHub Pages

1. Crea un compte a [github.com](https://github.com) si no en tens.
2. Crea un repositori nou (per exemple `ranquing-padel-pujalt`). Ha de ser **públic** perquè GitHub Pages funcioni en un compte gratuït.
3. Puja **només** aquests fitxers i carpetes: `index.html`, `css/`, `js/` i `README.md` (veure l'apartat 6).
   - Des del web: botó *Add file → Upload files*, arrossega'ls i fes *Commit changes*.
4. Ves a *Settings → Pages*.
5. A *Build and deployment*, a *Source* tria **Deploy from a branch**, a *Branch* tria **main** i la carpeta **/ (root)**, i prem *Save*.
6. Espera uns minuts. La web quedarà publicada a `https://<el-teu-usuari>.github.io/<nom-del-repositori>/`.
7. Quan canviïs qualsevol fitxer del repositori, GitHub Pages es torna a publicar sol.

## 3. Com canviar les URLs de `js/config.js`

`js/config.js` conté tres URLs, una per pestanya del full de càlcul:

```js
const CONFIG = {
  urlEquips:   "https://docs.google.com/.../pub?gid=...&single=true&output=csv",
  urlPartits:  "https://docs.google.com/.../pub?gid=...&single=true&output=csv",
  urlReserves: "https://docs.google.com/.../pub?gid=...&single=true&output=csv"
};
```

Per obtenir una URL:

1. Al full de càlcul de Google: *Fitxer → Compartir → Publicar a la web*.
2. A *Enllaç*, tria la **pestanya** concreta (no "Tot el document") i el format **Valors separats per comes (.csv)**.
3. Prem *Publicar* i copia l'enllaç.
4. Enganxa'l al camp que correspongui de `config.js`, entre cometes, i desa.

Només cal tocar `config.js` si es publica un full nou o es refà la publicació d'una pestanya. Si només canvien les dades del full, no cal tocar res.

## 4. Com canviar les dades

Les dades s'editen **sempre al full de càlcul de Google**, mai al codi. La web les llegeix de nou en carregar la pàgina i cada 5 minuts. Google triga uns minuts a actualitzar el CSV publicat.

### Pestanya Equips

Columnes: `Grup | Nivell | Parella | Jugador 1 | Jugador 2`

- `Grup`: 1 a 5.
- `Parella`: nom de la parella. **Ha de ser exactament igual** al que s'escriu a Partits (accents i majúscules inclosos).

### Pestanya Partits

Columnes: `Fase | Grup | Parella A | Parella B | Data | Hora | Resultat | Estat`

| Camp | Valors vàlids |
|---|---|
| `Data` | Format ISO: `AAAA-MM-DD` (per exemple `2026-10-06`) |
| `Hora` | `HH:MM` (per exemple `18:30`). Pot estar buida: es mostrarà "per confirmar" |
| `Estat` | `pendent`, `jugat` o `anul·lat` |
| `Resultat` | Veure sota. Pot estar buit si el partit és pendent |

Format del resultat (des del punt de vista de la Parella A, un parell per set):

- Normal: `6-4 6-2`
- Tres sets: `6-4 3-6 7-5`
- Super tie-break: `6-4 3-6 10-8` (el `10-8` compta com un set)
- Abandonament: afegeix `ab A` o `ab B` **al final**, on la lletra és la parella que abandona. Per exemple: `6-4 2-1 ab B`.

Només compten per a la classificació els partits amb estat `jugat`. Un partit `jugat` amb un resultat que no es pot interpretar (per exemple, un abandonament sense `A` o `B`) s'ignora i apareix un avís sota la classificació perquè es pugui corregir.

### Pestanya Reserves

Columnes: `Data | Hora inici | Hora fi | Tipus | Grup`

| Camp | Valors vàlids |
|---|---|
| `Data` | `AAAA-MM-DD` |
| `Hora inici`, `Hora fi` | `HH:MM` |
| `Tipus` | `Ocupada` o `Rànquing` |
| `Grup` | Només s'omple si el tipus és `Rànquing` |

Una reserva ocupa totes les franges d'una hora que solapi. Per exemple, 18:00-19:30 marca com a ocupades les franges 18-19 i 19-20.

### Què NO s'ha de tocar

- **Els noms de les capçaleres** de la primera fila de cada pestanya. Si en canvies un, la web mostrarà un error a la secció afectada.
- **Les URLs publicades** (si despublices i tornes a publicar una pestanya, l'URL pot canviar: llavors cal actualitzar `config.js`).
- **Els formats** de data (`AAAA-MM-DD`), hora (`HH:MM`) i els valors d'Estat i Tipus.
- **Els noms de parella**: han de coincidir entre Equips i Partits.
- **Cap dada personal.** Tot el que hi hagi a una pestanya publicada com a CSV és públic a Internet, encara que la web no el mostri (veure l'apartat 6).

## 5. Decisions de classificació

- **Punts:** victòria 3, derrota 1, abandonament 0 per a qui abandona. Qui abandona manté els sets ja guanyats; el set en joc no s'atorga a ningú, però els seus jocs compten.
- **Només partits `jugat`.** Els `pendent` i `anul·lat` no compten.
- **Desempat, en aquest ordre:**
  1. Resultat directe: només mira els partits entre les parelles empatades.
  2. Diferència de sets.
  3. Diferència de jocs.
- **Sets i jocs són del grup sencer**, no només dels partits entre les parelles empatades.
- En un empat de 3 o més parelles, quan un criteri en separa alguna i en queden dues o més d'empatades, es torna a començar pel resultat directe només entre les que queden.
- **Super tie-break:** un resultat com `10-8` compta com un set, amb 18 jocs.
- **Empat total:** si després de tots els criteris continua l'empat, les parelles comparteixen posició i es mostra "empat" (no s'inventa cap ordre; dins l'empat es mostren per ordre alfabètic només per estabilitat).
- **Parelles sense cap partit jugat:** es mostren com a **"pendent"**, no com a "empat".

## 6. Què no s'ha de publicar

- **`tests/`**: proves locals amb dades fictícies. No són part de la web.
- **`.claude/`**: configuració local de l'eina de desenvolupament.
- **Qualsevol full de càlcul, exportació o dada personal** (telèfons, correus, dades bancàries). La web només llegeix les columnes indicades i ignora la resta, però això no protegeix el full: una pestanya publicada com a CSV és accessible per a qualsevol persona que en tingui l'enllaç. Publica només les tres pestanyes necessàries i no hi posis dades personals. Les pestanyes que en continguin no s'han de publicar mai.

El fitxer `.gitignore` inclòs al projecte ja exclou `tests/` i `.claude/` si utilitzes Git. Si puges els fitxers a mà des del web de GitHub, simplement no hi pugis aquestes carpetes.

## Proves locals (opcional)

Per comprovar el càlcul de la classificació amb dades fictícies (requereix Node.js):

```bash
node tests/dades_empat.js
```

Per veure la web en local, cal servir-la per HTTP (no obrir `index.html` directament), per exemple:

```bash
python -m http.server 8000
```

i obrir `http://localhost:8000`.
