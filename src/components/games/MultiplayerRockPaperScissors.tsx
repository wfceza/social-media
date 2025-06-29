
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

type Choice = 'rock' | 'paper' | 'scissors';

interface MultiplayerRockPaperScissorsProps {
  friendId: string;
  onGameUpdate: (gameData: any) => void;
  gameMessages: any[];
}

export const MultiplayerRockPaperScissors = ({ friendId, onGameUpdate, gameMessages }: MultiplayerRockPaperScissorsProps) => {
  const { user } = useAuth();
  const [myChoice, setMyChoice] = useState<Choice | null>(null);
  const [friendChoice, setFriendChoice] = useState<Choice | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [friendScore, setFriendScore] = useState(0);
  const [roundResult, setRoundResult] = useState<string>('');
  const [gameId, setGameId] = useState<string>('');
  const [waitingForFriend, setWaitingForFriend] = useState(false);

  useEffect(() => {
    // Process game messages to update game state
    if (gameMessages.length > 0) {
      const latestGame = gameMessages[gameMessages.length - 1];
      
      if (latestGame.action === 'start') {
        setMyScore(0);
        setFriendScore(0);
        setMyChoice(null);
        setFriendChoice(null);
        setRoundResult('');
        setGameId(latestGame.gameId);
        setWaitingForFriend(false);
      } else if (latestGame.action === 'choice') {
        // Update friend's choice if it's from them
        if (latestGame.sender !== user?.id) {
          setFriendChoice(latestGame.choice);
          
          // If both players have made choices, determine winner
          if (myChoice) {
            determineRoundWinner(myChoice, latestGame.choice);
          }
        }
      } else if (latestGame.action === 'result') {
        setMyScore(latestGame.scores[user?.id || ''] || 0);
        setFriendScore(latestGame.scores[friendId] || 0);
        setRoundResult(latestGame.result);
        
        // Reset choices for next round
        setTimeout(() => {
          setMyChoice(null);
          setFriendChoice(null);
          setWaitingForFriend(false);
        }, 2000);
      }
    }
  }, [gameMessages, myChoice, user?.id, friendId]);

  const determineRoundWinner = (playerChoice: Choice, opponentChoice: Choice) => {
    let result = '';
    let newMyScore = myScore;
    let newFriendScore = friendScore;

    if (playerChoice === opponentChoice) {
      result = "It's a tie!";
    } else if (
      (playerChoice === 'rock' && opponentChoice === 'scissors') ||
      (playerChoice === 'paper' && opponentChoice === 'rock') ||
      (playerChoice === 'scissors' && opponentChoice === 'paper')
    ) {
      result = 'You won this round!';
      newMyScore++;
    } else {
      result = 'Your friend won this round!';
      newFriendScore++;
    }

    const scores = {
      [user?.id || '']: newMyScore,
      [friendId]: newFriendScore
    };

    // Send result update
    const gameData = {
      gameType: 'rps',
      gameId,
      action: 'result',
      result,
      scores,
      playerChoice,
      opponentChoice
    };

    onGameUpdate(gameData);
  };

  const makeChoice = (choice: Choice) => {
    setMyChoice(choice);
    setWaitingForFriend(true);

    // Send choice to friend
    const gameData = {
      gameType: 'rps',
      gameId: gameId || Date.now().toString(),
      action: 'choice',
      choice
    };

    onGameUpdate(gameData);

    // If friend has already made a choice, determine winner
    if (friendChoice) {
      determineRoundWinner(choice, friendChoice);
    }
  };

  const startNewGame = () => {
    const newGameId = Date.now().toString();
    
    setMyScore(0);
    setFriendScore(0);
    setMyChoice(null);
    setFriendChoice(null);
    setRoundResult('');
    setGameId(newGameId);
    setWaitingForFriend(false);

    const gameData = {
      gameType: 'rps',
      gameId: newGameId,
      action: 'start'
    };

    onGameUpdate(gameData);
  };

  const choices: { value: Choice; emoji: string; label: string }[] = [
    { value: 'rock', emoji: '✊', label: 'Rock' },
    { value: 'paper', emoji: '✋', label: 'Paper' },
    { value: 'scissors', emoji: '✌️', label: 'Scissors' }
  ];

  const getGameStatus = () => {
    if (roundResult) return roundResult;
    if (waitingForFriend) return 'Waiting for your friend...';
    if (myChoice && !friendChoice) return 'Waiting for your friend to choose...';
    if (!myChoice && friendChoice) return 'Your friend is ready! Make your choice.';
    return 'Make your choice!';
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Rock Paper Scissors</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between text-lg font-semibold">
          <span>You: {myScore}</span>
          <span>Friend: {friendScore}</span>
        </div>
        
        <div className="text-center">
          <p className="text-lg">{getGameStatus()}</p>
        </div>

        {myChoice && friendChoice && (
          <div className="flex justify-center space-x-8 text-4xl">
            <div className="text-center">
              <div>{choices.find(c => c.value === myChoice)?.emoji}</div>
              <div className="text-sm">You</div>
            </div>
            <div className="text-center">
              <div>vs</div>
            </div>
            <div className="text-center">
              <div>{choices.find(c => c.value === friendChoice)?.emoji}</div>
              <div className="text-sm">Friend</div>
            </div>
          </div>
        )}
        
        {!myChoice && !roundResult && (
          <div className="grid grid-cols-3 gap-2">
            {choices.map((choice) => (
              <Button
                key={choice.value}
                onClick={() => makeChoice(choice.value)}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2"
                disabled={waitingForFriend}
              >
                <span className="text-2xl">{choice.emoji}</span>
                <span className="text-xs">{choice.label}</span>
              </Button>
            ))}
          </div>
        )}

        <Button onClick={startNewGame} className="w-full">
          Start New Game
        </Button>
      </CardContent>
    </Card>
  );
};
