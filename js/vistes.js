// vistes.js — Pinta les seccions a partir de dades ja llegides.
// No llegeix fitxers ni fa peticions: rep objectes i escriu al DOM.
// Tot el text de les dades s'insereix amb textContent (mai com a HTML),
// perquè el contingut del full de càlcul no pugui injectar codi a la pàgina.

const Vistes = (function () {

  // ---- Ajudants de DOM ----------------------------------------------------

  // Crea un element amb text opcional.
  function el(etiqueta, text, classe) {
    const e = document.createElement(etiqueta);
    if (text !== undefined && text !== null) e.textContent = text;
    if (classe) e.className = classe;
    return e;
  }

  // Classe CSS del color d'un grup ("grup-1" a "grup-5"); buida si el valor no és 1-5.
  // Només s'accepten dígits 1-5 perquè el text del full mai acabi dins d'una classe.
  function classeGrup(grup) {
    const m = /^[1-5]$/.exec(String(grup === undefined || grup === null ? "" : grup).trim());
    return m ? "grup-" + m[0] : "";
  }

  // Crea una taula a partir d'unes capçaleres i unes files (arrays de text).
  // opcions (només presentació):
  //   classe        classe CSS de la taula
  //   etiquetes     true -> cada cel·la porta data-label (per mostrar-la com a targeta al mòbil)
  //   colGrup       índex de la columna "Grup": es pinta com a insígnia amb el color del grup
  //   classesFiles  array amb una classe CSS per fila (p. ex. "grup-3")
  function taula(capcaleres, files, opcions) {
    const o = opcions || {};
    const t = el("table", null, o.classe);
    const cap = el("thead");
    const filaCap = el("tr");
    capcaleres.forEach(h => filaCap.appendChild(el("th", h)));
    cap.appendChild(filaCap);
    t.appendChild(cap);
    const cos = el("tbody");
    files.forEach((f, i) => {
      const tr = el("tr", null, o.classesFiles ? o.classesFiles[i] : "");
      f.forEach((c, j) => {
        const td = el("td");
        if (o.etiquetes) td.setAttribute("data-label", capcaleres[j]);
        if (j === o.colGrup) {
          td.appendChild(el("span", c, "insignia " + classeGrup(c)));
        } else {
          td.textContent = c;
        }
        tr.appendChild(td);
      });
      cos.appendChild(tr);
    });
    t.appendChild(cos);
    return t;
  }

  function buidar(contenidor) {
    while (contenidor.firstChild) contenidor.removeChild(contenidor.firstChild);
  }

  // "2026-10-06" -> "06/10/2026". Si el format no és l'esperat, es deixa tal qual.
  function formatData(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso || "");
  }

  // Data local en format ISO (evita desfasaments de fus horari de toISOString).
  function isoLocal(d) {
    const p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  // "18:30" -> 1110 (minuts des de mitjanit). Retorna null si no es pot interpretar.
  function minuts(hhmm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || "").trim());
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
  }

  // ---- Estats generals ----------------------------------------------------

  // Missatge d'error dins d'una secció (substitueix el contingut).
  function pintarError(contenidor, missatge) {
    buidar(contenidor);
    contenidor.appendChild(el("p", "No s'han pogut carregar les dades d'aquesta secció. " + missatge, "error"));
  }

  // Avís no bloquejant afegit al final d'una secció.
  function afegirAvis(contenidor, missatge) {
    contenidor.appendChild(el("p", missatge, "avis"));
  }

  // ---- 1. Classificació ---------------------------------------------------

  // resultat: el retorn de Classificacio.calcular(); equips: per mostrar el nivell de cada grup.
  function pintarClassificacio(contenidor, resultat, equips) {
    buidar(contenidor);
    const noms = Object.keys(resultat.grups).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    if (noms.length === 0) {
      contenidor.appendChild(el("p", "Encara no hi ha cap grup."));
      return;
    }
    noms.forEach(nom => {
      const nivell = (equips.find(e => e.grup === nom) || {}).nivell;
      // Cada grup és una targeta amb el seu color
      const targeta = el("div", null, "targeta " + classeGrup(nom));
      targeta.appendChild(el("h3", `Grup ${nom}` + (nivell ? ` · Nivell ${nivell}` : "")));

      const files = resultat.grups[nom].map(f => {
        let posicio;
        if (f.pj === 0) posicio = "pendent";                 // sense cap partit jugat
        else if (f.empat) posicio = `${f.posicio} (empat)`;  // empat després de tots els criteris
        else posicio = String(f.posicio);
        return [posicio, f.parella, f.pj, f.pg, f.pp,
                `${f.setsG}-${f.setsP}`, `${f.jocsG}-${f.jocsP}`, f.punts];
      });
      const envoltori = el("div", null, "taula-scroll");
      envoltori.appendChild(
        taula(["Posició", "Parella", "PJ", "PG", "PP", "Sets", "Jocs", "Punts"], files, { classe: "classificacio" }));
      targeta.appendChild(envoltori);
      contenidor.appendChild(targeta);
    });
    // Dades que no s'han pogut interpretar (p. ex. resultat mal escrit)
    resultat.avisos.forEach(a => afegirAvis(contenidor, a));
  }

  // ---- 2. Resultats -------------------------------------------------------

  function pintarResultats(contenidor, partits) {
    buidar(contenidor);
    const jugats = partits
      .filter(p => p.estat.toLowerCase() === "jugat")
      // Data descendent; a igual data, hora descendent
      .sort((a, b) => (b.data + (b.hora || "")).localeCompare(a.data + (a.hora || "")));
    if (jugats.length === 0) {
      contenidor.appendChild(el("p", "Encara no hi ha cap partit jugat."));
      return;
    }
    contenidor.appendChild(taula(
      ["Data", "Grup", "Parella A", "Parella B", "Resultat"],
      jugats.map(p => [formatData(p.data), p.grup, p.parellaA, p.parellaB, p.resultat]),
      { classe: "en-targetes", etiquetes: true, colGrup: 1 }));
  }

  // ---- 3. Pròxims partits -------------------------------------------------

  // avui: objecte Date. Els pendents amb data anterior a avui es mostren com
  // a "pendent de resultat" (no s'amaguen).
  function pintarProxims(contenidor, partits, avui) {
    buidar(contenidor);
    const avuiISO = isoLocal(avui);
    const pendents = partits
      .filter(p => p.estat.toLowerCase() === "pendent")
      // Per data i hora; els que no tenen hora van darrere dels de la mateixa data
      .sort((a, b) => {
        if (a.data !== b.data) return a.data.localeCompare(b.data);
        if (!a.hora && !b.hora) return 0;
        if (!a.hora) return 1;
        if (!b.hora) return -1;
        return a.hora.localeCompare(b.hora);
      });
    if (pendents.length === 0) {
      contenidor.appendChild(el("p", "No hi ha cap partit pendent."));
      return;
    }
    contenidor.appendChild(taula(
      ["Data", "Hora", "Grup", "Parella A", "Parella B", "Estat"],
      pendents.map(p => [formatData(p.data), p.hora || "per confirmar", p.grup, p.parellaA, p.parellaB,
                         p.data && p.data < avuiISO ? "pendent de resultat" : "pendent"]),
      { classe: "en-targetes", etiquetes: true, colGrup: 2,
        classesFiles: pendents.map(p => classeGrup(p.grup)) }));
  }

  // ---- 4. Disponibilitat de pista ----------------------------------------

  const HORA_INICI = 9;    // primera franja: 9:00
  const HORA_FI = 22;      // última franja: 21:00-22:00
  const DIES = 7;

  // Retorna l'estat d'una franja d'una data: { text, tipus }.
  // Una reserva ocupa la franja si se'n solapa qualsevol minut.
  // Si hi ha reserva de rànquing i d'ocupada alhora, preval la de rànquing.
  function estatFranja(reserves, dataISO, horaInici) {
    const ini = horaInici * 60, fi = ini + 60;
    let ranquing = null, ocupada = false;
    reserves.forEach(r => {
      if (r.data !== dataISO) return;
      const ri = minuts(r.horaInici), rf = minuts(r.horaFi);
      if (ri === null || rf === null) return;
      if (ri < fi && rf > ini) {                        // solapament
        if ((r.tipus || "").toLowerCase().startsWith("r")) ranquing = r;
        else ocupada = true;
      }
    });
    if (ranquing) {
      return { tipus: "ranquing", text: "Partit rànquing" + (ranquing.grup ? ` · Grup ${ranquing.grup}` : "") };
    }
    if (ocupada) return { tipus: "ocupada", text: "Ocupada" };
    return { tipus: "lliure", text: "Lliure" };
  }

  // avui: objecte Date (es passa de fora perquè sigui fàcil de provar).
  function pintarDisponibilitat(contenidor, reserves, avui) {
    buidar(contenidor);
    const dies = [];
    for (let i = 0; i < DIES; i++) {
      const d = new Date(avui.getFullYear(), avui.getMonth(), avui.getDate() + i);
      dies.push({ iso: isoLocal(d), etiqueta: d });
    }

    const t = el("table", null, "graella");
    const cap = el("thead");
    const filaCap = el("tr");
    filaCap.appendChild(el("th", "Hora"));
    dies.forEach(d => {
      const dia = d.etiqueta.toLocaleDateString("ca-ES", { weekday: "short" });
      filaCap.appendChild(el("th", `${dia} ${formatData(d.iso).slice(0, 5)}`));
    });
    cap.appendChild(filaCap);
    t.appendChild(cap);

    const cos = el("tbody");
    for (let h = HORA_INICI; h < HORA_FI; h++) {
      const tr = el("tr");
      tr.appendChild(el("th", `${h}:00-${h + 1}:00`));
      dies.forEach(d => {
        const e = estatFranja(reserves, d.iso, h);
        // El text es manté (lectors de pantalla, tooltip); al mòbil s'amaga visualment
        const td = el("td", null, e.tipus);
        td.title = e.text;
        td.appendChild(el("span", e.text, "text-franja"));
        tr.appendChild(td);
      });
      cos.appendChild(tr);
    }
    t.appendChild(cos);

    // Llegenda dels colors de la graella
    const llegenda = el("ul", null, "llegenda");
    [["lliure", "Lliure"], ["ocupada", "Ocupada"], ["ranquing", "Partit rànquing"]].forEach(([tipus, text]) => {
      const li = el("li");
      li.appendChild(el("span", null, "mostra " + tipus));
      li.appendChild(document.createTextNode(text));
      llegenda.appendChild(li);
    });
    contenidor.appendChild(llegenda);

    const envoltori = el("div", null, "taula-scroll");
    envoltori.appendChild(t);
    contenidor.appendChild(envoltori);
  }

  return {
    pintarError: pintarError,
    afegirAvis: afegirAvis,
    pintarClassificacio: pintarClassificacio,
    pintarResultats: pintarResultats,
    pintarProxims: pintarProxims,
    pintarDisponibilitat: pintarDisponibilitat
  };
})();
