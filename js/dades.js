// dades.js — Lectura de dades des dels CSV publicats. No té res de visual.
// Per canviar la font de dades en el futur (API, JSON, etc.) només cal tocar aquest fitxer:
// la resta de la web només utilitza les tres funcions de l'objecte Dades.

const Dades = (function () {

  // Columnes que acceptem de cada pestanya (llista blanca).
  // Qualsevol altra columna del full (telèfons, correus...) s'ignora i mai arriba a la web.
  // Format: nom de la capçalera al CSV -> nom del camp a l'objecte JavaScript.
  const COLUMNES_EQUIPS = {
    "Grup": "grup", "Nivell": "nivell", "Parella": "parella",
    "Jugador 1": "jugador1", "Jugador 2": "jugador2"
  };
  const COLUMNES_PARTITS = {
    "Fase": "fase", "Grup": "grup", "Parella A": "parellaA", "Parella B": "parellaB",
    "Data": "data", "Hora": "hora", "Resultat": "resultat", "Estat": "estat"
  };
  const COLUMNES_RESERVES = {
    "Data": "data", "Hora inici": "horaInici", "Hora fi": "horaFi",
    "Tipus": "tipus", "Grup": "grup"
  };

  // Converteix text CSV en una matriu de files i cel·les.
  // Gestiona cometes, comes i salts de línia dins de cometes, i el BOM inicial.
  function parsejarCSV(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const files = [];
    let fila = [], cel = "", dinsCometes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (dinsCometes) {
        if (c === '"' && text[i + 1] === '"') { cel += '"'; i++; }   // cometa escapada
        else if (c === '"') dinsCometes = false;
        else cel += c;
      } else if (c === '"') dinsCometes = true;
      else if (c === ",") { fila.push(cel); cel = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        fila.push(cel); cel = "";
        files.push(fila); fila = [];
      } else cel += c;
    }
    if (cel !== "" || fila.length > 0) { fila.push(cel); files.push(fila); }
    return files;
  }

  // Converteix la matriu en objectes, quedant-se només amb les columnes de la llista blanca.
  // Llança un error si falta alguna columna esperada.
  function aObjectes(files, columnes, nomPestanya) {
    if (files.length === 0) throw new Error(`La pestanya ${nomPestanya} és buida.`);
    const capcalera = files[0].map(h => h.trim());
    const index = {};
    for (const nom of Object.keys(columnes)) {
      const pos = capcalera.indexOf(nom);
      if (pos === -1) {
        throw new Error(`A la pestanya ${nomPestanya} falta la columna "${nom}".`);
      }
      index[columnes[nom]] = pos;
    }
    return files.slice(1)
      .filter(f => f.some(c => c.trim() !== ""))           // ignora files totalment buides
      .map(f => {
        const obj = {};
        for (const camp of Object.keys(index)) obj[camp] = (f[index[camp]] || "").trim();
        return obj;
      });
  }

  // Descarrega un CSV i el retorna com a text. Llança errors amb missatge clar.
  async function descarregar(url, nomPestanya) {
    if (!url || !url.startsWith("http")) {
      throw new Error(`No hi ha URL configurada per a la pestanya ${nomPestanya} (js/config.js).`);
    }
    let resposta;
    try {
      // Afegim un paràmetre per evitar que el navegador serveixi una còpia antiga
      const sep = url.includes("?") ? "&" : "?";
      resposta = await fetch(url + sep + "_=" + Date.now(), { cache: "no-store" });
    } catch (e) {
      throw new Error(`No s'ha pogut connectar per llegir ${nomPestanya} (xarxa o CORS): ${e.message}`);
    }
    if (!resposta.ok) {
      throw new Error(`La pestanya ${nomPestanya} ha respost amb error HTTP ${resposta.status}.`);
    }
    return resposta.text();
  }

  async function llegir(url, columnes, nomPestanya) {
    const text = await descarregar(url, nomPestanya);
    const dades = aObjectes(parsejarCSV(text), columnes, nomPestanya);
    console.log(`[Dades] ${nomPestanya}: ${dades.length} files llegides`, dades);
    return dades;
  }

  return {
    // Cada funció retorna una promesa amb un array d'objectes.
    carregarEquips:   () => llegir(CONFIG.urlEquips,   COLUMNES_EQUIPS,   "Equips"),
    carregarPartits:  () => llegir(CONFIG.urlPartits,  COLUMNES_PARTITS,  "Partits"),
    carregarReserves: () => llegir(CONFIG.urlReserves, COLUMNES_RESERVES, "Reserves"),
    // Exposat només per poder fer proves
    _parsejarCSV: parsejarCSV
  };
})();
