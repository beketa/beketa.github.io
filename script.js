const boardElement = document.getElementById('board');
const currentPlayerElement = document.getElementById('current-player');
const scoreBlackElement = document.getElementById('score-black');
const scoreWhiteElement = document.getElementById('score-white');
const messageElement = document.getElementById('message');
const passButton = document.getElementById('pass-button'); // パスボタンはAI戦では使わないので非表示にしても良い

const BOARD_SIZE = 8;
const EMPTY = 0;
const BLACK = 1; // 人間プレイヤー
const WHITE = 2; // AI プレイヤー

let board = [];
let currentPlayer = BLACK;
let isAIMoving = false; // AIが考えている最中かを示すフラグ

// AI の設定
const AI_PLAYER = WHITE;
const MINIMAX_DEPTH = 5; // Minimax の探索深さ (増やしすぎると重くなります)
const LATE_GAME_THRESHOLD = 24; // 残りマスがこの数を下回ったらMinimaxを使う

// 8方向の定義 (縦, 横)
const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1], // 上下左右
    [-1, -1], [-1, 1], [1, -1], [1, 1]  // 斜め
];

// ボードの初期化
function initializeBoard() {
    board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));

    // 初期配置
    board[3][3] = WHITE;
    board[3][4] = BLACK;
    board[4][3] = BLACK;
    board[4][4] = WHITE;

    currentPlayer = BLACK; // 黒（人間）から開始
    isAIMoving = false; // AIは動いていない
    updateBoardDisplay();
    updateScoreDisplay();
    updateMessage();
    passButton.style.display = 'none'; // AI戦では使用しない
    addSquareClickListeners(); // クリックイベントリスナーを再度設定
}

// ボードの表示を更新
function updateBoardDisplay() {
    boardElement.innerHTML = ''; // 一度クリア
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.dataset.row = r;
            square.dataset.col = c;

            if (board[r][c] !== EMPTY) {
                const disk = document.createElement('div');
                disk.classList.add('disk', board[r][c] === BLACK ? 'black' : 'white');
                square.appendChild(disk);
            } else {
                 // 現在のプレイヤーが置ける場所なら、有効な手であることを示す（任意）
                 if (currentPlayer !== AI_PLAYER && getDiscsToFlip(board, r, c, currentPlayer).length > 0) {
                     square.classList.add('valid-move'); // optional: 有効な手を視覚的に示す
                 }
            }

            boardElement.appendChild(square);
        }
    }
}

// スコアの表示を更新
function updateScoreDisplay() {
    let blackCount = 0;
    let whiteCount = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === BLACK) {
                blackCount++;
            } else if (board[r][c] === WHITE) {
                whiteCount++;
            }
        }
    }
    scoreBlackElement.textContent = blackCount;
    scoreWhiteElement.textContent = whiteCount;

    return { black: blackCount, white: whiteCount };
}

// メッセージの表示を更新
function updateMessage(msg = '') {
    if (msg) {
        messageElement.textContent = msg;
    } else {
        const playerColor = currentPlayer === BLACK ? '黒' : '白 (AI)' ;
        messageElement.textContent = `${playerColor}のターンです。`;
    }
}

// マスがボード内にあるか判定
function isValidPosition(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

// そのマスに置いたときに挟める石のリストを取得 (boardを引数にとるように変更)
function getDiscsToFlip(currentBoard, row, col, player) {
    // 空のマスでなければ挟めない
    if (currentBoard[row][col] !== EMPTY) {
        return [];
    }

    const opponent = player === BLACK ? WHITE : BLACK;
    const discsToFlip = [];

    // 各方向に挟めるかチェック
    for (const [dr, dc] of directions) {
        const currentLine = [];
        let r = row + dr;
        let c = col + dc;

        // 相手の石が連続している間、進む
        while (isValidPosition(r, c) && currentBoard[r][c] === opponent) {
            currentLine.push([r, c]);
            r += dr;
            c += dc;
        }

        // 連続の先に自分の石があれば、挟めている
        if (isValidPosition(r, c) && currentBoard[r][c] === player && currentLine.length > 0) {
            discsToFlip.push(...currentLine); // 挟めた石を追加
        }
    }

    return discsToFlip; // 挟める石のリストを返す
}

// ボードの有効な全ての着手を取得
function getAllValidMoves(currentBoard, player) {
    const validMoves = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (currentBoard[r][c] === EMPTY) {
                const discsToFlip = getDiscsToFlip(currentBoard, r, c, player);
                if (discsToFlip.length > 0) {
                    validMoves.push({ row: r, col: c, flips: discsToFlip });
                }
            }
        }
    }
    return validMoves;
}


