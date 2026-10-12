// app.js — Punt d'entrada: llegeix les dades (Dades), calcula la classificació
// (Classificacio) i pinta les seccions (Vistes). Refresca cada 5 minuts.

const INTERVAL_REFRESC_MS = 5 * 60 * 1000;

// Contenidors de cada secció
const seccions = {
  classificacio: document.querySelector("#classificacio .contingut"),
  resultats:     document.querySelector("#resultats .contingut"),
  proxims:       document.querySelector("#proxims .contingut"),
  disponibilitat: document.querySelector("#disponibilitat .contingut")
};
const capcaleraActualitzacio = document.getElementById("darrera-actualitzacio");

// Última lectura correcta de cada pestanya. Si un refresc falla, es mantenen
// les dades anteriors (amb un avís) en lloc de deixar la secció en blanc.
const ultimes = { equips: null, partits: null, reserves: null };
let horaLectura = null;    // moment de la darrera lectura en què s'han pogut llegir les tres pestanyes

// Llegeix una pestanya. Retorna { ok, error }; i desa el resultat si ha anat bé.
async function llegir(clau, funcio) {
  try {
    ultimes[clau] = await funcio();
    return { ok: true };
  } catch (e) {
    console.error(`[App] Error llegint ${clau}:`, e.message);
    return { ok: false, error: e.message };
  }
}

// Pinta una secció amb les dades disponibles. "errors" són els errors d'aquest refresc
// de les pestanyes que necessita; "necessita" són les claus d'`ultimes`.
function pintarSeccio(contenidor, necessita, errors, pintar) {
  const falta = necessita.some(c => ultimes[c] === null);
  if (falta) {
    // No hi ha mai hagut dades: missatge d'error clar
    Vistes.pintarError(contenidor, errors.join(" ") || "Les dades encara no estan disponibles.");
    return;
  }
  pintar();
  if (errors.length > 0) {
    // Hi ha dades anteriors: es mostren, però s'avisa
    Vistes.afegirAvis(contenidor, "No s'ha pogut actualitzar; es mostren les dades anteriors. " + errors.join(" "));
  }
}

function formatDataHora(d) {
  return d.toLocaleDateString("ca-ES") + " a les " +
         d.toLocaleTimeString("ca-ES", { hour: "2-digit", minute: "2-digit" });
}

async function actualitzar() {
  // Les tres lectures són independents: una que falli no afecta les altres
  const [rEquips, rPartits, rReserves] = await Promise.all([
    llegir("equips",   Dades.carregarEquips),
    llegir("partits",  Dades.carregarPartits),
    llegir("reserves", Dades.carregarReserves)
  ]);
  if (rEquips.ok && rPartits.ok && rReserves.ok) horaLectura = new Date();

  const err = (...rs) => rs.filter(r => !r.ok).map(r => r.error);

  pintarSeccio(seccions.classificacio, ["equips", "partits"], err(rEquips, rPartits), () => {
    const calcul = Classificacio.calcular(ultimes.equips, ultimes.partits);
    Vistes.pintarClassificacio(seccions.classificacio, calcul, ultimes.equips);
  });
  pintarSeccio(seccions.resultats, ["partits"], err(rPartits), () =>
    Vistes.pintarResultats(seccions.resultats, ultimes.partits));
  pintarSeccio(seccions.proxims, ["partits"], err(rPartits), () =>
    Vistes.pintarProxims(seccions.proxims, ultimes.partits, new Date()));
  pintarSeccio(seccions.disponibilitat, ["reserves"], err(rReserves), () =>
    Vistes.pintarDisponibilitat(seccions.disponibilitat, ultimes.reserves, new Date()));

  capcaleraActualitzacio.textContent = horaLectura
    ? "Dades llegides el " + formatDataHora(horaLectura)
    : "Dades no disponibles";
}

actualitzar();                                      // en carregar la pàgina
setInterval(actualitzar, INTERVAL_REFRESC_MS);      // i cada 5 minuts
