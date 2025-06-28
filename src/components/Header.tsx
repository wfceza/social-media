
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

  const navItems = [
    { key: 'feed', icon: Heart, label: 'Feed' },
    { key: 'chat', icon: MessageSquare, label: 'Chat' },
    { key: 'messages', icon: Mail, label: 'Messages' },
    { key: 'friends', icon: Users, label: 'Friends' },
    { key: 'profile', icon: User, label: 'Profile' }
  ];

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 py-3">
        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              CEZAHUB
            </h1>
            <nav className="flex space-x-2">
              {navItems.map(({ key, icon: Icon, label }) => (
                <Button
                  key={key}
                  variant={currentView === key ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onViewChange(key as any)}
                  className="flex items-center space-x-2"
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </Button>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">
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

        {/* Mobile Layout */}
        <div className="md:hidden">
          {/* Top row with title and user info */}
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              CEZAHUB
            </h1>
            <div className="flex items-center space-x-2">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm">
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 p-1"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Navigation grid */}
          <nav className="grid grid-cols-5 gap-1">
            {navItems.map(({ key, icon: Icon, label }) => (
              <Button
                key={key}
                variant={currentView === key ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange(key as any)}
                className="flex flex-col items-center space-y-1 h-auto py-2 px-1"
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs leading-none">{label}</span>
              </Button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};
