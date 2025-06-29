
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gamepad2, ArrowLeft } from 'lucide-react';
import { MultiplayerTicTacToe } from './MultiplayerTicTacToe';
import { MultiplayerRockPaperScissors } from './MultiplayerRockPaperScissors';

type GameType = 'menu' | 'tictactoe' | 'rps';

interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface MultiplayerGameMenuProps {
  friendId: string;
  onGameUpdate: (gameData: any) => void;
  messages: DirectMessage[];
}

export const MultiplayerGameMenu = ({ friendId, onGameUpdate, messages }: MultiplayerGameMenuProps) => {
  const [currentGame, setCurrentGame] = useState<GameType>('menu');
  const [gameMessages, setGameMessages] = useState<any[]>([]);

  useEffect(() => {
    // Filter and parse game messages
    const parsedMessages = messages
      .map(msg => {
        try {
          return { ...JSON.parse(msg.content), messageId: msg.id, sender: msg.sender_id, timestamp: msg.created_at };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    setGameMessages(parsedMessages);
  }, [messages]);

  const games = [
    {
      id: 'tictactoe' as const,
      name: 'Tic Tac Toe',
      emoji: '❌⭕',
      description: 'Take turns to get three in a row'
    },
    {
      id: 'rps' as const,
      name: 'Rock Paper Scissors',
      emoji: '✊✋✌️',
      description: 'Best of 3 rounds'
    }
  ];

  if (currentGame === 'menu') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center space-x-2">
            <Gamepad2 className="w-5 h-5" />
            <span>Multiplayer Games</span>
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
      
      {currentGame === 'tictactoe' && (
        <MultiplayerTicTacToe 
          friendId={friendId}
          onGameUpdate={onGameUpdate}
          gameMessages={gameMessages.filter(msg => msg.gameType === 'tictactoe')}
        />
      )}
      {currentGame === 'rps' && (
        <MultiplayerRockPaperScissors 
          friendId={friendId}
          onGameUpdate={onGameUpdate}
          gameMessages={gameMessages.filter(msg => msg.gameType === 'rps')}
        />
      )}
    </div>
  );
};
