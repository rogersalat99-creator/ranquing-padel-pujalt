// classificacio.js — Càlcul de la classificació a partir dels partits jugats.
// No llegeix fitxers ni toca la pàgina: rep dades (equips i partits) i retorna dades.
//
// FORMAT DEL CAMP "Resultat"
//   Normal:        "6-4 6-2"      (cada parell és un set, des del punt de vista de Parella A)
//   Abandonament:  "6-4 2-1 ab B" (la lletra indica QUI abandona: A o B)
//   Es considera set en joc el darrer parell abans de "ab": els seus jocs
//   compten, però no s'atorga el set a ningú.
//
// PUNTS: victòria 3, derrota 1, abandonament 0 (per a qui abandona).
// DESEMPAT (en aquest ordre): resultat directe, diferència de sets, diferència de jocs.

const Classificacio = (function () {

  const PUNTS_VICTORIA = 3;
  const PUNTS_DERROTA = 1;
  const PUNTS_ABANDONAMENT = 0;

  // Interpreta el text d'un resultat.
  // Retorna { sets: [{a, b, enJoc}], abandona: "A" | "B" | null } o null si no es pot interpretar.
  function parsejarResultat(text) {
    if (!text) return null;
    // "ab", "ab.", "abandona", "abandonament" seguit de A o B
    const reAb = /\b(?:ab|abandona(?:ment)?)\.?[\s:\-]*([AB])\b/i;
    const ab = text.match(reAb);
    const textSets = ab ? text.slice(0, ab.index) : text;

    const sets = [];
    const reSet = /(\d+)\s*[-–]\s*(\d+)/g;
    let m;
    while ((m = reSet.exec(textSets)) !== null) {
      sets.push({ a: parseInt(m[1], 10), b: parseInt(m[2], 10), enJoc: false });
    }
    if (ab && sets.length > 0) sets[sets.length - 1].enJoc = true;   // set interromput

    if (!ab && sets.length === 0) return null;
    // Hi ha el marcador "ab" però sense indicar qui abandona: no es pot interpretar
    if (!ab && /\bab/i.test(text)) return null;
    return { sets: sets, abandona: ab ? ab[1].toUpperCase() : null };
  }

  // Converteix un partit en un resultat "net": guanyador, punts i sets/jocs de cada costat.
  // Retorna null (i el motiu a "avisos") si el partit no es pot comptar.
  function avaluarPartit(partit, avisos) {
    const descripcio = `${partit.parellaA} - ${partit.parellaB} (${partit.data})`;
    const r = parsejarResultat(partit.resultat);
    if (!r) {
      avisos.push(`Partit ignorat: resultat no interpretable "${partit.resultat}" a ${descripcio}.`);
      return null;
    }

    let setsA = 0, setsB = 0, jocsA = 0, jocsB = 0;
    for (const s of r.sets) {
      jocsA += s.a; jocsB += s.b;
      if (s.enJoc) continue;                 // set interromput: no s'atorga
      if (s.a > s.b) setsA++; else if (s.b > s.a) setsB++;
    }

    let guanyador, puntsA, puntsB;
    if (r.abandona) {
      guanyador = r.abandona === "A" ? "B" : "A";
      puntsA = r.abandona === "A" ? PUNTS_ABANDONAMENT : PUNTS_VICTORIA;
      puntsB = r.abandona === "B" ? PUNTS_ABANDONAMENT : PUNTS_VICTORIA;
    } else {
      if (setsA === setsB) {
        avisos.push(`Partit ignorat: no hi ha guanyador clar a ${descripcio}.`);
        return null;
      }
      guanyador = setsA > setsB ? "A" : "B";
      puntsA = guanyador === "A" ? PUNTS_VICTORIA : PUNTS_DERROTA;
      puntsB = guanyador === "B" ? PUNTS_VICTORIA : PUNTS_DERROTA;
    }
    return {
      a: partit.parellaA, b: partit.parellaB, guanyador: guanyador,
      puntsA: puntsA, puntsB: puntsB,
      setsA: setsA, setsB: setsB, jocsA: jocsA, jocsB: jocsB
    };
  }

  function novaFila(parella) {
    return {
      parella: parella, pj: 0, pg: 0, pp: 0,
      setsG: 0, setsP: 0, jocsG: 0, jocsP: 0, punts: 0,
      posicio: 0, empat: false,
      decisio: "punts"      // regla que ha decidit la posició (informatiu, per a proves)
    };
  }

  // Criteris de desempat. "clau" retorna un número: com més alt, millor.
  // "grup" són les files empatades, perquè el resultat directe només mira
  // els partits entre elles.
  const CRITERIS = [
    {
      nom: "resultat directe",
      clau: function (fila, grup, partits) {
        const noms = new Set(grup.map(f => f.parella));
        let punts = 0;
        for (const p of partits) {
          if (!noms.has(p.a) || !noms.has(p.b)) continue;
          if (p.a === fila.parella) punts += p.puntsA;
          else if (p.b === fila.parella) punts += p.puntsB;
        }
        return punts;
      }
    },
    { nom: "diferència de sets", clau: f => f.setsG - f.setsP },
    { nom: "diferència de jocs", clau: f => f.jocsG - f.jocsP }
  ];

  // Agrupa files per valor de clau i retorna els subgrups de millor a pitjor.
  function dividir(files, fnClau) {
    const mapa = new Map();
    for (const f of files) {
      const k = fnClau(f);
      if (!mapa.has(k)) mapa.set(k, []);
      mapa.get(k).push(f);
    }
    return [...mapa.keys()].sort((x, y) => y - x).map(k => mapa.get(k));
  }

  // Ordena un bloc de files empatades a punts. Retorna una llista de "blocs" ordenats;
  // un bloc amb més d'una fila vol dir empat total (cap criteri les separa).
  // Quan un criteri trenca un empat de 3+ i en queden de 2+, es torna a començar
  // pel primer criteri només entre les que continuen empatades.
  function desempatar(grup, partits, k) {
    if (grup.length === 1) return [grup];
    if (k >= CRITERIS.length) {
      grup.forEach(f => { f.decisio = "empat"; f.empat = true; });
      return [grup];
    }
    const criteri = CRITERIS[k];
    const subgrups = dividir(grup, f => criteri.clau(f, grup, partits));
    if (subgrups.length === 1) return desempatar(grup, partits, k + 1);   // no separa ningú

    grup.forEach(f => { f.decisio = criteri.nom; });
    const resultat = [];
    for (const sub of subgrups) {
      resultat.push(...desempatar(sub, partits, 0));
    }
    return resultat;
  }

  // Calcula la classificació de tots els grups.
  //   equips:  array d'objectes de Dades.carregarEquips()
  //   partits: array d'objectes de Dades.carregarPartits()
  // Retorna { grups: { "1": [files ordenades], ... }, avisos: [text, ...] }
  function calcular(equips, partits) {
    const avisos = [];
    const grups = {};     // grup -> { files: {parella -> fila}, partits: [] }

    function assegurar(grup, parella) {
      if (!grups[grup]) grups[grup] = { files: {}, partits: [] };
      if (!grups[grup].files[parella]) grups[grup].files[parella] = novaFila(parella);
      return grups[grup].files[parella];
    }

    // Totes les parelles apareixen a la classificació, encara que no hagin jugat
    for (const e of equips) assegurar(e.grup, e.parella);

    // Només els partits amb estat "jugat" compten
    for (const p of partits) {
      if (p.estat.toLowerCase() !== "jugat") continue;
      const net = avaluarPartit(p, avisos);
      if (!net) continue;

      const fa = assegurar(p.grup, p.parellaA);
      const fb = assegurar(p.grup, p.parellaB);
      grups[p.grup].partits.push(net);

      fa.pj++; fb.pj++;
      fa.punts += net.puntsA; fb.punts += net.puntsB;
      fa.setsG += net.setsA; fa.setsP += net.setsB;
      fb.setsG += net.setsB; fb.setsP += net.setsA;
      fa.jocsG += net.jocsA; fa.jocsP += net.jocsB;
      fb.jocsG += net.jocsB; fb.jocsP += net.jocsA;
      if (net.guanyador === "A") { fa.pg++; fb.pp++; } else { fb.pg++; fa.pp++; }
    }

    const sortida = {};
    for (const nomGrup of Object.keys(grups)) {
      const g = grups[nomGrup];
      const files = Object.values(g.files);
      const perPunts = dividir(files, f => f.punts);

      const ordenades = [];
      let posicio = 1;
      for (const bloc of perPunts) {
        for (const subbloc of desempatar(bloc, g.partits, 0)) {
          // Les files d'un empat total comparteixen posició (1, 1, 3...)
          // L'ordre intern és alfabètic només perquè la pantalla sigui estable.
          subbloc.sort((x, y) => x.parella.localeCompare(y.parella, "ca"));
          subbloc.forEach(f => { f.posicio = posicio; ordenades.push(f); });
          posicio += subbloc.length;
        }
      }
      sortida[nomGrup] = ordenades;
    }
    return { grups: sortida, avisos: avisos };
  }

  return {
    calcular: calcular,
    _parsejarResultat: parsejarResultat    // exposat per a proves
  };
})();

// Permet carregar-lo des de Node per als tests (al navegador no existeix "module").
if (typeof module !== "undefined") module.exports = Classificacio;
