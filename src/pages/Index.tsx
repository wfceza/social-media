
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/AuthForm';
import { Header } from '@/components/Header';
import { PostFeed } from '@/components/PostFeed';
import { ChatRoom } from '@/components/ChatRoom';
import { UserProfile } from '@/components/UserProfile';
import { FriendRequests } from '@/components/FriendRequests';
import { DirectMessages } from '@/components/DirectMessages';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'feed' | 'chat' | 'profile' | 'friends' | 'messages'>(() => {
    // Initialize from localStorage or default to 'feed'
    const saved = localStorage.getItem('currentView');
    return (saved as 'feed' | 'chat' | 'profile' | 'friends' | 'messages') || 'feed';
  });

  // Save current view to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('currentView', currentView);
  }, [currentView]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentView={currentView} onViewChange={setCurrentView} />
      <main>
        {currentView === 'feed' && <PostFeed />}
        {currentView === 'chat' && <ChatRoom />}
        {currentView === 'profile' && <UserProfile />}
        {currentView === 'friends' && <FriendRequests />}
        {currentView === 'messages' && <DirectMessages />}
      </main>
    </div>
  );
};

const Index = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default Index;