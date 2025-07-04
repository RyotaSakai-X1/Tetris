"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

// テトリミノの型定義
type Tetromino = {
  shape: number[][];
  color: string;
  x: number;
  y: number;
};

// ゲームボードの定数
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 20; // 1ブロックのサイズ（px）- 小さくしてブラウザに収まるように

// テトリミノの形と色
const TETROMINOS = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "cyan",
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "blue",
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "orange",
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: "yellow",
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: "green",
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "purple",
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: "red",
  },
};

const TetrisGame = () => {
  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const nextPieceCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const gameLoopIntervalRef = useRef<number | null>(null);
  const boardRef = useRef<string[][]>(
    Array(BOARD_HEIGHT)
      .fill(null)
      .map(() => Array(BOARD_WIDTH).fill("#000"))
  );

  // ゲーム状態
  const [gameState, setGameState] = useState({
    score: 0,
    lines: 0,
    level: 1,
    highScore: 0,
    gameOver: false,
    paused: true, // 初期状態は一時停止（スタート待ち）
  });

  const [board, setBoard] = useState<string[][]>(
    Array(BOARD_HEIGHT)
      .fill(null)
      .map(() => Array(BOARD_WIDTH).fill("#000"))
  );

  // boardが更新されたらrefも同期
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const [currentTetromino, setCurrentTetromino] = useState<Tetromino | null>(
    null
  );
  const [nextTetromino, setNextTetromino] = useState<Tetromino | null>(null);

  // ランダムなテトリミノを生成する関数
  const generateRandomTetromino = useCallback(() => {
    const tetrominoNames = Object.keys(TETROMINOS);
    const randomName =
      tetrominoNames[Math.floor(Math.random() * tetrominoNames.length)];
    return {
      ...TETROMINOS[randomName as keyof typeof TETROMINOS],
      x: Math.floor(BOARD_WIDTH / 2) - 2,
      y: 0,
    };
  }, []);

  // テトリミノが有効な位置にあるか判定する関数
  const isValidMove = useCallback(
    (
      tetromino: Tetromino,
      newX: number,
      newY: number,
      newShape: number[][],
      currentBoard: string[][]
    ) => {
      for (let y = 0; y < newShape.length; y++) {
        for (let x = 0; x < newShape[y].length; x++) {
          if (newShape[y][x] !== 0) {
            const boardX = newX + x;
            const boardY = newY + y;

            if (
              boardX < 0 ||
              boardX >= BOARD_WIDTH ||
              boardY >= BOARD_HEIGHT ||
              (boardY >= 0 && currentBoard[boardY][boardX] !== "#000")
            ) {
              return false;
            }
          }
        }
      }
      return true;
    },
    []
  );

  // テトリミノを回転させる関数
  const rotateTetromino = useCallback(
    (tetromino: Tetromino) => {
      const shape = tetromino.shape;
      const N = shape.length;
      const newShape = Array(N)
        .fill(null)
        .map(() => Array(N).fill(0));

      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          newShape[x][N - 1 - y] = shape[y][x];
        }
      }

      if (isValidMove(tetromino, tetromino.x, tetromino.y, newShape, board)) {
        setCurrentTetromino({ ...tetromino, shape: newShape });
      }
    },
    [board, isValidMove]
  );

  // スタート/ポーズ機能
  const togglePause = useCallback(() => {
    if (gameState.gameOver) return;

    setGameState((prev) => ({
      ...prev,
      paused: !prev.paused,
    }));

    // 初回スタート時やcurrentTetrominoがない時にテトリミノをセット
    if (gameState.paused && !currentTetromino && nextTetromino) {
      setCurrentTetromino({
        ...nextTetromino,
        x: Math.floor(BOARD_WIDTH / 2) - 2,
        y: 0,
      });
      setNextTetromino(generateRandomTetromino());
    }
  }, [
    gameState.paused,
    gameState.gameOver,
    currentTetromino,
    nextTetromino,
    generateRandomTetromino,
  ]);

  // ゲームリセット関数
  const resetGame = useCallback(() => {
    setGameState({
      score: 0,
      lines: 0,
      level: 1,
      highScore: gameState.highScore,
      gameOver: false,
      paused: true, // リセット後は一時停止状態
    });

    const newBoard = Array(BOARD_HEIGHT)
      .fill(null)
      .map(() => Array(BOARD_WIDTH).fill("#000"));

    setBoard(newBoard);
    boardRef.current = newBoard;

    setCurrentTetromino(null);
    setNextTetromino(generateRandomTetromino());
  }, [gameState.highScore, generateRandomTetromino]);

  // キーボードイベントを処理する関数
  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      if (gameState.gameOver) return;

      // ポーズ機能（Pキー）
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        togglePause();
        return;
      }

      if (!currentTetromino || gameState.paused) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          if (
            isValidMove(
              currentTetromino,
              currentTetromino.x - 1,
              currentTetromino.y,
              currentTetromino.shape,
              board
            )
          ) {
            setCurrentTetromino({
              ...currentTetromino,
              x: currentTetromino.x - 1,
            });
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (
            isValidMove(
              currentTetromino,
              currentTetromino.x + 1,
              currentTetromino.y,
              currentTetromino.shape,
              board
            )
          ) {
            setCurrentTetromino({
              ...currentTetromino,
              x: currentTetromino.x + 1,
            });
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          rotateTetromino(currentTetromino);
          break;
        case "ArrowDown":
          e.preventDefault();
          const newY = currentTetromino.y + 1;
          if (
            isValidMove(
              currentTetromino,
              currentTetromino.x,
              newY,
              currentTetromino.shape,
              board
            )
          ) {
            setCurrentTetromino({ ...currentTetromino, y: newY });
          } else {
            // 即座に着地させる
            setCurrentTetromino({ ...currentTetromino, y: currentTetromino.y });
          }
          break;
        case " ":
          e.preventDefault(); // スペースキーのデフォルト動作を防ぐ
          let dropY = currentTetromino.y;
          while (
            isValidMove(
              currentTetromino,
              currentTetromino.x,
              dropY + 1,
              currentTetromino.shape,
              board
            )
          ) {
            dropY++;
          }
          setCurrentTetromino({ ...currentTetromino, y: dropY });
          break;
      }
    },
    [
      currentTetromino,
      gameState.gameOver,
      gameState.paused,
      board,
      isValidMove,
      rotateTetromino,
      togglePause,
    ]
  );

  // ゲームループ（修正版）
  const startGameLoop = useCallback(() => {
    if (gameLoopIntervalRef.current) {
      clearInterval(gameLoopIntervalRef.current);
    }

    const dropInterval = Math.max(500, 1200 - (gameState.level - 1) * 80);

    gameLoopIntervalRef.current = window.setInterval(() => {
      setCurrentTetromino((currentTet: Tetromino | null) => {
        if (!currentTet) return currentTet;

        const newY = currentTet.y + 1;

        // refを使って現在のボード状態を同期的にチェック
        const canDrop = isValidMove(
          currentTet,
          currentTet.x,
          newY,
          currentTet.shape,
          boardRef.current
        );

        if (canDrop) {
          // まだ落下できる場合
          return { ...currentTet, y: newY };
        } else {
          // 着地した場合、テトリミノをボードにマージ
          setBoard((currentBoard) => {
            const newBoard = currentBoard.map((row) => [...row]);
            currentTet.shape.forEach((row: number[], y: number) => {
              row.forEach((value: number, x: number) => {
                if (value !== 0 && currentTet.y + y >= 0) {
                  newBoard[currentTet.y + y][currentTet.x + x] =
                    currentTet.color;
                }
              });
            });

            // ライン消去処理
            let linesCleared = 0;
            const finalBoard = newBoard.filter((row) => {
              if (row.every((cell) => cell !== "#000")) {
                linesCleared++;
                return false;
              }
              return true;
            });

            if (linesCleared > 0) {
              for (let i = 0; i < linesCleared; i++) {
                finalBoard.unshift(Array(BOARD_WIDTH).fill("#000"));
              }

              const scoreToAdd = [0, 100, 300, 500, 800][linesCleared] || 0;

              setGameState((prev) => ({
                ...prev,
                lines: prev.lines + linesCleared,
                level: Math.floor((prev.lines + linesCleared) / 10) + 1,
                score: prev.score + scoreToAdd,
              }));
            }

            return finalBoard;
          });

          // 次のテトリミノをセット
          setNextTetromino((nextTet: Tetromino | null) => {
            if (nextTet) {
              const newTetromino: Tetromino = {
                ...nextTet,
                x: Math.floor(BOARD_WIDTH / 2) - 2,
                y: 0,
              };

              // ゲームオーバー判定
              if (
                !isValidMove(
                  newTetromino,
                  newTetromino.x,
                  newTetromino.y,
                  newTetromino.shape,
                  boardRef.current
                )
              ) {
                setGameState((prev) => {
                  const newHighScore =
                    prev.score > prev.highScore ? prev.score : prev.highScore;
                  if (newHighScore > prev.highScore) {
                    localStorage.setItem(
                      "tetrisHighScore",
                      newHighScore.toString()
                    );
                  }
                  return { ...prev, gameOver: true, highScore: newHighScore };
                });
                return nextTet; // ゲームオーバーの場合は現在のnextTetrominoを保持
              }

              // 新しいテトリミノを現在のテトリミノとしてセット
              setTimeout(() => {
                setCurrentTetromino(newTetromino);
              }, 0);

              return generateRandomTetromino();
            }
            return nextTet;
          });

          // 現在のテトリミノはnullにして、setTimeoutで次のテトリミノをセット
          return null;
        }
      });
    }, dropInterval);
  }, [gameState.level, isValidMove, generateRandomTetromino]);

  // 初期化（一度だけ実行）
  useEffect(() => {
    const storedHighScore = localStorage.getItem("tetrisHighScore");
    if (storedHighScore) {
      setGameState((prev) => ({
        ...prev,
        highScore: parseInt(storedHighScore, 10),
      }));
    }

    // 初期はnextTetrominoのみをセット（currentTetrominoはスタート時に設定）
    setNextTetromino(generateRandomTetromino());

    return () => {
      if (gameLoopRef.current) {
        clearTimeout(gameLoopRef.current);
      }
      if (gameLoopIntervalRef.current) {
        clearInterval(gameLoopIntervalRef.current);
      }
    };
  }, []); // 空の依存配列で一度だけ実行

  // 描画の更新（状態変化時のみ）
  useEffect(() => {
    const gameCanvas = gameCanvasRef.current;
    const nextPieceCanvas = nextPieceCanvasRef.current;

    if (!gameCanvas || !nextPieceCanvas) return;

    const gameCtx = gameCanvas.getContext("2d");
    const nextCtx = nextPieceCanvas.getContext("2d");

    if (!gameCtx || !nextCtx) return;

    const drawBlock = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      color: string
    ) => {
      ctx.fillStyle = color;
      ctx.strokeStyle = "black";
      ctx.lineWidth = 1;
      ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    };

    const drawTetromino = (
      ctx: CanvasRenderingContext2D,
      tetromino: Tetromino | null,
      offsetX: number,
      offsetY: number
    ) => {
      if (!tetromino) return;
      tetromino.shape.forEach((row: number[], y: number) => {
        row.forEach((value: number, x: number) => {
          if (value !== 0) {
            drawBlock(ctx, offsetX + x, offsetY + y, tetromino.color);
          }
        });
      });
    };

    // ゲームボードの描画
    gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    gameCtx.fillStyle = "#000";
    gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

    board.forEach((row, y) => {
      row.forEach((color, x) => {
        if (color !== "#000") {
          drawBlock(gameCtx, x, y, color);
        }
      });
    });

    if (currentTetromino) {
      drawTetromino(
        gameCtx,
        currentTetromino,
        currentTetromino.x,
        currentTetromino.y
      );
    }

    // 次のブロックの描画
    nextCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    nextCtx.fillStyle = "#000";
    nextCtx.fillRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    drawTetromino(nextCtx, nextTetromino, 0, 0);
  }, [board, currentTetromino, nextTetromino, gameState.gameOver]);

  // ゲームループの再開/停止
  useEffect(() => {
    if (gameLoopIntervalRef.current) {
      clearInterval(gameLoopIntervalRef.current);
    }

    if (!gameState.gameOver && !gameState.paused) {
      startGameLoop();
    }

    return () => {
      if (gameLoopIntervalRef.current) {
        clearInterval(gameLoopIntervalRef.current);
      }
    };
  }, [startGameLoop, gameState.gameOver, gameState.paused]);

  // キーボードイベント
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.gameOver && e.key === "Enter") {
        resetGame();
      } else {
        handleKeyPress(e);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyPress, gameState.gameOver, resetGame]);

  return (
    <div className="min-h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="flex items-center justify-evenly gap-2">
        {/* Game Over Modal */}
        {gameState.gameOver && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-2xl text-center border border-purple-400 shadow-2xl shadow-purple-500/30">
              <h2 className="text-5xl font-bold text-red-400 mb-6 drop-shadow-lg tracking-wider">
                GAME OVER
              </h2>
              <p className="text-2xl text-white mb-3 drop-shadow">
                Score:{" "}
                <span className="text-yellow-400 font-mono">
                  {gameState.score}
                </span>
              </p>
              <p className="text-2xl text-yellow-400 mb-6 drop-shadow font-bold">
                High Score:{" "}
                <span className="font-mono">{gameState.highScore}</span>
              </p>
              <button
                onClick={resetGame}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-8 rounded-2xl text-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-purple-400"
              >
                🎮 Play Again (Enter)
              </button>
            </div>
          </div>
        )}

        {/* Game Board */}
        <div className="border-4 border-purple-400 bg-black rounded-2xl shadow-2xl shadow-purple-500/40 p-2">
          <canvas
            id="tetris-board"
            ref={gameCanvasRef}
            width={BOARD_WIDTH * BLOCK_SIZE}
            height={BOARD_HEIGHT * BLOCK_SIZE}
            className="rounded-lg"
          ></canvas>
        </div>

        {/* Game Info Panel */}
        <div className="flex flex-col space-y-4 w-56">
          <h1 className="text-4xl font-bold text-center text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text drop-shadow-lg tracking-wider">
            TETRIS
          </h1>

          {/* Control Buttons */}
          <div className="space-y-3">
            <button
              onClick={togglePause}
              disabled={gameState.gameOver}
              className={`w-40 font-bold py-3 px-6 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 shadow-lg backdrop-blur-sm ${
                gameState.paused
                  ? "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-emerald-500/40 border border-emerald-400"
                  : "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-amber-500/40 border border-amber-400"
              } ${gameState.gameOver ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {gameState.paused ? "▶️ START" : "⏸️ PAUSE"}
            </button>

            <button
              onClick={resetGame}
              className="w-40 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-bold py-3 px-6 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/40 border border-red-400 backdrop-blur-sm"
            >
              🔄 RESET
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl shadow-lg border border-purple-400/30 backdrop-blur-sm">
              <h2 className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-t-xl p-3 text-sm font-bold text-white text-center border-b border-purple-400/30">
                SCORE
              </h2>
              <p className="p-4 text-center text-xl font-mono text-white font-bold">
                {gameState.score.toLocaleString()}
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl shadow-lg border border-blue-400/30 backdrop-blur-sm">
              <h2 className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-xl p-3 text-sm font-bold text-white text-center border-b border-blue-400/30">
                LINES
              </h2>
              <p className="p-4 text-center text-xl font-mono text-white font-bold">
                {gameState.lines}
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl shadow-lg border border-green-400/30 backdrop-blur-sm">
              <h2 className="bg-gradient-to-r from-green-500 to-green-600 rounded-t-xl p-3 text-sm font-bold text-white text-center border-b border-green-400/30">
                LEVEL
              </h2>
              <p className="p-4 text-center text-xl font-mono text-white font-bold">
                {gameState.level}
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl shadow-lg border border-yellow-400/30 backdrop-blur-sm">
              <h2 className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-t-xl p-3 text-sm font-bold text-white text-center border-b border-yellow-400/30">
                HIGH
              </h2>
              <p className="p-4 text-center text-xl font-mono text-white font-bold">
                {gameState.highScore.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Next Piece */}
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl shadow-lg border border-pink-400/30 backdrop-blur-sm">
            <h2 className="bg-gradient-to-r from-pink-500 to-pink-600 rounded-t-xl p-3 text-sm font-bold text-white text-center border-b border-pink-400/30">
              NEXT PIECE
            </h2>
            <div className="p-4 flex justify-center items-center h-24">
              <canvas
                id="next-piece"
                ref={nextPieceCanvasRef}
                width="80"
                height="80"
                className="border border-gray-600 rounded-lg bg-black shadow-inner"
              >
                {" "}
              </canvas>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl shadow-lg border border-cyan-400/30 backdrop-blur-sm p-4">
            <h3 className="text-white font-bold mb-3 text-center text-lg">
              🎮 CONTROLS
            </h3>
            <div className="text-sm text-gray-300 space-y-2">
              <div className="flex justify-between items-center">
                <span className="bg-gray-700 px-2 py-1 rounded text-xs">
                  ← →
                </span>
                <span>Move</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="bg-gray-700 px-2 py-1 rounded text-xs">↑</span>
                <span>Rotate</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="bg-gray-700 px-2 py-1 rounded text-xs">↓</span>
                <span>Soft Drop</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="bg-gray-700 px-2 py-1 rounded text-xs">
                  Space
                </span>
                <span>Hard Drop</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="bg-gray-700 px-2 py-1 rounded text-xs">P</span>
                <span>Pause</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TetrisGame;
