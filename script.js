// Constants and DOM references
const ultimateBoard = document.getElementById("ultimate-board");
const turnDisplay = document.getElementById("turn");
const undoButton = document.getElementById("undo-btn");
const resetButton = document.getElementById("reset-btn");
const startButton = document.getElementById("start-btn");
const playerSymbolSelect = document.getElementById("player-symbol");
const modeSelect = document.getElementById("game-mode");
const playerChoice = document.getElementById("player-choice");
const buttonsContainer = document.getElementById("buttons-container");

// Game state variables
let gameMode = "computer"; // "computer" or "two"
let playerSymbol = "X";
let computerSymbol = "O";
let boards,
  boardWinners,
  currentPlayer,
  activeBoardIndex,
  gameOver,
  moveHistory;

// Winning patterns for a 3x3 board
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

// Initialize new game variables
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

// Start button handler
startButton.addEventListener("click", () => {
  gameMode = modeSelect.value;
  playerSymbol = playerSymbolSelect.value;
  computerSymbol = playerSymbol === "X" ? "O" : "X";
  startGame();
});

// Undo and reset
undoButton.addEventListener("click", undoMove);
resetButton.addEventListener("click", resetGame);

// Create boards and begin
function startGame() {
  initVariables();
  ultimateBoard.innerHTML = "";
  ultimateBoard.style.display = "grid";
  buttonsContainer.style.display = "block";
  playerChoice.style.display = "none";

  for (let i = 0; i < 9; i++) {
    const boardEl = document.createElement("div");
    boardEl.className = "board";
    boardEl.dataset.index = i;

    for (let j = 0; j < 9; j++) {
      const cellEl = document.createElement("div");
      cellEl.className = "cell";
      cellEl.dataset.index = j;
      cellEl.addEventListener("click", handleCellClick);
      boardEl.appendChild(cellEl);
    }

    ultimateBoard.appendChild(boardEl);
  }

  updateTurnDisplay();
  highlightActiveBoard();

  // If vs computer and computer goes first
  if (gameMode === "computer" && currentPlayer !== playerSymbol) {
    setTimeout(computerMove, 300);
  }
}

// Handle a cell click (human move)
function handleCellClick(event) {
  if (gameOver) return;
  // In vs computer mode, only allow click when it's player's turn
  if (gameMode === "computer" && currentPlayer !== playerSymbol) return;

  const boardIndex = parseInt(
    event.currentTarget.parentElement.dataset.index,
    10
  );
  const cellIndex = parseInt(event.currentTarget.dataset.index, 10);

  if (activeBoardIndex !== -1 && boardIndex !== activeBoardIndex) return;
  if (boards[boardIndex][cellIndex] !== "" || boardWinners[boardIndex]) return;

  makeMove(boardIndex, cellIndex, currentPlayer);

  // Trigger computer only in vs computer mode
  if (
    gameMode === "computer" &&
    !gameOver &&
    currentPlayer === computerSymbol
  ) {
    setTimeout(computerMove, 300);
  }
}

// Place a move on a small board
function makeMove(boardIndex, cellIndex, symbol) {
  boards[boardIndex][cellIndex] = symbol;
  // Save move for undo
  moveHistory.push({
    boardIndex,
    cellIndex,
    prevActive: activeBoardIndex,
    symbol,
  });

  const boardEl = ultimateBoard.children[boardIndex];
  const cellEl = boardEl.children[cellIndex];
  cellEl.textContent = symbol;
  cellEl.classList.add(symbol.toLowerCase());

  highlightPreviousMove(boardIndex, cellIndex);

  // Check small board win or draw
  if (checkWinner(boards[boardIndex], symbol)) {
    boardWinners[boardIndex] = symbol;
    boardEl.classList.add(`won-${symbol.toLowerCase()}`);
    boardEl.dataset.winner = symbol;
  } else if (!boards[boardIndex].includes("")) {
    boardWinners[boardIndex] = "T";
    boardEl.dataset.winner = "T";
    boardEl.classList.add("draw");
  }

  // Check ultimate win or draw
  if (checkWinner(boardWinners, symbol)) {
    gameOver = true;
    turnDisplay.textContent = `${symbol} wins the Ultimate Tic-Tac-Toe!`;
    return;
  } else if (!boardWinners.includes("")) {
    gameOver = true;
    turnDisplay.textContent = "It's a tie!";
    return;
  }

  // Determine next active board
  activeBoardIndex = boardWinners[cellIndex] ? -1 : cellIndex;
  highlightActiveBoard();

  // Switch player
  currentPlayer = currentPlayer === "X" ? "O" : "X";
  updateTurnDisplay();

  // Enable undo
  undoButton.disabled = moveHistory.length === 0;
}

// Computer move (only in vs computer mode)
function computerMove() {
  if (gameMode !== "computer" || gameOver) return;

  let validMoves = [];
  const boardsToCheck =
    activeBoardIndex === -1 ? [...Array(9).keys()] : [activeBoardIndex];

  boardsToCheck.forEach((b) => {
    if (boardWinners[b]) return;
    boards[b].forEach((cell, idx) => {
      if (cell === "") validMoves.push({ b, idx });
    });
  });

  if (!validMoves.length) return;
  const { b, idx } = validMoves[Math.floor(Math.random() * validMoves.length)];
  makeMove(b, idx, computerSymbol);
}

// Highlight which board(s) are playable
function highlightActiveBoard() {
  Array.from(ultimateBoard.children).forEach((boardEl, idx) => {
    const isActive =
      !boardWinners[idx] &&
      (activeBoardIndex === -1 || activeBoardIndex === idx);
    boardEl.classList.toggle("highlighted", isActive);
  });
}

// Highlight the last move
function highlightPreviousMove(boardIndex, cellIndex) {
  document
    .querySelectorAll(".previous-move")
    .forEach((el) => el.classList.remove("previous-move"));
  const el = ultimateBoard.children[boardIndex].children[cellIndex];
  el.classList.add("previous-move");
}

// Update the turn text
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

// Undo last move
function undoMove() {
  if (moveHistory.length === 0) return;
  const last = moveHistory.pop();
  boards[last.boardIndex][last.cellIndex] = "";
  const cellEl =
    ultimateBoard.children[last.boardIndex].children[last.cellIndex];
  cellEl.textContent = "";
  cellEl.className = "cell";
  boardWinners[last.boardIndex] = "";
  const boardEl = ultimateBoard.children[last.boardIndex];
  boardEl.className = "board";
  delete boardEl.dataset.winner;

  activeBoardIndex = last.prevActive;
  gameOver = false;
  currentPlayer = last.symbol;
  updateTurnDisplay();
  highlightActiveBoard();
  undoButton.disabled = moveHistory.length === 0;
}

// Reset to mode selection
function resetGame() {
  playerChoice.style.display = "block";
  ultimateBoard.style.display = "none";
  buttonsContainer.style.display = "none";
  turnDisplay.textContent = "";
}

// Check if a given board (small or ultimate) has a winning pattern
function checkWinner(arr, symbol) {
  return WIN_PATTERNS.some((pattern) =>
    pattern.every((i) => arr[i] === symbol)
  );
}
