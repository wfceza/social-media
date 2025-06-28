
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gamepad2, ArrowLeft } from 'lucide-react';
import { RockPaperScissors } from './RockPaperScissors';
import { TicTacToe } from './TicTacToe';

type GameType = 'menu' | 'rps' | 'tictactoe';

interface GameMenuProps {
  onSendResult: (message: string) => void;
}

export const GameMenu = ({ onSendResult }: GameMenuProps) => {
  const [currentGame, setCurrentGame] = useState<GameType>('menu');

  const games = [
    {
      id: 'rps' as const,
      name: 'Rock Paper Scissors',
      emoji: '✊✋✌️',
      description: 'Classic hand game'
    },
    {
      id: 'tictactoe' as const,
      name: 'Tic Tac Toe',
      emoji: '❌⭕',
      description: 'Three in a row wins'
    }
  ];

  if (currentGame === 'menu') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center space-x-2">
            <Gamepad2 className="w-5 h-5" />
            <span>Mini Games</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {games.map((game) => (
            <Button
              key={game.id}
              onClick={() => setCurrentGame(game.id)}
              variant="outline"
              className="w-full h-auto p-4 flex flex-col items-center space-y-2"
            >
              <div className="text-2xl">{game.emoji}</div>
              <div className="font-semibold">{game.name}</div>
              <div className="text-sm text-gray-500">{game.description}</div>
            </Button>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={() => setCurrentGame('menu')}
        variant="ghost"
        size="sm"
        className="flex items-center space-x-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Games</span>
      </Button>
      
      {currentGame === 'rps' && <RockPaperScissors onSendResult={onSendResult} />}
      {currentGame === 'tictactoe' && <TicTacToe onSendResult={onSendResult} />}
    </div>
  );
};
