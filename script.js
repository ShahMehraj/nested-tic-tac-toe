// script.js
// ——— Imports from Firebase modular SDK ———
import {
  ref,
  push,
  onChildAdded,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// ——— DOM references ———
const ultimateBoard = document.getElementById("ultimate-board");
const turnDisplay = document.getElementById("turn");
const undoButton = document.getElementById("undo-btn");
const resetButton = document.getElementById("reset-btn");
const startButton = document.getElementById("start-btn");
const playerSymbolSel = document.getElementById("player-symbol");
const modeSelect = document.getElementById("game-mode");
const playerChoiceDiv = document.getElementById("player-choice");
const buttonsContainer = document.getElementById("buttons-container");

// ——— Firebase & room setup ———
const db = window.firebaseDB;
const params = new URLSearchParams(window.location.search);
let roomId, movesRef, clientId;

// ——— Game state ———
let boards,
  boardWinners,
  currentPlayer,
  activeBoardIndex,
  gameOver,
  moveHistory;
let gameMode, playerSymbol, computerSymbol;

// ——— Win patterns for 3×3 ———
const WIN_PATTERNS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

// ——— Initialize/reset all in-memory state ———
function initVariables() {
  boards = Array(9)
    .fill(null)
    .map(() => Array(9).fill(""));
  boardWinners = Array(9).fill("");
  currentPlayer = "X";
  activeBoardIndex = -1;
  gameOver = false;
  moveHistory = [];
}

// ——— Build the 9 small boards in the DOM ———
function renderBoards() {
  ultimateBoard.innerHTML = "";
  ultimateBoard.style.display = "grid";
  buttonsContainer.style.display = "block";
  playerChoiceDiv.style.display = "none";

  for (let b = 0; b < 9; b++) {
    const boardEl = document.createElement("div");
    boardEl.className = "board";
    boardEl.dataset.index = b;
    for (let c = 0; c < 9; c++) {
      const cellEl = document.createElement("div");
      cellEl.className = "cell";
      cellEl.dataset.index = c;
      cellEl.addEventListener("click", handleCellClick);
      boardEl.appendChild(cellEl);
    }
    ultimateBoard.appendChild(boardEl);
  }
  highlightActiveBoard();
}

// ——— Handle a click by the local player ———
function handleCellClick(e) {
  if (gameOver) return;
  if (currentPlayer !== playerSymbol) return; // only on your turn

  const boardIdx = +e.currentTarget.parentElement.dataset.index;
  const cellIdx = +e.currentTarget.dataset.index;

  if (boards[boardIdx][cellIdx] || boardWinners[boardIdx]) return;
  if (activeBoardIndex !== -1 && boardIdx !== activeBoardIndex) return;

  makeMove(boardIdx, cellIdx, playerSymbol);
}

// ——— Wrapper: apply locally + broadcast if two-player ———
function makeMove(boardIdx, cellIdx, symbol) {
  makeMoveLocal(boardIdx, cellIdx, symbol);
  if (gameMode === "two") {
    push(movesRef, {
      boardIdx,
      cellIdx,
      symbol,
      owner: clientId,
    });
  }
}

// ——— Core logic & UI updates (no Firebase) ———
function makeMoveLocal(boardIdx, cellIdx, symbol) {
  // 1) update state & history
  boards[boardIdx][cellIdx] = symbol;
  moveHistory.push({
    boardIdx,
    cellIdx,
    prevActive: activeBoardIndex,
    prevPlayer: currentPlayer,
  });

  // 2) paint the cell
  const boardEl = ultimateBoard.children[boardIdx];
  const cellEl = boardEl.children[cellIdx];
  cellEl.textContent = symbol;
  cellEl.classList.add(symbol.toLowerCase());
  highlightPreviousMove(boardIdx, cellIdx);

  // 3) check small-board win/draw
  if (checkWinner(boards[boardIdx], symbol)) {
    boardWinners[boardIdx] = symbol;
    boardEl.classList.add(`won-${symbol.toLowerCase()}`);
    boardEl.dataset.winner = symbol;
  } else if (!boards[boardIdx].includes("")) {
    boardWinners[boardIdx] = "T";
    boardEl.classList.add("draw");
    boardEl.dataset.winner = "T";
  }

  // 4) check ultimate win/draw
  if (checkWinner(boardWinners, symbol)) {
    gameOver = true;
    turnDisplay.textContent = `${symbol} wins the Ultimate Tic-Tac-Toe!`;
    undoButton.disabled = false;
    return;
  } else if (!boardWinners.includes("")) {
    gameOver = true;
    turnDisplay.textContent = "It's a tie!";
    undoButton.disabled = false;
    return;
  }

  // 5) set next active board
  activeBoardIndex = boardWinners[cellIdx] ? -1 : cellIdx;
  highlightActiveBoard();

  // 6) switch turns
  currentPlayer = currentPlayer === "X" ? "O" : "X";
  updateTurnDisplay();

  // 7) if vs computer, trigger AI
  if (
    gameMode === "computer" &&
    !gameOver &&
    currentPlayer === computerSymbol
  ) {
    setTimeout(computerMove, 300);
  }

  undoButton.disabled = moveHistory.length === 0;
}

// ——— Simple random-move AI (stub for deeper minimax) ———
function computerMove() {
  if (gameOver) return;
  const boardsToUse =
    activeBoardIndex === -1 ? [...Array(9).keys()] : [activeBoardIndex];

  const valid = [];
  boardsToUse.forEach((b) => {
    if (boardWinners[b]) return;
    boards[b].forEach((c, i) => {
      if (!c) valid.push({ b, i });
    });
  });
  if (!valid.length) return;

  const { b, i } = valid[Math.floor(Math.random() * valid.length)];
  makeMove(b, i, computerSymbol);
}

// ——— UI helpers ———
function highlightActiveBoard() {
  Array.from(ultimateBoard.children).forEach((bEl, idx) => {
    const active =
      !boardWinners[idx] &&
      (activeBoardIndex === -1 || idx === activeBoardIndex);
    bEl.classList.toggle("highlighted", active);
  });
}

function highlightPreviousMove(bIdx, cIdx) {
  document
    .querySelectorAll(".previous-move")
    .forEach((el) => el.classList.remove("previous-move"));
  ultimateBoard.children[bIdx].children[cIdx].classList.add("previous-move");
}

function updateTurnDisplay() {
  if (gameOver) return;
  if (gameMode === "computer") {
    turnDisplay.textContent =
      currentPlayer === playerSymbol
        ? `Your turn (${playerSymbol})`
        : `Computer's turn (${computerSymbol})`;
  } else {
    turnDisplay.textContent = `Player ${currentPlayer}'s turn`;
  }
}

function checkWinner(arr, sym) {
  return WIN_PATTERNS.some((line) => line.every((i) => arr[i] === sym));
}

// ——— Undo & reset ———
function undoMove() {
  if (!moveHistory.length) return;
  const last = moveHistory.pop();

  // clear cell
  boards[last.boardIdx][last.cellIdx] = "";
  const cellEl = ultimateBoard.children[last.boardIdx].children[last.cellIdx];
  cellEl.textContent = "";
  cellEl.className = "cell";

  // clear small-board win/draw
  boardWinners[last.boardIdx] = "";
  const boardEl = ultimateBoard.children[last.boardIdx];
  boardEl.className = "board";
  delete boardEl.dataset.winner;

  // restore turn and active board
  activeBoardIndex = last.prevActive;
  currentPlayer = last.prevPlayer;
  gameOver = false;

  updateTurnDisplay();
  highlightActiveBoard();
  undoButton.disabled = !moveHistory.length;
}

function resetGame() {
  // detach Firebase listener if any
  if (movesRef) onChildAdded(movesRef, () => {}); // no-op to clear
  playerChoiceDiv.style.display = "block";
  ultimateBoard.style.display = "none";
  buttonsContainer.style.display = "none";
  turnDisplay.textContent = "";
}

// ——— Event bindings ———
startButton.addEventListener("click", () => {
  // read options
  gameMode = modeSelect.value; // "computer" or "two"
  playerSymbol = playerSymbolSel.value; // "X" or "O"
  computerSymbol = playerSymbol === "X" ? "O" : "X";

  // if two-player, set up Firebase room and listener
  if (gameMode === "two") {
    roomId = params.get("room") || prompt("Enter room code:");
    clientId = `${Date.now()}_${Math.random()}`;
    movesRef = ref(db, `games/${roomId}/moves`);
    onChildAdded(movesRef, (snap) => {
      const d = snap.val();
      if (d.owner === clientId) return; // ignore our own
      makeMoveLocal(d.boardIdx, d.cellIdx, d.symbol);
    });
  }

  // start!
  initVariables();
  renderBoards();
  updateTurnDisplay();

  // if computer starts as X
  if (gameMode === "computer" && currentPlayer === computerSymbol) {
    setTimeout(computerMove, 300);
  }
});

undoButton.addEventListener("click", undoMove);
resetButton.addEventListener("click", resetGame);