// 有効な手があるか判定
function hasValidMoves(currentBoard, player) {
    return getAllValidMoves(currentBoard, player).length > 0;
}

// ゲーム終了判定
function isGameOver(currentBoard) {
    // どちらのプレイヤーも有効な手がない場合、ゲーム終了
    return !hasValidMoves(currentBoard, BLACK) && !hasValidMoves(currentBoard, WHITE);
}

// ターンを切り替える
function switchPlayer() {
    currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
    updateCurrentPlayerDisplay();

    // ゲーム終了か再度チェック
    if (isGameOver(board)) {
        endGame();
        return;
    }

    // 次のプレイヤーに有効な手がないかチェック
    if (!hasValidMoves(board, currentPlayer)) {
        updateMessage(`${currentPlayer === BLACK ? '黒' : '白 (AI)'}は置ける場所がないためパスです。`);
        // 強制的にターンをスキップ
        setTimeout(switchPlayer, 1500); // メッセージ表示のため少し待つ
    } else {
        updateMessage(); // 通常のメッセージに戻す

        // 次のプレイヤーがAIなら、AIの番を開始
        if (currentPlayer === AI_PLAYER) {
            isAIMoving = true; // AI思考中フラグON
            updateBoardDisplay(); // 有効な手ハイライトを消す
            setTimeout(makeAIMove, 1000); // AIが考えるふり（1秒待つ）
        } else {
             // 人間のターンならクリック可能にする
             isAIMoving = false; // AI思考中フラグOFF
             updateBoardDisplay(); // 人間プレイヤーの有効な手を表示
        }
    }
}

// 現在のプレイヤー表示を更新
function updateCurrentPlayerDisplay() {
    currentPlayerElement.textContent = currentPlayer === BLACK ? '黒' : '白 (AI)';
}

// ゲーム終了処理
function endGame() {
    const scores = updateScoreDisplay();
    let resultMessage = "ゲーム終了！";
    if (scores.black > scores.white) {
        resultMessage += "黒の勝ちです！";
    } else if (scores.white > scores.black) {
        resultMessage += "白 (AI) の勝ちです！";
    } else {
        resultMessage += "引き分けです！";
    }
    updateMessage(resultMessage);
    removeSquareClickListeners(); // クリックイベントリスナーを削除
}

// マスがクリックされたときの処理 (人間プレイヤーのみ)
function handleSquareClick(event) {
    if (currentPlayer !== BLACK || isAIMoving) {
        // AIのターン中またはAI思考中はクリックを無効にする
        return;
    }

    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);

    // 有効な手かチェック
    const discsToFlip = getDiscsToFlip(board, row, col, currentPlayer);

    if (discsToFlip.length > 0) {
        // 石を置く
        board[row][col] = currentPlayer;

        // 石をひっくり返す
        discsToFlip.forEach(([r, c]) => {
            board[r][c] = currentPlayer;
        });

        updateBoardDisplay();
        updateScoreDisplay();
        switchPlayer(); // ターンを交代

    } else {
        // 無効な手の場合
        updateMessage("そこには置けません！");
        // しばらくしたら元のメッセージに戻す
        setTimeout(updateMessage, 1500);
    }
}

// クリックイベントリスナーを追加
function addSquareClickListeners() {
    boardElement.addEventListener('click', handleSquareClick);
}

// クリックイベントリスナーを削除
function removeSquareClickListeners() {
     boardElement.removeEventListener('click', handleSquareClick);
}


// ========================================
// AI (白) のロジック
// ========================================

function makeAIMove() {
    updateMessage("白 (AI) が考えています...");

    const bestMove = getAIMove(board, AI_PLAYER);

    if (bestMove) {
        const { row, col, flips } = bestMove;
        // 石を置く
        board[row][col] = AI_PLAYER;
        // 石をひっくり返す
        flips.forEach(([r, c]) => {
            board[r][c] = AI_PLAYER;
        });

        updateBoardDisplay();
        updateScoreDisplay();
        switchPlayer(); // ターンを交代

    } else {
        // 置ける場所がない場合（パスはswitchPlayerで自動処理されるはずだが念のため）
        console.log("AI has no moves.");
         switchPlayer();
    }
}

