
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, ArrowLeft, Gamepad2, Play, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ImageUpload } from '@/components/ImageUpload';
import { MultiplayerGameMenu } from '@/components/games/MultiplayerGameMenu';
import { VoiceRecorder } from '@/components/VoiceRecorder';

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url?: string;
  voice_url?: string;
  created_at: string;
  sender?: Profile;
}

interface Conversation {
  friend: Profile;
  lastMessage?: DirectMessage;
}

export const DirectMessages = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Profile[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGames, setShowGames] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (user) {
      fetchFriends();
    }
  }, [user]);

  useEffect(() => {
    if (selectedFriend && user) {
      fetchMessages();
      markMessagesAsRead();
    }
  }, [selectedFriend, user]);

  // Real-time subscription for direct messages
  useEffect(() => {
    if (!user) return;

    console.log('Setting up real-time subscription for direct messages');
    
    const channel = supabase
      .channel('direct_messages_realtime')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'direct_messages'
        },
        async (payload) => {
          console.log('New direct message received:', payload.new);
          
          const newMessage = payload.new as DirectMessage;
          
          // Only process messages that involve the current user
          if (newMessage.sender_id === user.id || newMessage.receiver_id === user.id) {
            // Fetch the complete message with sender profile
            const { data: messageWithSender } = await supabase
              .from('direct_messages')
              .select(`
                *,
                sender:profiles!direct_messages_sender_id_fkey(id, username, avatar_url)
              `)
              .eq('id', newMessage.id)
              .single();

            if (messageWithSender) {
              // Update messages if this conversation is currently selected
              if (selectedFriend && 
                  (messageWithSender.sender_id === selectedFriend.id || 
                   messageWithSender.receiver_id === selectedFriend.id)) {
                setMessages(prev => {
                  const exists = prev.some(msg => msg.id === messageWithSender.id);
                  if (exists) return prev;
                  return [...prev, messageWithSender];
                });
              }
              
              // Update conversations list
              fetchConversations(friends);
              
              // Show toast for new messages from friends
              if (messageWithSender.sender_id !== user.id) {
                toast({
                  title: "New Message",
                  description: `${messageWithSender.sender?.username || 'Friend'}: ${messageWithSender.content ? messageWithSender.content.substring(0, 50) + '...' : 'Voice message'}`
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user, selectedFriend, friends]);

  const fetchFriends = async () => {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          user1_id,
          user2_id,
          user1:profiles!friendships_user1_id_fkey(id, username, avatar_url),
          user2:profiles!friendships_user2_id_fkey(id, username, avatar_url)
        `)
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`);

      if (error) throw error;

      const friendsList = data?.map(friendship => {
        return friendship.user1_id === user?.id ? friendship.user2 : friendship.user1;
      }) || [];

      setFriends(friendsList);
      await fetchConversations(friendsList);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchConversations = async (friendsList: Profile[]) => {
    const conversationPromises = friendsList.map(async (friend) => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${user?.id})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        friend,
        lastMessage: error ? undefined : data
      };
    });

    const conversations = await Promise.all(conversationPromises);
    setConversations(conversations.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
    }));
  };

  const fetchMessages = async () => {
    if (!selectedFriend || !user) return;

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          *,
          sender:profiles!direct_messages_sender_id_fkey(id, username, avatar_url)
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedFriend.id}),and(sender_id.eq.${selectedFriend.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markMessagesAsRead = async () => {
    if (!selectedFriend || !user) return;

    try {
      await supabase
        .from('direct_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', selectedFriend.id)
        .eq('receiver_id', user.id)
        .is('read_at', null);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !imageUrl) || !selectedFriend || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedFriend.id,
          content: newMessage.trim() || '',
          image_url: imageUrl || null
        });

      if (error) throw error;

      setNewMessage('');
      setImageUrl('');
      fetchConversations(friends);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({ 
        title: "Error", 
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendVoiceMessage = async (voiceBlob: Blob) => {
    if (!selectedFriend || !user) return;

    try {
      // Create a file from the blob
      const fileName = `voice_${Date.now()}.webm`;
      const file = new File([voiceBlob], fileName, { type: 'audio/webm' });
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(`${user.id}/${fileName}`, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(uploadData.path);

      // Insert the message with voice URL
      const { error: insertError } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedFriend.id,
          content: '',
          voice_url: urlData.publicUrl
        });

      if (insertError) throw insertError;

      fetchConversations(friends);
      
      toast({
        title: "Voice Message Sent",
        description: "Your voice message has been sent!"
      });
    } catch (error: any) {
      console.error('Error sending voice message:', error);
      toast({ 
        title: "Error", 
        description: "Failed to send voice message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const clearChat = async () => {
    if (!selectedFriend || !user) return;

    try {
      const { error } = await supabase
        .from('direct_messages')
        .delete()
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedFriend.id}),and(sender_id.eq.${selectedFriend.id},receiver_id.eq.${user.id})`);

      if (error) throw error;

      setMessages([]);
      fetchConversations(friends);
      
      toast({
        title: "Chat Cleared",
        description: "All messages in this conversation have been deleted."
      });
    } catch (error: any) {
      console.error('Error clearing chat:', error);
      toast({ 
        title: "Error", 
        description: "Failed to clear chat. Please try again.",
        variant: "destructive"
      });
    }
  };

  const sendGameUpdate = async (gameData: any) => {
    if (!selectedFriend || !user) return;

    console.log('Sending game update:', gameData);
    
    try {
      const { error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedFriend.id,
          content: JSON.stringify(gameData),
          image_url: null
        });

      if (error) throw error;

      fetchConversations(friends);
    } catch (error: any) {
      console.error('Error sending game update:', error);
      toast({ 
        title: "Error", 
        description: "Failed to send game update. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!selectedFriend) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Card className="h-[calc(100vh-180px)]">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Direct Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {conversations.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No conversations yet. Add some friends to start chatting!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700">Select a conversation</h3>
                {conversations.map((conversation) => (
                  <div
                    key={conversation.friend.id}
                    className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setSelectedFriend(conversation.friend)}
                  >
                    <Avatar>
                      {conversation.friend.avatar_url ? (
                        <AvatarImage src={conversation.friend.avatar_url} />
                      ) : (
                        <AvatarFallback>
                          {conversation.friend.username?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{conversation.friend.username || 'Unknown User'}</p>
                      {conversation.lastMessage && (
                        <p className="text-sm text-gray-500 truncate">
                          {conversation.lastMessage.content || 'Image'}
                        </p>
                      )}
                    </div>
                    {conversation.lastMessage && (
                      <span className="text-xs text-gray-400">
                        {formatTimestamp(conversation.lastMessage.created_at)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const canSend = (newMessage.trim() || imageUrl) && !loading;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chat Section */}
        <div className="lg:col-span-2">
          <Card className="h-[calc(100vh-180px)] flex flex-col">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFriend(null)}
                    className="text-white hover:bg-white/20"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Avatar>
                    {selectedFriend.avatar_url ? (
                      <AvatarImage src={selectedFriend.avatar_url} />
                    ) : (
                      <AvatarFallback className="bg-white text-purple-600">
                        {selectedFriend.username?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <CardTitle>{selectedFriend.username || 'Unknown User'}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  className="text-white hover:bg-white/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-3 ${
                      message.sender_id === user?.id ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <Avatar className="w-8 h-8">
                      {message.sender?.avatar_url ? (
                        <AvatarImage src={message.sender.avatar_url} />
                      ) : (
                        <AvatarFallback className={`text-white text-sm ${
                          message.sender_id === user?.id 
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600'
                            : 'bg-gradient-to-r from-gray-600 to-gray-700'
                        }`}>
                          {message.sender?.username?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    
                    <div className={`flex-1 max-w-xs ${
                      message.sender_id === user?.id ? 'text-right' : 'text-left'
                    }`}>
                      <div className={`inline-block p-3 rounded-lg ${
                        message.sender_id === user?.id
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {message.content && !message.content.startsWith('{') && (
                          <p className="text-sm">{message.content}</p>
                        )}
                        {message.content && message.content.startsWith('{') && (
                          <div className="text-sm">
                            <p className="font-medium">🎮 Game Move</p>
                            <p className="text-xs opacity-80">Check the game panel →</p>
                          </div>
                        )}
                        {message.image_url && (
                          <img 
                            src={message.image_url} 
                            alt="Shared image" 
                            className="mt-2 max-w-full h-auto rounded cursor-pointer"
                            onClick={() => window.open(message.image_url, '_blank')}
                          />
                        )}
                        {message.voice_url && (
                          <div className="flex items-center space-x-2 mt-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="p-1"
                              onClick={() => {
                                const audio = new Audio(message.voice_url);
                                audio.play();
                              }}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                            <span className="text-xs">Voice message</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        <span>{formatTimestamp(message.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </CardContent>

            <div className="p-4 border-t">
              {imageUrl && (
                <div className="mb-3">
                  <ImageUpload
                    onImageUploaded={setImageUrl}
                    onImageRemoved={() => setImageUrl('')}
                    currentImageUrl={imageUrl}
                    disabled={loading}
                  />
                </div>
              )}
              <form onSubmit={sendMessage} className="flex space-x-2">
                <div className="flex-1 flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1"
                    maxLength={500}
                  />
                  {!imageUrl && (
                    <ImageUpload
                      onImageUploaded={setImageUrl}
                      onImageRemoved={() => setImageUrl('')}
                      disabled={loading}
                    />
                  )}
                  <VoiceRecorder onVoiceRecorded={sendVoiceMessage} />
                  <Button
                    type="button"
                    onClick={() => setShowGames(!showGames)}
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <Gamepad2 className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  type="submit"
                  disabled={!canSend}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {loading ? (
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* Games Section */}
        {showGames && selectedFriend && (
          <div className="lg:col-span-1">
            <MultiplayerGameMenu 
              friendId={selectedFriend.id}
              onGameUpdate={sendGameUpdate}
              messages={messages.filter(m => m.content.startsWith('{'))}
            />
          </div>
        )}
      </div>
    </div>
  );
};
