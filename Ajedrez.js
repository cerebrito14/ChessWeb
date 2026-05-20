(function () {
  'use strict';

  const GLYPH = {
    wp:'♙', wr:'♖', wn:'♘', wb:'♗', wq:'♕', wk:'♔',
    bp:'♟', br:'♜', bn:'♞', bb:'♝', bq:'♛', bk:'♚'
  };
  const FILES = ['a','b','c','d','e','f','g','h'];
  const PIECE_VAL = { p:1, n:3, b:3.2, r:5, q:9, k:0 };
  const CENTER_BONUS = [
    [0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],
    [0,0,1,1,1,1,0,0],[0,0,1,3,3,1,0,0],
    [0,0,1,3,3,1,0,0],[0,0,1,1,1,1,0,0],
    [0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0]
  ];

  function pc(p) { return p ? p[0] : null; }
  function pt(p) { return p ? p[1] : null; }
  function inB(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

  function rawMoves(r, c, brd, atk) {
    const p = brd[r][c]; if (!p) return [];
    const col = pc(p), opp = col === 'w' ? 'b' : 'w', typ = pt(p);
    let mv = [];
    const slide = dirs => {
      for (const [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc;
        while (inB(nr, nc)) {
          if (!brd[nr][nc]) mv.push([nr, nc]);
          else { if (pc(brd[nr][nc]) === opp) mv.push([nr, nc]); break; }
          nr += dr; nc += dc;
        }
      }
    };
    if (typ === 'p') {
      const d = col === 'w' ? -1 : 1, sr = col === 'w' ? 6 : 1;
      if (!atk) {
        if (inB(r+d, c) && !brd[r+d][c]) {
          mv.push([r+d, c]);
          if (r === sr && !brd[r+2*d][c]) mv.push([r+2*d, c]);
        }
      }
      for (const dc of [-1, 1])
        if (inB(r+d, c+dc))
          if (atk || (brd[r+d][c+dc] && pc(brd[r+d][c+dc]) === opp))
            mv.push([r+d, c+dc]);
    } else if (typ === 'n') {
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const nr = r+dr, nc = c+dc;
        if (inB(nr, nc) && pc(brd[nr][nc]) !== col) mv.push([nr, nc]);
      }
    } else if (typ === 'b') slide([[-1,-1],[-1,1],[1,-1],[1,1]]);
    else if (typ === 'r') slide([[-1,0],[1,0],[0,-1],[0,1]]);
    else if (typ === 'q') slide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
    else if (typ === 'k') {
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        const nr = r+dr, nc = c+dc;
        if (inB(nr, nc) && pc(brd[nr][nc]) !== col) mv.push([nr, nc]);
      }
    }
    return mv;
  }

  function isAttacked(r, c, by, brd) {
    for (let rr = 0; rr < 8; rr++)
      for (let cc = 0; cc < 8; cc++) {
        const p = brd[rr][cc];
        if (p && pc(p) === by && rawMoves(rr, cc, brd, true).some(m => m[0]===r && m[1]===c))
          return true;
      }
    return false;
  }

  function findKing(col, brd) {
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (brd[r][c] === col + 'k') return [r, c];
    return null;
  }

  function inCheck(col, brd) {
    const k = findKing(col, brd);
    return k && isAttacked(k[0], k[1], col === 'w' ? 'b' : 'w', brd);
  }

  function legalMoves(r, c, brd) {
    const p = brd[r][c]; if (!p) return [];
    const col = pc(p), opp = col === 'w' ? 'b' : 'w';
    return rawMoves(r, c, brd).filter(([nr, nc]) => {
      const cp = brd.map(row => [...row]);
      cp[nr][nc] = cp[r][c]; cp[r][c] = null;
      const k = findKing(col, cp);
      return k && !isAttacked(k[0], k[1], opp, cp);
    });
  }

  function allLegal(col, brd) {
    const all = [];
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (pc(brd[r][c]) === col)
          legalMoves(r, c, brd).forEach(m => all.push({ from: [r, c], to: m }));
    return all;
  }

  function applyMove(from, to, brd, promo) {
    const cp = brd.map(row => [...row]);
    let p = cp[from[0]][from[1]];
    if (pt(p) === 'p' && ((pc(p) === 'w' && to[0] === 0) || (pc(p) === 'b' && to[0] === 7)))
      p = pc(p) + (promo || 'q');
    cp[to[0]][to[1]] = p; cp[from[0]][from[1]] = null;
    return cp;
  }

  function moveAN(from, to, brd) {
    const p = brd[from[0]][from[1]]; if (!p) return '';
    const typ = pt(p), cap = brd[to[0]][to[1]] ? 'x' : '', dest = FILES[to[1]] + (8 - to[0]);
    const nm = { p:'', n:'N', b:'B', r:'R', q:'Q', k:'K' };
    let an = nm[typ]; if (typ === 'p' && cap) an = FILES[from[1]];
    return an + cap + dest;
  }

  function needsPromo(from, to, brd) {
    const p = brd[from[0]][from[1]];
    return pt(p) === 'p' && ((pc(p) === 'w' && to[0] === 0) || (pc(p) === 'b' && to[0] === 7));
  }

  function evalBoard(brd) {
    let s = 0;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = brd[r][c]; if (!p) continue;
        const v = PIECE_VAL[pt(p)] + CENTER_BONUS[r][c] * 0.1;
        s += pc(p) === 'b' ? v : -v;
      }
    return s;
  }

  function minimax(brd, depth, alpha, beta, max) {
    const col = max ? 'b' : 'w';
    const mv = allLegal(col, brd);
    if (!depth || !mv.length) return { s: evalBoard(brd) };
    if (depth === 1) mv.sort(() => Math.random() - 0.5);
    let best = max ? -Infinity : Infinity, bm = null;
    for (const m of mv) {
      const nb = applyMove(m.from, m.to, brd);
      const res = minimax(nb, depth - 1, alpha, beta, !max);
      if (max ? res.s > best : res.s < best) { best = res.s; bm = m; }
      if (max) alpha = Math.max(alpha, best); else beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return { s: best, m: bm };
  }

  function makeInitBoard() {
    const bk = ['r','n','b','q','k','b','n','r'];
    const bd = [];
    for (let r = 0; r < 8; r++) {
      bd.push([]);
      for (let c = 0; c < 8; c++) {
        if      (r === 0) bd[r].push('b' + bk[c]);
        else if (r === 1) bd[r].push('bp');
        else if (r === 6) bd[r].push('wp');
        else if (r === 7) bd[r].push('w' + bk[c]);
        else              bd[r].push(null);
      }
    }
    return bd;
  }


  function showPromoModal(col) {
    return new Promise(resolve => {
      const types = ['q','r','b','n'];
      const glW = ['♕','♖','♗','♘'], glB = ['♛','♜','♝','♞'];
      const box = document.getElementById('promo-pieces');
      box.innerHTML = '';
      types.forEach((tp, i) => {
        const btn = document.createElement('div');
        btn.className = 'promo-piece';
        btn.textContent = col === 'w' ? glW[i] : glB[i];
        btn.onclick = () => {
          document.getElementById('promo-overlay').classList.remove('show');
          resolve(tp);
        };
        box.appendChild(btn);
      });
      document.getElementById('promo-overlay').classList.add('show');
    });
  }

  function renderBoard(boardEl, rankEl, fileEl, brd, sel, lastMove, turn, flipped) {
    const rows = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
    const cols = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
    const poss = sel ? legalMoves(sel[0], sel[1], brd) : [];
    let h = '';
    for (const r of rows) for (const c of cols) {
      const lt = (r + c) % 2 === 0;
      let cls = 'sq ' + (lt ? 'light' : 'dark');
      if (sel && sel[0] === r && sel[1] === c) cls += ' selected';
      const ip = poss.some(m => m[0] === r && m[1] === c);
      if (ip && brd[r][c] && pc(brd[r][c]) !== turn) cls += ' capture-hint';
      else if (ip) cls += ' possible';
      if (lastMove) {
        if (lastMove.from[0] === r && lastMove.from[1] === c) cls += ' last-from';
        if (lastMove.to[0]   === r && lastMove.to[1]   === c) cls += ' last-to';
      }
      if (inCheck(turn, brd) && brd[r][c] === turn + 'k') cls += ' king-check';
      const p = brd[r][c];
      h += `<div class="${cls}" data-r="${r}" data-c="${c}">${p ? `<span class="piece">${GLYPH[p] || ''}</span>` : ''}</div>`;
    }
    boardEl.innerHTML = h;
    rankEl.innerHTML  = rows.map(r => `<span>${flipped ? r + 1 : 8 - r}</span>`).join('');
    fileEl.innerHTML  = cols.map(c => `<span>${FILES[c]}</span>`).join('');
  }

  function renderMoves(listEl, hist) {
    listEl.innerHTML = hist.map(m =>
      `<div class="move-row"><span class="mn">${m.num}.</span><span class="mw">${m.w}</span><span class="mb">${m.b}</span></div>`
    ).join('');
    listEl.scrollTop = listEl.scrollHeight;
  }

  const MB_BASE = [
    ['br','bn','bb','bq','bk','bb','bn','br'],
    ['bp','bp','bp','bp','bp','bp','bp','bp'],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ['wp','wp','wp','wp','wp','wp','wp','wp'],
    ['wr','wn','wb','wq','wk','wb','wn','wr']
  ];
  function buildMiniBoard(id, highlights) {
    const el = document.getElementById(id); if (!el) return;
    highlights = highlights || {};
    let h = '';
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const lt = (r + c) % 2 === 0, k = `${r},${c}`;
      const bg = highlights[k] || (lt ? '#E8D9C0' : '#8B6340');
      const p  = MB_BASE[r][c];
      h += `<span style="background:${bg};font-size:.88rem">${p ? GLYPH[p] : ''}</span>`;
    }
    el.innerHTML = h;
  }

  const i18n = {
    es: {
      nav1:'Informacion', nav2:'vs IA', nav3:'Multijugador',
      heroOver:'El juego de los reyes', heroStrong:'Web',
      heroDesc:'Un tablero. Dos rivales. Posibilidades infinitas. El juego mas antiguo del mundo, redescubierto.',
      heroB1:'Jugar vs IA', heroB2:'Multijugador',
      h1Over:'Capitulo I', h1Title:'Historia y <em>Origen</em>',
      hP1:'El ajedrez nacio en <b>India</b> alrededor del siglo VI d.C. bajo el nombre de <em>Chaturanga</em>, que significa las cuatro divisiones del ejercito.',
      hP2:'Desde India viajo a <b>Persia</b> como <em>Shatranj</em>. El termino jaque mate proviene del persa <em>shah mat</em>: <b>el rey ha muerto</b>.',
      hP3:'Con la expansion del <b>Imperio Arabe</b> en el siglo VII el juego llego a <b>Europa</b>. El consejero se convirtio en la poderosa <b>reina</b> medieval.',
      hP4:'En 1851 el <b>primer torneo internacional</b> se celebro en Londres. Hoy hay mas de <b>600 millones</b> de jugadores activos.',
      t1e:'Chaturanga, India',    t1d:'Primeras referencias en textos sanskritos.',
      t2e:'Shatranj, Persia',     t2d:'El rey Cosroes I recibe el juego. Nace el Shatranj moderno.',
      t3e:'Expansion arabe',      t3d:'El califato lleva el juego a Espana y Asia Central.',
      t4e:'Ajedrez moderno',      t4d:'En Espana la reina se convierte en la pieza mas poderosa.',
      t5e:'1er Campeonato Mundial',t5d:'Steinitz vence a Zukertort. Primer campeon oficial.',
      t6e:'Deep Blue vs Kasparov', t6d:'Primera computadora que derrota al campeon mundial.',
      t7e:'Era Carlsen',           t7d:'Magnus Carlsen: ELO mas alto de la historia, 2882.',
      c1Over:'Capitulo II', c1Title:'Datos <em>Curiosos</em>',
      cn1:'01 — Matematicas', cn2:'02 — Leyenda', cn3:'03 — Deporte',
      cn4:'04 — Record',      cn5:'05 — Historia', cn6:'06 — Literatura',
      ct1:'Mas posibilidades que atomos',
      cd1:'El numero de partidas posibles supera el <b>numero de atomos del universo</b>. Tras el movimiento 40 existen mas de 10^120 posiciones.',
      ct2:'La recompensa del inventor',
      cd2:'El inventor pidio un grano de trigo en la primera casilla y el doble en cada siguiente. El total superaria <b>miles de anos de produccion mundial</b>.',
      ct3:'6000 calorias por dia',
      cd3:'El COI reconoce el ajedrez como deporte. Los grandes maestros pueden quemar hasta <b>6000 calorias</b> en torneo.',
      ct4:'El mate mas rapido',
      cd4:'El mate del loco ocurre en <b>2 movimientos</b>. El Mate del Pastor se ejecuta en 4 jugadas.',
      ct5:'Reyes y emperadores',
      cd5:'Carlomagno, Napoleon y Catalina la Grande fueron <b>jugadores apasionados</b>. El ajedrez simbolizo poder durante siglos.',
      ct6:'El libro mas antiguo',
      cd6:'<em>Repeticion de Amores y Arte de Ajedrez</em> (1497) de Luis Ramirez de Lucena. <b>Sus ideas siguen siendo validas hoy.</b>',
      h2Over:'Capitulo III', h2Title:'Como <em>Jugar</em>',
      howIntro:'El objetivo es dar jaque mate al rey enemigo. Dos jugadores, 16 piezas cada uno, 64 casillas.',
      pk:'Rey',    pkd:'Una casilla en cualquier direccion.',
      pq:'Reina',  pqd:'La mas poderosa. Linea recta o diagonal.',
      pr:'Torre',  prd:'Horizontal o vertical sin limite.',
      pb:'Alfil',  pbd:'Diagonal. Siempre en el mismo color.',
      pn:'Caballo',pnd:'Movimiento en L. Salta sobre otras piezas.',
      pp:'Peon',   ppd:'Avanza uno o dos casillas. Puede promover.',
      r1:'<b>Las blancas mueven primero.</b> Los jugadores alternan turnos.',
      r2:'<b>Jaque:</b> El rey esta amenazado y debe resolverse en ese turno.',
      r3:'<b>Jaque Mate:</b> El rey en jaque sin escape. Fin de la partida.',
      r4:'<b>Enroque:</b> El rey se mueve dos casillas y la torre salta al otro lado.',
      r5:'<b>En passant:</b> Captura diagonal de un peon que avanzo dos casillas.',
      r6:'<b>Tablas:</b> Ahogado, triple repeticion, 50 movimientos, o acuerdo.',
      h3Over:'Capitulo IV', h3Title:'Aperturas <em>Principales</em>',
      apIntro:'Los primeros movimientos definen el caracter de la partida. Una buena apertura controla el centro, desarrolla piezas y protege al rey.',
      bW:'Blancas', bB:'Negras', bW2:'Blancas', bB2:'Negras', bB3:'Negras', bB4:'Negras',
      ap1n:'Ruy Lopez',           ap1r:'Nivel avanzado',
      ap1d:'Conocida como Apertura Espanola. El alfil en b5 presiona el peon en e5. Favorita de Fischer, Karpov y Kasparov.',
      ap2n:'Defensa Siciliana',   ap2r:'La mas jugada del mundo',
      ap2d:'Con c5 las negras luchan asimetricamente. Variantes: Dragon, Najdorf y Scheveningen.',
      ap3n:'Apertura Italiana',   ap3r:'Ideal para principiantes',
      ap3d:'Documentada en el siglo XV. El alfil en c4 apunta al debil f7. Excelente para aprender principios basicos.',
      ap4n:'Defensa Francesa',    ap4r:'Solida y contrariante',
      ap4d:'Cadena de peones solida con contraataques en el flanco de la dama. Ideal para posiciones estrategicas.',
      ap5n:'Caro-Kann',           ap5r:'Solida y posicional',
      ap5d:'Estructura limpia sin alfil malo. Favorita de Karpov, Anand y Carlsen.',
      ap6n:'India de Rey',        ap6r:'Hipermoderna y dinamica',
      ap6d:'Las negras permiten que el rival ocupe el centro para atacarlo desde los flancos con el alfil en g7.',
      h4Over:'Capitulo V', h4Title:'Consejos de <em>Juego</em>',
      cs1c:'Apertura',    cs1t:'Controla el Centro',        cs1d:'Las casillas centrales son el corazon del tablero. Ocupalas desde el primer movimiento.',
      cs2c:'Apertura',    cs2t:'Desarrolla Tus Piezas',     cs2d:'Saca caballos y alfiles antes que la reina o torres. No muevas la misma pieza dos veces.',
      cs3c:'Apertura',    cs3t:'Enroca Pronto',              cs3d:'El enroque protege al rey y conecta las torres. Hazlo antes del decimo movimiento.',
      cs4c:'Medio Juego', cs4t:'Piensa Antes de Mover',     cs4d:'Preguntate si dejas piezas sin defensa o creas debilidades. El jugador reflexivo comete menos errores.',
      cs5c:'Tactica',     cs5t:'Practica Tacticas Diarias',  cs5d:'Horquillas, clavadas y ataques descubiertos son la via directa para obtener ventaja.',
      cs6c:'Final',       cs6t:'Activa Tu Rey',              cs6d:'En el final el rey se convierte en una pieza activa. Llevalo al centro.',
      cs7c:'Estrategia',  cs7t:'Evita Peones Debiles',       cs7d:'Los peones doblados y aislados son debilidades permanentes dificiles de defender.',
      cs8c:'Mental',      cs8t:'Calma Tras los Errores',     cs8d:'Todos los grandes maestros cometen errores. Lo que los distingue es no derrumbarse.',
      cs9c:'Aprendizaje', cs9t:'Analiza Tus Partidas',       cs9d:'Revisa tus partidas con un motor de analisis. Identificar el error es la clave del aprendizaje.',
      credLabel:'Desarrollado por',
      lblStatus:'Estado', lblDiff:'Dificultad', lblScore:'Marcador',
      lblActions:'Acciones', lblMoves:'Historial', lblTimer:'Reloj',
      d1:'Facil', d2:'Medio', d3:'Dificil',
      sW:'Blancas', sB:'Negras', sAI:'IA Negras',
      btnNew:'Nueva Partida', btnUndo:'Deshacer', btnFlip:'Voltear Tablero',
      btnDraw:'Ofrecer Tablas', btnResign:'Rendirse',
      promoLbl:'Promocion — Elige pieza',
      initMsgBot:'Mueve una pieza blanca para comenzar.',
      initMsgMulti:'Blancas inician. Mueve una pieza.',
      turnW:'Turno — Blancas', turnB:'Turno — IA (Negras)',
      turnWM:'Turno — Blancas', turnBM:'Turno — Negras',
      msgCheck:'Jaque al rey',
      msgMateW:'Jaque Mate — Blancas ganan',
      msgMateB:'Jaque Mate — IA gana',
      msgMateName:' gana por jaque mate',
      msgDraw:'Tablas — Ahogado',
      msgThink:'IA calculando...',
      msgMove:'Tu turno — mueve una pieza blanca',
      msgUndo:'Movimiento deshecho',
      msgResign:' se rindio.',
      msgTimeUp:'Tiempo agotado',
      drawAsk:'Aceptar tablas?',
      drawDone:'Tablas acordadas',
      winBtn:'Nueva Partida',
      botLabel:'Modo de juego', botH1:'Inteligencia <em>Artificial</em>',
      botDesc:'Tu juegas con las piezas blancas. La IA responde con las negras. Selecciona el nivel de dificultad.',
      multiLabel:'Modo de juego', multiH1:'Multijugador <em>Local</em>',
      multiDesc:'Dos jugadores en el mismo dispositivo. Edita los nombres y elige el tiempo.',
      tOff:'Sin reloj', t3:'3 min', t5:'5 min', t10:'10 min',
      pW:'Blancas', pB:'Negras',
    },
    en: {
      nav1:'Information', nav2:'vs AI', nav3:'Multiplayer',
      heroOver:'The game of kings', heroStrong:'Web',
      heroDesc:'One board. Two rivals. Infinite possibilities. The oldest game in the world, rediscovered.',
      heroB1:'Play vs AI', heroB2:'Multiplayer',
      h1Over:'Chapter I', h1Title:'History and <em>Origins</em>',
      hP1:'Chess was born in <b>India</b> around the 6th century AD under the name <em>Chaturanga</em>, meaning the four divisions of the army.',
      hP2:'From India it traveled to <b>Persia</b> as <em>Shatranj</em>. Checkmate comes from the Persian <em>shah mat</em>: <b>the king is dead</b>.',
      hP3:'With the expansion of the <b>Arab Empire</b> it reached <b>Europe</b>. The advisor piece became the powerful medieval <b>queen</b>.',
      hP4:'In 1851 the <b>first international tournament</b> was held in London. Today there are over <b>600 million</b> active players.',
      t1e:'Chaturanga, India',      t1d:'Earliest written references in Sanskrit texts.',
      t2e:'Shatranj, Persia',       t2d:'King Khosrow I receives the game. Modern Shatranj is born.',
      t3e:'Arab expansion',         t3d:'The caliphate brings the game to Spain and Central Asia.',
      t4e:'Modern chess',           t4d:'In Spain the queen becomes the most powerful piece.',
      t5e:'1st World Championship', t5d:'Steinitz defeats Zukertort. First official champion.',
      t6e:'Deep Blue vs Kasparov',  t6d:'First computer to defeat the reigning world champion.',
      t7e:'The Carlsen era',         t7d:'Magnus Carlsen: highest ELO in history, 2882.',
      c1Over:'Chapter II', c1Title:'Fun <em>Facts</em>',
      cn1:'01 — Mathematics', cn2:'02 — Legend', cn3:'03 — Sport',
      cn4:'04 — Record',      cn5:'05 — History', cn6:'06 — Literature',
      ct1:'More possibilities than atoms',
      cd1:'The number of possible games exceeds the <b>number of atoms in the universe</b>. After move 40 there are over 10^120 unique positions.',
      ct2:"The inventor's reward",
      cd2:'The inventor asked for one grain of wheat on the first square, doubling each square. The total would surpass <b>thousands of years of world production</b>.',
      ct3:'6000 calories per day',
      cd3:'The IOC recognizes chess as a sport. Grandmasters can burn up to <b>6000 calories</b> per day at tournament.',
      ct4:'The fastest checkmate',
      cd4:"The Fool's Mate occurs in <b>2 moves</b>. The Scholar's Mate can be executed in 4 moves.",
      ct5:'Kings and emperors',
      cd5:'Charlemagne, Napoleon and Catherine the Great were <b>passionate players</b>. Chess symbolized power for centuries.',
      ct6:'The oldest book',
      cd6:'<em>Repeticion de Amores y Arte de Ajedrez</em> (1497) by Luis Ramirez de Lucena. <b>Its ideas remain valid today.</b>',
      h2Over:'Chapter III', h2Title:'How to <em>Play</em>',
      howIntro:'The goal is to checkmate the enemy king. Two players, 16 pieces each, 64 squares.',
      pk:'King',   pkd:'One square in any direction.',
      pq:'Queen',  pqd:'The most powerful. Straight line or diagonal.',
      pr:'Rook',   prd:'Horizontal or vertical without limit.',
      pb:'Bishop', pbd:'Diagonal. Always on the same color.',
      pn:'Knight', pnd:'L-shaped move. Jumps over other pieces.',
      pp:'Pawn',   ppd:'Advances one or two squares. Can promote.',
      r1:'<b>White moves first.</b> Players alternate turns.',
      r2:'<b>Check:</b> The king is threatened and must be resolved that turn.',
      r3:'<b>Checkmate:</b> The king in check with no escape. End of game.',
      r4:'<b>Castling:</b> The king moves two squares and the rook jumps to the other side.',
      r5:'<b>En passant:</b> Diagonal capture of a pawn that advanced two squares.',
      r6:'<b>Draw:</b> Stalemate, threefold repetition, 50-move rule, or agreement.',
      h3Over:'Chapter IV', h3Title:'Main <em>Openings</em>',
      apIntro:'The first moves define the character of the game. A good opening controls the center, develops pieces and protects the king.',
      bW:'White', bB:'Black', bW2:'White', bB2:'Black', bB3:'Black', bB4:'Black',
      ap1n:'Ruy Lopez',             ap1r:'Advanced level',
      ap1d:'Known as the Spanish Opening. The bishop on b5 pressures the pawn on e5. Favorite of Fischer, Karpov and Kasparov.',
      ap2n:'Sicilian Defense',      ap2r:'The most played in the world',
      ap2d:'With c5, Black fights asymmetrically for the center. Variants: Dragon, Najdorf, Scheveningen.',
      ap3n:'Italian Opening',       ap3r:'Great for beginners',
      ap3d:'Documented in the 15th century. The bishop on c4 targets the weak f7. Excellent for learning basic principles.',
      ap4n:'French Defense',        ap4r:'Solid and counterattacking',
      ap4d:'Solid pawn chain with counterattacks on the queenside. Ideal for strategic closed positions.',
      ap5n:'Caro-Kann',             ap5r:'Solid and positional',
      ap5d:'Clean structure without the bad bishop problem. Favorite of Karpov, Anand and Carlsen.',
      ap6n:"King's Indian Defense", ap6r:'Hypermodern and dynamic',
      ap6d:'Black lets White occupy the center to attack it from the flanks with the bishop on g7.',
      h4Over:'Chapter V', h4Title:'Game <em>Tips</em>',
      cs1c:'Opening',    cs1t:'Control the Center',        cs1d:'The central squares are the heart of the board. Occupy them from the first move.',
      cs2c:'Opening',    cs2t:'Develop Your Pieces',       cs2d:"Bring out knights and bishops first. Don't move the same piece twice in the opening.",
      cs3c:'Opening',    cs3t:'Castle Early',              cs3d:'Castling protects the king and connects the rooks. Do it before move ten.',
      cs4c:'Middlegame', cs4t:'Think Before You Move',     cs4d:'Ask yourself if you are leaving pieces undefended or creating weaknesses.',
      cs5c:'Tactics',    cs5t:'Practice Daily Tactics',    cs5d:'Forks, pins and discovered attacks are the direct way to gain material advantage.',
      cs6c:'Endgame',    cs6t:'Activate Your King',        cs6d:'In the endgame the king becomes active. Bring it to the center.',
      cs7c:'Strategy',   cs7t:'Avoid Weak Pawns',          cs7d:'Doubled and isolated pawns are permanent weaknesses hard to defend in the endgame.',
      cs8c:'Mental',     cs8t:'Stay Calm After Mistakes',  cs8d:"All grandmasters make mistakes. What sets them apart is not collapsing mentally.",
      cs9c:'Learning',   cs9t:'Analyze Your Games',        cs9d:'Review your games with an engine. Identifying the moment of the error is key to improvement.',
      credLabel:'Developed by',
      lblStatus:'Status', lblDiff:'Difficulty', lblScore:'Score',
      lblActions:'Actions', lblMoves:'History', lblTimer:'Clock',
      d1:'Easy', d2:'Medium', d3:'Hard',
      sW:'White', sB:'Black', sAI:'AI Black',
      btnNew:'New Game', btnUndo:'Undo', btnFlip:'Flip Board',
      btnDraw:'Offer Draw', btnResign:'Resign',
      promoLbl:'Promotion — Choose piece',
      initMsgBot:'Move a white piece to begin.',
      initMsgMulti:'White starts. Move a piece.',
      turnW:'Turn — White', turnB:'Turn — AI (Black)',
      turnWM:'Turn — White', turnBM:'Turn — Black',
      msgCheck:'Check',
      msgMateW:'Checkmate — White wins',
      msgMateB:'Checkmate — AI wins',
      msgMateName:' wins by checkmate',
      msgDraw:'Draw — Stalemate',
      msgThink:'AI calculating...',
      msgMove:'Your turn — move a white piece',
      msgUndo:'Move undone',
      msgResign:' resigned.',
      msgTimeUp:'Time is up',
      drawAsk:'Accept draw?',
      drawDone:'Draw agreed',
      winBtn:'New Game',
      botLabel:'Game mode', botH1:'Artificial <em>Intelligence</em>',
      botDesc:'You play with the white pieces. The AI plays black. Select difficulty before starting.',
      multiLabel:'Game mode', multiH1:'Local <em>Multiplayer</em>',
      multiDesc:'Two players on the same device. Edit names and choose time control.',
      tOff:'No clock', t3:'3 min', t5:'5 min', t10:'10 min',
      pW:'White', pB:'Black',
    }
  };

  let LANG = localStorage.getItem('chesslang') || 'es';

  function T(k) {
    const d = i18n[LANG] || i18n['es'];
    return d[k] !== undefined ? d[k] : (i18n['es'][k] || k);
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i]').forEach(el => {
      const k = el.getAttribute('data-i');
      const val = (i18n[LANG] || i18n['es'])[k];
      if (val !== undefined) el.innerHTML = val;
    });
  }

  function toggleLang() {
    LANG = LANG === 'es' ? 'en' : 'es';
    localStorage.setItem('chesslang', LANG);
    const btn = document.getElementById('langBtn');
    if (btn) btn.textContent = LANG === 'es' ? 'EN' : 'ES';
    applyTranslations();
    if (typeof window.onLangChange === 'function') window.onLangChange();
  }

  function initLang() {
    LANG = localStorage.getItem('chesslang') || 'es';
    const btn = document.getElementById('langBtn');
    if (btn) btn.textContent = LANG === 'es' ? 'EN' : 'ES';
    applyTranslations();
  }

  window.pc             = pc;
  window.pt             = pt;
  window.inB            = inB;
  window.legalMoves     = legalMoves;
  window.allLegal       = allLegal;
  window.applyMove      = applyMove;
  window.inCheck        = inCheck;
  window.makeInitBoard  = makeInitBoard;
  window.moveAN         = moveAN;
  window.needsPromo     = needsPromo;
  window.evalBoard      = evalBoard;
  window.minimax        = minimax;
  window.showPromoModal = showPromoModal;
  window.renderBoard    = renderBoard;
  window.renderMoves    = renderMoves;
  window.buildMiniBoard = buildMiniBoard;
  window.T              = T;
  window.toggleLang     = toggleLang;
  window.initLang       = initLang;
  window.LANG           = LANG;

})();