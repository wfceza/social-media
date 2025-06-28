
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, MessageSquare, Heart, User, Users, Mail } from 'lucide-react';

interface HeaderProps {
  currentView: 'feed' | 'chat' | 'profile' | 'friends' | 'messages';
  onViewChange: (view: 'feed' | 'chat' | 'profile' | 'friends' | 'messages') => void;
}

export const Header = ({ currentView, onViewChange }: HeaderProps) => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            CEZAHUB
          </h1>
          <nav className="flex space-x-2">
            <Button
              variant={currentView === 'feed' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewChange('feed')}
              className="flex items-center space-x-2"
            >
              <Heart className="w-4 h-4" />
              <span>Feed</span>
            </Button>
            <Button
              variant={currentView === 'chat' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewChange('chat')}
              className="flex items-center space-x-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat</span>
            </Button>
            <Button
              variant={currentView === 'messages' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewChange('messages')}
              className="flex items-center space-x-2"
            >
              <Mail className="w-4 h-4" />
              <span>Messages</span>
            </Button>
            <Button
              variant={currentView === 'friends' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewChange('friends')}
              className="flex items-center space-x-2"
            >
              <Users className="w-4 h-4" />
              <span>Friends</span>
            </Button>
            <Button
              variant={currentView === 'profile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewChange('profile')}
              className="flex items-center space-x-2"
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </Button>
          </nav>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                {user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium hidden sm:block">
              {user?.email?.split('@')[0]}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