// AI の手を決定する (単純な手 vs Minimax)
function getAIMove(currentBoard, player) {
    const validMoves = getAllValidMoves(currentBoard, player);

    if (validMoves.length === 0) {
        return null; // 置ける場所がない
    }

    const emptySquares = countEmptySquares(currentBoard);

    if (emptySquares <= LATE_GAME_THRESHOLD) {
        // 終盤: Minimax で最適な手を探す
        console.log("AI is using Minimax.");
        return findBestMoveMinimax(currentBoard, player, MINIMAX_DEPTH);
    } else {
        // 序盤～中盤: シンプルな評価で最適な手を探す (ここでは挟める石が多い手を選ぶ)
        console.log("AI is using simple strategy.");
        return findBestMoveSimple(currentBoard, player);
    }
}

// シンプルな戦略: 最も多くの石を挟める手を選ぶ
function findBestMoveSimple(currentBoard, player) {
    const validMoves = getAllValidMoves(currentBoard, player);
    let bestMove = null;
    let maxFlips = -1;

    // Corner positions for a simple heuristic
    const corners = [[0, 0], [0, BOARD_SIZE - 1], [BOARD_SIZE - 1, 0], [BOARD_SIZE - 1, BOARD_SIZE - 1]];

    // Prefer corners if available
    for (const move of validMoves) {
        if (corners.some(corner => corner[0] === move.row && corner[1] === move.col)) {
            // Corner move found, prioritize it
            return move; // Return the first corner move found
        }
    }


    // If no corner moves, choose move with max flips
    for (const move of validMoves) {
        if (move.flips.length > maxFlips) {
            maxFlips = move.flips.length;
            bestMove = move;
        }
    }

    // If still no move (e.g., only one move), just return the first valid one
     if (!bestMove && validMoves.length > 0) {
         return validMoves[0];
     }


    return bestMove;
}


