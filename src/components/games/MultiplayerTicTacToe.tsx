
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

type Player = 'X' | 'O';
type GameResult = Player | 'tie' | null;

interface MultiplayerTicTacToeProps {
  friendId: string;
  onGameUpdate: (gameData: any) => void;
  gameMessages: any[];
}

export const MultiplayerTicTacToe = ({ friendId, onGameUpdate, gameMessages }: MultiplayerTicTacToeProps) => {
  const { user } = useAuth();
  const [board, setBoard] = useState<Array<Player | null>>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [gameResult, setGameResult] = useState<GameResult>(null);
  const [gameId, setGameId] = useState<string>('');
  const [playerSymbol, setPlayerSymbol] = useState<Player | null>(null);

  useEffect(() => {
    // Process game messages to update game state
    if (gameMessages.length > 0) {
      const latestGame = gameMessages[gameMessages.length - 1];
      if (latestGame.board) {
        setBoard(latestGame.board);
        setCurrentPlayer(latestGame.currentPlayer);
        setGameResult(latestGame.gameResult);
        setGameId(latestGame.gameId);
        
        // Determine player symbol based on game creator
        if (latestGame.gameId && !playerSymbol) {
          const isCreator = latestGame.sender === user?.id;
          setPlayerSymbol(isCreator ? 'X' : 'O');
        }
      }
    }
  }, [gameMessages, user?.id, playerSymbol]);

  const checkWinner = (squares: Array<Player | null>): GameResult => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
    ];

    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }

    return squares.every(square => square !== null) ? 'tie' : null;
  };

  const handleSquareClick = (index: number) => {
    if (board[index] || gameResult) return;
    
    // Check if it's the player's turn
    if (!playerSymbol || currentPlayer !== playerSymbol) return;

    const newBoard = board.slice();
    newBoard[index] = currentPlayer;
    const winner = checkWinner(newBoard);
    
    const nextPlayer = currentPlayer === 'X' ? 'O' : 'X';
    
    setBoard(newBoard);
    setCurrentPlayer(nextPlayer);
    setGameResult(winner);

    // Send game update
    const gameData = {
      gameType: 'tictactoe',
      gameId: gameId || Date.now().toString(),
      board: newBoard,
      currentPlayer: nextPlayer,
      gameResult: winner,
      move: { index, player: currentPlayer }
    };

    onGameUpdate(gameData);
  };

  const startNewGame = () => {
    const newBoard = Array(9).fill(null);
    const newGameId = Date.now().toString();
    
    setBoard(newBoard);
    setCurrentPlayer('X');
    setGameResult(null);
    setGameId(newGameId);
    setPlayerSymbol('X'); // Game creator is always X

    const gameData = {
      gameType: 'tictactoe',
      gameId: newGameId,
      board: newBoard,
      currentPlayer: 'X',
      gameResult: null,
      action: 'start'
    };

    onGameUpdate(gameData);
  };

  const renderSquare = (index: number) => (
    <Button
      key={index}
      variant="outline"
      className="w-16 h-16 text-2xl font-bold"
      onClick={() => handleSquareClick(index)}
      disabled={!!board[index] || !!gameResult || currentPlayer !== playerSymbol}
    >
      {board[index]}
    </Button>
  );

  const getStatusMessage = () => {
    if (gameResult === 'tie') return "It's a tie!";
    if (gameResult) {
      const winner = gameResult === playerSymbol ? 'You' : 'Your friend';
      return `${winner} won!`;
    }
    if (!playerSymbol) return 'Waiting for game to start...';
    return currentPlayer === playerSymbol ? 'Your turn' : "Friend's turn";
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          Tic Tac Toe
          {playerSymbol && (
            <div className="text-sm font-normal text-gray-600">
              You are: {playerSymbol}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-lg font-semibold">{getStatusMessage()}</p>
        </div>
        
        <div className="grid grid-cols-3 gap-2 justify-center">
          {board.map((_, index) => renderSquare(index))}
        </div>

        <div className="flex flex-col space-y-2">
          <Button onClick={startNewGame} className="w-full">
            Start New Game
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
