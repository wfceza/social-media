
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Player = 'X' | 'O' | null;
type GameResult = 'X' | 'O' | 'tie' | null;
type Board = Player[];

interface TicTacToeProps {
  onSendResult: (message: string) => void;
}

export const TicTacToe = ({ onSendResult }: TicTacToeProps) => {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<'X' | 'O'>('X');
  const [winner, setWinner] = useState<GameResult>(null);
  const [score, setScore] = useState({ X: 0, O: 0, ties: 0 });

  const winningLines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns  
    [0, 4, 8], [2, 4, 6] // diagonals
  ];

  const checkWinner = (board: Board): GameResult => {
    for (const [a, b, c] of winningLines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a] as 'X' | 'O';
      }
    }
    return board.every(cell => cell !== null) ? 'tie' : null;
  };

  const handleCellClick = (index: number) => {
    if (board[index] || winner) return;

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    const gameWinner = checkWinner(newBoard);
    if (gameWinner) {
      setWinner(gameWinner);
      if (gameWinner === 'tie') {
        setScore(prev => ({ ...prev, ties: prev.ties + 1 }));
        onSendResult('🎮 Tic Tac Toe: Game ended in a tie! 🤝');
      } else {
        setScore(prev => ({ ...prev, [gameWinner]: prev[gameWinner] + 1 }));
        onSendResult(`🎮 Tic Tac Toe: Player ${gameWinner} wins! 🎉`);
      }
    } else {
      setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinner(null);
  };

  const resetScore = () => {
    setScore({ X: 0, O: 0, ties: 0 });
    resetGame();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">🎮 Tic Tac Toe</CardTitle>
        <div className="text-center text-sm text-gray-600">
          Score: X {score.X} - {score.O} O - {score.ties} Ties
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!winner && (
          <div className="text-center text-lg font-semibold">
            Current Player: <span className="text-blue-600">{currentPlayer}</span>
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-2 w-fit mx-auto">
          {board.map((cell, index) => (
            <Button
              key={index}
              onClick={() => handleCellClick(index)}
              variant="outline"
              className="w-16 h-16 text-2xl font-bold hover:bg-gray-100"
              disabled={!!cell || !!winner}
            >
              {cell}
            </Button>
          ))}
        </div>

        {winner && (
          <div className="text-center space-y-2">
            <div className={`text-xl font-bold ${
              winner === 'tie' ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {winner === 'tie' ? '🤝 It\'s a Tie!' : `🎉 Player ${winner} Wins!`}
            </div>
            <div className="space-x-2">
              <Button onClick={resetGame} size="sm">
                New Game
              </Button>
              <Button onClick={resetScore} variant="outline" size="sm">
                Reset Score
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
