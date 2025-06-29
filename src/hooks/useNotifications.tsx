
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface NotificationCounts {
  messages: number;
  friendRequests: number;
  posts: number;
  chat: number;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<NotificationCounts>({
    messages: 0,
    friendRequests: 0,
    posts: 0,
    chat: 0
  });

  const fetchCounts = async () => {
    if (!user) return;

    try {
      // Count unread direct messages
      const { count: messageCount } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .is('read_at', null);

      // Count pending friend requests
      const { count: friendRequestCount } = await supabase
        .from('friend_requests')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      // Count new posts (posts created in last 24 hours, excluding user's own)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { count: postCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString())
        .neq('author_id', user.id);

      // Count new chat messages (messages created in last hour, excluding user's own)
      const lastHour = new Date();
      lastHour.setHours(lastHour.getHours() - 1);
      
      const { count: chatCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', lastHour.toISOString())
        .neq('author_id', user.id);

      setCounts({
        messages: messageCount || 0,
        friendRequests: friendRequestCount || 0,
        posts: postCount || 0,
        chat: chatCount || 0
      });
    } catch (error) {
      console.error('Error fetching notification counts:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCounts();
      
      // Set up real-time subscriptions
      const directMessagesChannel = supabase
        .channel('direct_messages_notifications')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'direct_messages' },
          (payload) => {
            if (payload.new.receiver_id === user.id) {
              setCounts(prev => ({ ...prev, messages: prev.messages + 1 }));
            }
          }
        )
        .subscribe();

      const friendRequestsChannel = supabase
        .channel('friend_requests_notifications')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'friend_requests' },
          (payload) => {
            if (payload.new.receiver_id === user.id) {
              setCounts(prev => ({ ...prev, friendRequests: prev.friendRequests + 1 }));
            }
          }
        )
        .subscribe();

      const postsChannel = supabase
        .channel('posts_notifications')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'posts' },
          (payload) => {
            if (payload.new.author_id !== user.id) {
              setCounts(prev => ({ ...prev, posts: prev.posts + 1 }));
            }
          }
        )
        .subscribe();

      const chatChannel = supabase
        .channel('chat_notifications')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            if (payload.new.author_id !== user.id) {
              setCounts(prev => ({ ...prev, chat: prev.chat + 1 }));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(directMessagesChannel);
        supabase.removeChannel(friendRequestsChannel);
        supabase.removeChannel(postsChannel);
        supabase.removeChannel(chatChannel);
      };
    }
  }, [user]);

  const clearNotifications = (type: keyof NotificationCounts) => {
    setCounts(prev => ({ ...prev, [type]: 0 }));
  };

  const markMessagesAsRead = async () => {
    if (!user) return;
    
    await supabase
      .from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('receiver_id', user.id)
      .is('read_at', null);
    
    clearNotifications('messages');
  };

  return {
    counts,
    clearNotifications,
    markMessagesAsRead,
    refreshCounts: fetchCounts
  };
};
