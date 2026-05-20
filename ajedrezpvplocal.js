let board, sel, turn, over, lastMove, hist, snap, flipped;
let scoreW, scoreB, timeLimit, timerW, timerB, timerInterval;

function getName(col) {
  const el = document.getElementById(col === 'w' ? 'name-w' : 'name-b');
  return (el && el.value.trim()) || (col === 'w' ? 'Jugador 1' : 'Jugador 2');
}

function initState() {
  board    = makeInitBoard();
  sel      = null;
  turn     = 'w';
  over     = false;
  lastMove = null;
  hist     = [];
  snap     = [];

  if (timeLimit > 0) {
    timerW = timeLimit * 60;
    timerB = timeLimit * 60;
  } else {
    timerW = 0;
    timerB = 0;
  }
}

function newGame() {
  stopTimer();
  initState();
  draw();
  renderMoves(document.getElementById('move-list'), hist);
  setStatus(T('initMsgMulti'), '');
  updateTurnUI();
  updateCards();
  renderTimers();
  startTimer();
  document.getElementById('win-overlay').classList.remove('show');
}

function setTime(min, btn) {
  document.querySelectorAll('.time-preset').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  timeLimit = min;
  newGame();
}

function startTimer() {
  stopTimer();
  if (!timeLimit) return;
  timerInterval = setInterval(() => {
    if (over) { stopTimer(); return; }
    if (turn === 'w') {
      timerW = Math.max(0, timerW - 1);
      if (timerW === 0) { stopTimer(); timeOut('w'); return; }
    } else {
      timerB = Math.max(0, timerB - 1);
      if (timerB === 0) { stopTimer(); timeOut('b'); return; }
    }
    renderTimers();
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function timeOut(loser) {
  over = true;
  const winner = getName(loser === 'w' ? 'b' : 'w');
  if (loser === 'w') { scoreB++; document.getElementById('score-b').textContent = scoreB; }
  else               { scoreW++; document.getElementById('score-w').textContent = scoreW; }
  setStatus(T('msgTimeUp'), 'win');
  showWin(winner, T('msgTimeUp').toLowerCase());
}

function fmtTime(s) {
  if (s <= 0) return '0:00';
  const m = Math.floor(s / 60), sec = s % 60;
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

function renderTimers() {
  const tw = document.getElementById('timer-w');
  const tb = document.getElementById('timer-b');
  if (!timeLimit) {
    tw.textContent = '--:--';
    tb.textContent = '--:--';
    tw.className = 'player-timer';
    tb.className = 'player-timer';
    return;
  }
  tw.textContent = fmtTime(timerW);
  tb.textContent = fmtTime(timerB);
  tw.className = 'player-timer' + (timerW <= 30 ? ' danger' : '');
  tb.className = 'player-timer' + (timerB <= 30 ? ' danger' : '');
}

function setStatus(msg, cls) {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.className   = 'status-box' + (cls ? ' ' + cls : '');
}

function updateTurnUI() {
  const dw  = document.getElementById('dot-w');
  const db  = document.getElementById('dot-b');
  const txt = document.getElementById('turn-txt');
  if (turn === 'w') {
    dw.className  = 'turn-dot w-active';
    db.className  = 'turn-dot';
    txt.innerHTML = T('turnWM') + ' (' + getName('w') + ')';
  } else {
    dw.className  = 'turn-dot';
    db.className  = 'turn-dot b-active';
    txt.innerHTML = T('turnBM') + ' (' + getName('b') + ')';
  }
}

function updateCards() {
  const cw = document.getElementById('card-w');
  const cb = document.getElementById('card-b');
  if (!over) {
    cw.className = 'player-card'  + (turn === 'w' ? ' active' : '');
    cb.className = 'player-card black-card' + (turn === 'b' ? ' active' : '');
  } else {
    cw.className = 'player-card';
    cb.className = 'player-card black-card';
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
  renderTimers();
}

async function handleClick(r, c) {
  if (over) return;

  if (sel) {
    const moves = legalMoves(sel[0], sel[1], board);
    if (moves.some(m => m[0] === r && m[1] === c)) {
      await doMove(sel, [r, c]);
      sel = null;
      draw();
      renderMoves(document.getElementById('move-list'), hist);
      checkEnd();
      updateTurnUI();
      updateCards();
      return;
    }
  }

  sel = (board[r][c] && pc(board[r][c]) === turn) ? [r, c] : null;
  draw();
}

async function doMove(from, to) {
  let promo = null;
  if (needsPromo(from, to, board)) promo = await showPromoModal(turn);

  const an = moveAN(from, to, board);
  snap.push({
    board: board.map(r => [...r]),
    turn, lastMove,
    hist: hist.map(h => ({ ...h })),
    timerW, timerB
  });

  board    = applyMove(from, to, board, promo);
  lastMove = { from, to };

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
    stopTimer();
    if (inCheck(turn, board)) {
      const winner = getName(turn === 'w' ? 'b' : 'w');
      const loser  = getName(turn);
      if (turn === 'b') { scoreW++; document.getElementById('score-w').textContent = scoreW; }
      else              { scoreB++; document.getElementById('score-b').textContent = scoreB; }
      setStatus(winner + T('msgMateName'), 'win');
      showWin(winner, loser + (LANG === 'es' ? ' quedo en jaque mate.' : ' was checkmated.'));
    } else {
      setStatus(T('msgDraw'), 'draw');
      showWinDraw();
    }
    updateCards();
    return;
  }
  if (inCheck(turn, board)) {
    setStatus(T('msgCheck') + ' — ' + getName(turn), 'check');
  } else {
    setStatus(T('turnWM') + ': ' + getName(turn), '');
  }
}

function showWin(winner, sub) {
  document.getElementById('win-title').textContent = winner;
  document.getElementById('win-sub').textContent   = sub;
  document.getElementById('win-overlay').classList.add('show');
}

function showWinDraw() {
  document.getElementById('win-title').textContent = LANG === 'es' ? 'Tablas' : 'Draw';
  document.getElementById('win-sub').textContent   = LANG === 'es' ? 'Partida empatada.' : 'The game is drawn.';
  document.getElementById('win-overlay').classList.add('show');
}

function closeWin() {
  document.getElementById('win-overlay').classList.remove('show');
  newGame();
}


function undoMove() {
  if (!snap.length) return;
  const s  = snap.pop();
  board    = s.board;
  turn     = s.turn;
  lastMove = s.lastMove;
  hist     = s.hist;
  if (timeLimit > 0) { timerW = s.timerW; timerB = s.timerB; }
  sel  = null;
  over = false;
  draw();
  renderMoves(document.getElementById('move-list'), hist);
  checkEnd();
  updateTurnUI();
  updateCards();
  setStatus(T('msgUndo'), '');
}


function offerDraw() {
  if (over) return;
  const opp = getName(turn === 'w' ? 'b' : 'w');
  if (confirm(opp + ' — ' + T('drawAsk'))) {
    over = true;
    stopTimer();
    setStatus(T('drawDone'), 'draw');
    showWinDraw();
    updateCards();
  }
}

function resign() {
  if (over) return;
  over = true;
  stopTimer();
  const loser  = getName(turn);
  const winner = getName(turn === 'w' ? 'b' : 'w');
  if (turn === 'w') { scoreB++; document.getElementById('score-b').textContent = scoreB; }
  else              { scoreW++; document.getElementById('score-w').textContent = scoreW; }
  setStatus(loser + T('msgResign'), 'win');
  showWin(winner, loser + T('msgResign'));
  updateCards();
}

function flipBoard() {
  flipped = !flipped;
  draw();
}

function onLangChange() {
  updateTurnUI();
  if (!over) checkEnd();
}


document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('name-w').addEventListener('input', updateTurnUI);
  document.getElementById('name-b').addEventListener('input', updateTurnUI);
});

flipped   = false;
scoreW    = 0;
scoreB    = 0;
timeLimit = 0;
timerInterval = null;

initLang();
newGame();