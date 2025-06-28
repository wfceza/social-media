
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scissors, Square, CircleDot } from 'lucide-react';

type Choice = 'rock' | 'paper' | 'scissors' | null;
type GameResult = 'win' | 'lose' | 'tie' | null;

const choices = [
  { id: 'rock', name: 'Rock', icon: CircleDot, emoji: '🪨' },
  { id: 'paper', name: 'Paper', icon: Square, emoji: '📄' },
  { id: 'scissors', name: 'Scissors', icon: Scissors, emoji: '✂️' },
] as const;

interface RockPaperScissorsProps {
  onSendResult: (message: string) => void;
}

export const RockPaperScissors = ({ onSendResult }: RockPaperScissorsProps) => {
  const [playerChoice, setPlayerChoice] = useState<Choice>(null);
  const [computerChoice, setComputerChoice] = useState<Choice>(null);
  const [result, setResult] = useState<GameResult>(null);
  const [score, setScore] = useState({ player: 0, computer: 0 });

  const getRandomChoice = (): Choice => {
    const options: Choice[] = ['rock', 'paper', 'scissors'];
    return options[Math.floor(Math.random() * options.length)];
  };

  const determineWinner = (player: Choice, computer: Choice): GameResult => {
    if (player === computer) return 'tie';
    if (
      (player === 'rock' && computer === 'scissors') ||
      (player === 'paper' && computer === 'rock') ||
      (player === 'scissors' && computer === 'paper')
    ) {
      return 'win';
    }
    return 'lose';
  };

  const playGame = (choice: Choice) => {
    const computer = getRandomChoice();
    const gameResult = determineWinner(choice, computer);
    
    setPlayerChoice(choice);
    setComputerChoice(computer);
    setResult(gameResult);
    
    if (gameResult === 'win') {
      setScore(prev => ({ ...prev, player: prev.player + 1 }));
    } else if (gameResult === 'lose') {
      setScore(prev => ({ ...prev, computer: prev.computer + 1 }));
    }

    // Send result to chat
    const playerEmoji = choices.find(c => c.id === choice)?.emoji;
    const computerEmoji = choices.find(c => c.id === computer)?.emoji;
    const resultText = gameResult === 'win' ? 'You won!' : gameResult === 'lose' ? 'You lost!' : "It's a tie!";
    
    onSendResult(`🎮 Rock Paper Scissors: ${playerEmoji} vs ${computerEmoji} - ${resultText}`);
  };

  const resetGame = () => {
    setPlayerChoice(null);
    setComputerChoice(null);
    setResult(null);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">🎮 Rock Paper Scissors</CardTitle>
        <div className="text-center text-sm text-gray-600">
          Score: You {score.player} - {score.computer} Computer
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {choices.map((choice) => {
            const Icon = choice.icon;
            return (
              <Button
                key={choice.id}
                onClick={() => playGame(choice.id)}
                variant={playerChoice === choice.id ? "default" : "outline"}
                className="h-20 flex flex-col items-center space-y-1"
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs">{choice.name}</span>
              </Button>
            );
          })}
        </div>
        
        {result && (
          <div className="text-center space-y-2">
            <div className="flex justify-between items-center">
              <div className="text-center">
                <div className="text-2xl">{choices.find(c => c.id === playerChoice)?.emoji}</div>
                <div className="text-sm">You</div>
              </div>
              <div className="text-xl font-bold">VS</div>
              <div className="text-center">
                <div className="text-2xl">{choices.find(c => c.id === computerChoice)?.emoji}</div>
                <div className="text-sm">Computer</div>
              </div>
            </div>
            <div className={`text-lg font-bold ${
              result === 'win' ? 'text-green-600' : 
              result === 'lose' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {result === 'win' ? '🎉 You Won!' : result === 'lose' ? '😢 You Lost!' : '🤝 Tie!'}
            </div>
            <Button onClick={resetGame} variant="outline" size="sm">
              Play Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