// Minimax で最適な手を探す
function findBestMoveMinimax(currentBoard, player, depth) {
    const validMoves = getAllValidMoves(currentBoard, player);
    let bestScore = -Infinity;
    let bestMove = null;

    for (const move of validMoves) {
        const newBoard = copyBoard(currentBoard);
        // 仮に石を置いてみる
        makeMoveOnBoard(newBoard, move.row, move.col, player, move.flips);

        // Minimax を呼び出し、この手を選んだ場合の評価値を取得 (相手のターンになる)
        const score = minimax(newBoard, depth - 1, false, player, -Infinity, Infinity); // false = minimizing player (人間)

        // より良いスコアの手を記録
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove; // 最適な手（座標とひっくり返す石の情報）を返す
}

// Minimax アルゴリズム (Alpha-Beta Pruning 付き)
// currentBoard: 現在のボード状態
// depth: 残りの探索深さ
// isMaximizingPlayer: 最大化プレイヤーか (AIならtrue)
// aiPlayerColor: AI の石の色
// alpha: Alpha-Beta Pruning の α値
// beta: Alpha-Beta Pruning の β値
function minimax(currentBoard, depth, isMaximizingPlayer, aiPlayerColor, alpha, beta) {
    // 探索終了条件: 深さ0に到達 or ゲーム終了
    if (depth === 0 || isGameOver(currentBoard)) {
        return evaluateBoard(currentBoard, aiPlayerColor); // 評価値を返す
    }

    const player = isMaximizingPlayer ? aiPlayerColor : (aiPlayerColor === BLACK ? WHITE : BLACK);
    const validMoves = getAllValidMoves(currentBoard, player);

    // 置ける場所がない場合 (パス)
    if (validMoves.length === 0) {
         // 相手のターンとして再帰呼び出し (深さは減らさない)
         // パスなので手番だけ交代して再帰。深さは維持する。
         // ただし、連続パスでゲーム終了にならないように、depthを減らさないと無限ループの可能性あり。
         // ここではシンプルにdepthを減らして再帰とします。（連続パス考慮はより複雑）
         // Or: if (!hasValidMoves(currentBoard, player)) return minimax(currentBoard, depth - 1, !isMaximizingPlayer, aiPlayerColor, alpha, beta);
         // より正確には、相手もパスならゲーム終了。
         // ここでは単純化のため、有効な手がなければdepthを減らして相手のターンとします。
         const nextPlayer = player === BLACK ? WHITE : BLACK;
         if (!hasValidMoves(currentBoard, nextPlayer)) {
             // 両方パスならゲーム終了
             return evaluateBoard(currentBoard, aiPlayerColor);
         }
         // 片方だけパスなら手番交代
         return minimax(currentBoard, depth - 1, !isMaximizingPlayer, aiPlayerColor, alpha, beta);
    }


    if (isMaximizingPlayer) {
        let maxScore = -Infinity;
        for (const move of validMoves) {
            const newBoard = copyBoard(currentBoard);
            makeMoveOnBoard(newBoard, move.row, move.col, player, move.flips);
            const score = minimax(newBoard, depth - 1, false, aiPlayerColor, alpha, beta); // false = minimizing player
            maxScore = Math.max(maxScore, score);
            alpha = Math.max(alpha, score);
            if (beta <= alpha) {
                break; // Beta cutoff (枝刈り)
            }
        }
        return maxScore;
    } else { // Minimizing player (人間)
        let minScore = Infinity;
        for (const move of validMoves) {
            const newBoard = copyBoard(currentBoard);
            makeMoveOnBoard(newBoard, move.row, move.col, player, move.flips);
            const score = minimax(newBoard, depth - 1, true, aiPlayerColor, alpha, beta); // true = maximizing player
            minScore = Math.min(minScore, score);
            beta = Math.min(beta, score);
            if (beta <= alpha) {
                break; // Alpha cutoff (枝刈り)
            }
        }
        return minScore;
    }
}


// ボードを評価する関数 (AIの視点から)
// シンプルな評価: (AIの石数 - 相手の石数) + コーナーボーナス
function evaluateBoard(currentBoard, aiPlayerColor) {
    const humanPlayerColor = aiPlayerColor === BLACK ? WHITE : BLACK;
    let aiScore = 0;
    let humanScore = 0;

    // 石の数を数える
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (currentBoard[r][c] === aiPlayerColor) {
                aiScore++;
            } else if (currentBoard[r][c] === humanPlayerColor) {
                humanScore++;
            }
        }
    }

    let evaluation = aiScore - humanScore;

    // コーナーの重み付け (重要)
    const cornerWeight = 30; // コーナー1つあたりの価値
    const corners = [[0, 0], [0, BOARD_SIZE - 1], [BOARD_SIZE - 1, 0], [BOARD_SIZE - 1, BOARD_SIZE - 1]];

    for (const [r, c] of corners) {
        if (currentBoard[r][c] === aiPlayerColor) {
            evaluation += cornerWeight;
        } else if (currentBoard[r][c] === humanPlayerColor) {
            evaluation -= cornerWeight;
        }
    }

    // Xマス、Cマスなども評価に含めるとより強力になるが、ここではシンプルに石差とコーナーのみ
    // Xマス: コーナーに隣接する斜めのマス (0,1), (1,0), (0,6), (1,7), (6,0), (7,1), (6,7), (7,6)
    // Cマス: コーナーに隣接する辺のマス (0,1), (1,0), (0,6), (1,7), (6,0), (7,1), (6,7), (7,6) - 同じ定義になってる？間違ってますね。
    // Cマス: (0,1), (1,0), (0,6), (1,7), (6,0), (7,1), (6,7), (7,6) ではなく
    // Cマス: (0,1),(1,0), (0,6),(1,7), (6,0),(7,1), (6,7),(7,6) --- やっぱり同じ... 座標が間違ってました。
    // 正しいXマス: (1,1), (1, BOARD_SIZE-2), (BOARD_SIZE-2, 1), (BOARD_SIZE-2, BOARD_SIZE-2)
    // 正しいCマス: (0,1),(1,0), (0,6),(1,7), (6,0),(7,1), (6,7),(7,6) --- あれ？まだ間違えてる
    // 正しいCマス: (0,1), (1,0), (0,BOARD_SIZE-2), (1,BOARD_SIZE-1), (BOARD_SIZE-2,0), (BOARD_SIZE-1,1), (BOARD_SIZE-2,BOARD_SIZE-1), (BOARD_SIZE-1,BOARD_SIZE-2)
    // ごめんなさい、複雑なのでシンプルに石差とコーナーだけにします。

    return evaluation; // AIにとって有利なほど高い値
}

// ボードのディープコピーを作成
function copyBoard(originalBoard) {
    return originalBoard.map(row => [...row]);
}

// 指定されたボード上で手を進める（Minimax探索用）
function makeMoveOnBoard(currentBoard, row, col, player, flips) {
    if (currentBoard[row][col] !== EMPTY) {
        console.error("Attempted to make a move on a non-empty square in simulation.");
         return false; // エラー、置けない場所に置こうとした
    }

    currentBoard[row][col] = player;
    flips.forEach(([r, c]) => {
        currentBoard[r][c] = player;
    });
    return true; // 成功
}

// 空のマス数を数える
function countEmptySquares(currentBoard) {
    let count = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (currentBoard[r][c] === EMPTY) {
                count++;
            }
        }
    }
    return count;
}


// ゲーム開始
initializeBoard();
