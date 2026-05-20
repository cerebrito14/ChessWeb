let board, sel, turn, over, lastMove, hist, snap, diff, flipped, scoreW, scoreB;

function initState() {
  board     = makeInitBoard();
  sel       = null;
  turn      = 'w';
  over      = false;
  lastMove  = null;
  hist      = [];
  snap      = [];
}

function newGame() {
  initState();
  draw();
  renderMoves(document.getElementById('move-list'), hist);
  setStatus(T('initMsgBot'), '');
  updateTurnUI();
}

function setDiff(d, btn) {
  diff = d;
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function setStatus(msg, cls) {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.className = 'status-box' + (cls ? ' ' + cls : '');
}

function updateTurnUI() {
  const dw  = document.getElementById('dot-w');
  const db  = document.getElementById('dot-b');
  const txt = document.getElementById('turn-txt');
  if (turn === 'w') {
    dw.className  = 'turn-dot w-active';
    db.className  = 'turn-dot';
    txt.innerHTML = T('turnW');
  } else {
    dw.className  = 'turn-dot';
    db.className  = 'turn-dot b-active';
    txt.innerHTML = T('turnB');
  }
}

function draw() {
  const boardEl = document.getElementById('chess-board');
  const rankEl  = document.getElementById('rank-col');
  const fileEl  = document.getElementById('file-row');
  renderBoard(boardEl, rankEl, fileEl, board, sel, lastMove, turn, flipped);
  boardEl.querySelectorAll('.sq').forEach(sq => {
    sq.addEventListener('click', () => handleClick(+sq.dataset.r, +sq.dataset.c));
  });
}

async function handleClick(r, c) {
  if (over || turn !== 'w') return;

  if (sel) {
    const moves = legalMoves(sel[0], sel[1], board);
    if (moves.some(m => m[0] === r && m[1] === c)) {
      await doMove(sel, [r, c]);
      sel = null;
      draw();
      renderMoves(document.getElementById('move-list'), hist);
      checkEnd();
      updateTurnUI();
      if (!over) runAI();
      return;
    }
  }

  sel = (board[r][c] && pc(board[r][c]) === 'w') ? [r, c] : null;
  draw();
}

async function doMove(from, to) {
  let promo = null;
  if (needsPromo(from, to, board)) promo = await showPromoModal(turn);

  const an = moveAN(from, to, board);
  snap.push({
    board: board.map(r => [...r]),
    turn, lastMove,
    hist: hist.map(h => ({ ...h }))
  });
  board     = applyMove(from, to, board, promo);
  lastMove  = { from, to };

  const mn = Math.floor(hist.length / 2) + 1;
  if (turn === 'w') {
    hist.push({ num: mn, w: an, b: '' });
  } else if (hist.length) {
    hist[hist.length - 1].b = an;
  }
  turn = turn === 'w' ? 'b' : 'w';
}

function checkEnd() {
  const moves = allLegal(turn, board);
  if (!moves.length) {
    over = true;
    if (inCheck(turn, board)) {
      if (turn === 'b') {
        scoreW++;
        document.getElementById('score-w').textContent = scoreW;
        setStatus(T('msgMateW'), 'win');
      } else {
        scoreB++;
        document.getElementById('score-b').textContent = scoreB;
        setStatus(T('msgMateB'), 'win');
      }
    } else {
      setStatus(T('msgDraw'), 'draw');
    }
    return;
  }
  if (inCheck(turn, board)) {
    setStatus(T('msgCheck'), 'check');
  } else {
    setStatus(turn === 'w' ? T('msgMove') : T('msgThink'), '');
  }
}

function runAI() {
  const depth = diff === 1 ? 1 : diff === 2 ? 2 : 3;
  const delay = diff === 1 ? 280 : diff === 2 ? 480 : 750;

  setTimeout(async () => {
    const moves = allLegal('b', board);
    if (!moves.length) { checkEnd(); return; }

    let chosen;
    if (diff === 1) {
      const scored = moves
        .map(m => ({ m, s: evalBoard(applyMove(m.from, m.to, board)) + (Math.random() - 0.5) * 1.2 }))
        .sort((a, b) => b.s - a.s);
      chosen = scored[0].m;
    } else {
      const res = minimax(board, depth, -Infinity, Infinity, true);
      chosen = res.m || moves[0];
    }

    await doMove(chosen.from, chosen.to);
    sel = null;
    draw();
    renderMoves(document.getElementById('move-list'), hist);
    checkEnd();
    updateTurnUI();
  }, delay);
}

function undoMove() {
  const steps = turn === 'w' ? 2 : 1;
  if (snap.length < steps) return;

  for (let i = 0; i < steps && snap.length; i++) {
    const s = snap.pop();
    board    = s.board;
    turn     = s.turn;
    lastMove = s.lastMove;
    hist     = s.hist;
  }
  sel  = null;
  over = false;
  draw();
  renderMoves(document.getElementById('move-list'), hist);
  checkEnd();
  updateTurnUI();
  setStatus(T('msgUndo'), '');
}

function flipBoard() {
  flipped = !flipped;
  draw();
}

function onLangChange() {
  updateTurnUI();
  if (!over) checkEnd();
}

diff    = 1;
flipped = false;
scoreW  = 0;
scoreB  = 0;

initLang();
newGame();