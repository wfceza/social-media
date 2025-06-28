import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, ArrowLeft, Gamepad2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ImageUpload } from '@/components/ImageUpload';
import { GameMenu } from '@/components/games/GameMenu';

// Define interfaces for data structures to improve type safety
interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

interface DirectMessage {
  // Supabase-generated ID
  id: string; 
  // IDs of sender and receiver
  sender_id: string;
  receiver_id: string;
  // Message content and optional image URL
  content: string;
  image_url?: string | null;
  // Timestamp of creation
  created_at: string;
  // Optional: sender profile data for display (fetched via join)
  sender?: Profile; 
  // Optional: timestamp when message was read
  read_at?: string | null;
}

interface Conversation {
  friend: Profile;
  lastMessage?: DirectMessage; // Latest message in the conversation
}

// Main DirectMessages component
export const DirectMessages = () => {
  const { user } = useAuth(); // Get current authenticated user
  const [friends, setFriends] = useState<Profile[]>([]); // List of user's friends
  const [conversations, setConversations] = useState<Conversation[]>([]); // List of conversations with friends
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null); // Currently active chat friend
  const [messages, setMessages] = useState<DirectMessage[]>([]); // Messages for the current chat
  const [newMessage, setNewMessage] = useState(''); // Input state for new message text
  const [imageUrl, setImageUrl] = useState(''); // Input state for image URL
  const [loading, setLoading] = useState(false); // Loading state for sending
  const [showGames, setShowGames] = useState(false); // State to toggle game menu
  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for auto-scrolling

  // Auto-scroll to the bottom of the chat when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch initial list of friends when user loads
  useEffect(() => {
    if (user) {
      fetchFriends();
    }
  }, [user]);

  // When a friend is selected for chat, fetch their messages and mark them as read
  useEffect(() => {
    if (selectedFriend && user) {
      fetchMessages();
      markMessagesAsRead();
    }
  }, [selectedFriend, user]);

  // Real-time subscription for new direct messages within the current conversation
  useEffect(() => {
    // Only set up subscription if a user and a friend are selected
    if (!user || !selectedFriend) {
      return; // Exit if pre-requisites not met
    }

    console.log('Setting up real-time subscription for direct messages...');

    // Create a unique channel name for this specific conversation
    // This makes the subscription highly targeted and efficient
    const channel = supabase
      .channel(`dm_${user.id}_${selectedFriend.id}`) // Unique channel name
      .on('postgres_changes',
        {
          event: 'INSERT', // Listen for new rows being inserted
          schema: 'public',
          table: 'direct_messages',
          // Filter to only include messages relevant to this specific conversation
          filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${selectedFriend.id}),and(sender_id.eq.${selectedFriend.id},receiver_id.eq.${user.id}))`
        },
        async (payload) => {
          console.log('Real-time direct message received:', payload.new);

          // We need the full message object, including the 'sender' profile data,
          // which isn't always present directly in payload.new from real-time events.
          // Fetching it explicitly ensures the message object is complete for rendering.
          const { data: messageWithSender, error: fetchError } = await supabase
            .from('direct_messages')
            .select(`*, sender:profiles!direct_messages_sender_id_fkey(id, username, avatar_url)`)
            .eq('id', payload.new.id) // Fetch by the actual ID from the payload
            .single();

          if (fetchError) {
            console.error("Error fetching message details for real-time update:", fetchError);
            return;
          }

          if (messageWithSender) {
            setMessages(prevMessages => {
              // Check if this message already exists in state to prevent duplicates
              // This is crucial for optimistic updates where the message is added
              // immediately, and then also received via real-time.
              const messageExists = prevMessages.some(msg => msg.id === messageWithSender.id);
              if (messageExists) {
                return prevMessages; // If already exists, don't add again
              }
              return [...prevMessages, messageWithSender]; // Add the new message
            });

            // Re-fetch conversations to update the 'last message' summary and order
            fetchConversations(friends);

            // Show a toast notification if the message is from the other person
            if (messageWithSender.sender_id !== user.id) {
              toast({
                title: "New Message",
                description: `${messageWithSender.sender?.username || 'Friend'}: ${messageWithSender.content?.substring(0, 50)}${messageWithSender.content && messageWithSender.content.length > 50 ? '...' : ''}`
              });
            }
          }
        }
      )
      .subscribe(); // Activate the subscription

    // Cleanup function: unsubscribe from the channel when the component unmounts
    // or when user/selectedFriend changes, to prevent memory leaks
    return () => {
      console.log('Cleaning up real-time subscription for direct messages.');
      supabase.removeChannel(channel);
    };
  }, [user, selectedFriend, friends]); // Dependencies for the effect

  // Utility function to scroll the chat to the bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetches the current user's friendships and associated profiles
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
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`); // Get friendships involving the current user

      if (error) throw error;

      // Extract the actual friend's profile from the friendship record
      const friendsList = data?.map(friendship => {
        return friendship.user1_id === user?.id ? friendship.user2 : friendship.user1;
      }) || [];

      setFriends(friendsList);
      await fetchConversations(friendsList); // Also fetch conversations based on this new friend list
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast({
        title: "Error",
        description: "Failed to load friends.",
        variant: "destructive"
      });
    }
  };

  // Fetches the last message for each conversation to display in the list view
  const fetchConversations = async (friendsList: Profile[]) => {
    const conversationPromises = friendsList.map(async (friend) => {
      // Fetch the most recent direct message for each friend
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${user?.id})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        friend,
        lastMessage: error ? undefined : data // Attach the last message or undefined
      };
    });

    const conversationsResult = await Promise.all(conversationPromises);
    // Sort conversations by the timestamp of their last message
    setConversations(conversationsResult.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1; // Put conversations with no message at the end
      if (!b.lastMessage) return -1; // Put conversations with no message at the end
      return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
    }));
  };

  // Fetches all messages for the currently selected chat
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
        .order('created_at', { ascending: true }); // Ensure messages are in chronological order

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages for this conversation.",
        variant: "destructive"
      });
    }
  };

  // Marks messages as read for the current conversation
  const markMessagesAsRead = async () => {
    if (!selectedFriend || !user) return;

    try {
      await supabase
        .from('direct_messages')
        .update({ read_at: new Date().toISOString() }) // Set 'read_at' to current time
        .eq('sender_id', selectedFriend.id) // Only update messages sent by the friend
        .eq('receiver_id', user.id) // And received by the current user
        .is('read_at', null); // Only if they are currently unread
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Handles sending a new message (text or image)
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission

    // Ensure there's content or an image, and a selected friend/user
    if ((!newMessage.trim() && !imageUrl) || !selectedFriend || !user) {
      toast({ title: "Cannot send empty message.", variant: "warning" });
      return;
    }

    setLoading(true); // Indicate loading state

    const tempMessageId = `optimistic-${Date.now()}`; // Create a temporary ID for optimistic UI
    const messageContent = newMessage.trim();
    const messageImageUrl = imageUrl;

    // Create an optimistic message object to immediately update the UI
    const optimisticMessage: DirectMessage = {
      id: tempMessageId,
      sender_id: user.id,
      receiver_id: selectedFriend.id,
      content: messageContent,
      image_url: messageImageUrl,
      created_at: new Date().toISOString(), // Use client-side timestamp for immediate display
      sender: {
        id: user.id,
        username: user.email?.split('@')[0] || 'You', // Display 'You' for the sender
        avatar_url: user.user_metadata?.avatar_url || null // Assuming avatar is in user_metadata
      }
    };

    // Add the optimistic message to the local state for instant feedback
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage(''); // Clear input fields instantly
    setImageUrl('');

    try {
      // Insert the message into the Supabase database
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedFriend.id,
          content: messageContent,
          image_url: messageImageUrl
        })
        .select(`*, sender:profiles!direct_messages_sender_id_fkey(id, username, avatar_url)`) // Fetch the actual inserted row with sender details
        .single(); // Expect a single record back

      if (error) throw error;

      // Replace the optimistic message with the actual message from the database
      // This ensures correct ID and timestamp from DB
      setMessages(prev => prev.map(msg =>
        msg.id === optimisticMessage.id ? data : msg
      ));

      // Re-fetch conversations to ensure the conversation list updates with the new last message
      fetchConversations(friends);
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Error Sending Message",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive"
      });
      // If sending fails, remove the optimistic message from the UI
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
    } finally {
      setLoading(false); // Reset loading state
      scrollToBottom(); // Ensure chat view scrolls to the bottom
    }
  };

  // Handles sending game results as a message (re-uses sendMessage logic)
  const sendGameResult = async (message: string) => {
    if (!selectedFriend || !user) return;

    console.log('Sending game result:', message);
    
    // Trigger the sendMessage function with the game result
    await sendMessage({
      preventDefault: () => {}, // Mock a default event object for the function signature
      target: {
        value: message // Pass the game message as if it came from the input
      }
    } as unknown as React.FormEvent);

    toast({
      title: "Game Result Sent",
      description: "Your game result has been shared!"
    });
  };

  // Utility function to format timestamps for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render logic: Show conversation list or active chat
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
                          {conversation.lastMessage.content || (conversation.lastMessage.image_url ? 'Image' : 'No message')}
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

  // Determine if send button should be enabled
  const canSend = (newMessage.trim() || imageUrl) && !loading;

  // Render chat interface if a friend is selected
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chat Section */}
        <div className="lg:col-span-2">
          <Card className="h-[calc(100vh-180px)] flex flex-col">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFriend(null)} // Go back to conversation list
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
                        {message.content && <p className="text-sm">{message.content}</p>}
                        {message.image_url && (
                          <img
                            src={message.image_url}
                            alt="Shared image"
                            className="mt-2 max-w-full h-auto rounded cursor-pointer"
                            onClick={() => window.open(message.image_url!, '_blank')}
                          />
                        )}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        <span className="font-medium">{message.sender?.username || 'Unknown'}</span>
                        {' • '}
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
        {showGames && (
          <div className="lg:col-span-1">
            <GameMenu onSendResult={sendGameResult} />
          </div>
        )}
      </div>
    </div>
  );
};
