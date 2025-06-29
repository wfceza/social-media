
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificationBadge } from '@/components/NotificationBadge';
import { LogOut, MessageSquare, Heart, User, Users, Mail } from 'lucide-react';

interface HeaderProps {
  currentView: 'feed' | 'chat' | 'profile' | 'friends' | 'messages';
  onViewChange: (view: 'feed' | 'chat' | 'profile' | 'friends' | 'messages') => void;
}

export const Header = ({ currentView, onViewChange }: HeaderProps) => {
  const { user, logout } = useAuth();
  const { counts, clearNotifications, markMessagesAsRead } = useNotifications();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleViewChange = (view: 'feed' | 'chat' | 'profile' | 'friends' | 'messages') => {
    onViewChange(view);
    
    // Clear notifications when user visits the relevant section
    if (view === 'feed') {
      clearNotifications('posts');
    } else if (view === 'chat') {
      clearNotifications('chat');
    } else if (view === 'messages') {
      markMessagesAsRead();
    } else if (view === 'friends') {
      clearNotifications('friendRequests');
    }
  };

  const navItems = [
    { key: 'feed', icon: Heart, label: 'Feed', count: counts.posts },
    { key: 'chat', icon: MessageSquare, label: 'Chat', count: counts.chat },
    { key: 'messages', icon: Mail, label: 'Messages', count: counts.messages },
    { key: 'friends', icon: Users, label: 'Friends', count: counts.friendRequests },
    { key: 'profile', icon: User, label: 'Profile', count: 0 }
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
              {navItems.map(({ key, icon: Icon, label, count }) => (
                <NotificationBadge key={key} count={count}>
                  <Button
                    variant={currentView === key ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleViewChange(key as any)}
                    className="flex items-center space-x-2"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </Button>
                </NotificationBadge>
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
            {navItems.map(({ key, icon: Icon, label, count }) => (
              <NotificationBadge key={key} count={count}>
                <Button
                  variant={currentView === key ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewChange(key as any)}
                  className="flex flex-col items-center space-y-1 h-auto py-3 px-2 min-h-[60px] hover:bg-black-100 active:bg-black-200"
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs leading-none">{label}</span>
                </Button>
              </NotificationBadge>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};
