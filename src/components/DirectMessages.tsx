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
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url?: string | null; // image_url can be null
  created_at: string;
  sender?: Profile; // Nested sender profile for displaying user info
}

interface Conversation {
  friend: Profile;
  lastMessage?: DirectMessage; // Last message in the conversation
}

// Main DirectMessages component
export const DirectMessages = () => {
  const { user } = useAuth(); // Get current authenticated user
  const [friends, setFriends] = useState<Profile[]>([]); // List of friends
  const [conversations, setConversations] = useState<Conversation[]>([]); // List of conversations with friends
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null); // Currently selected friend for chat
  const [messages, setMessages] = useState<DirectMessage[]>([]); // Messages for the current conversation
  const [newMessage, setNewMessage] = useState(''); // State for the new message input
  const [imageUrl, setImageUrl] = useState(''); // State for image URL to send
  const [loading, setLoading] = useState(false); // Loading state for sending messages
  const [showGames, setShowGames] = useState(false); // State to toggle game menu visibility
  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for auto-scrolling to the latest message

  // Effect to scroll to the bottom of the messages whenever messages state changes
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Effect to fetch friends when the user object is available (on authentication/load)
  useEffect(() => {
    if (user) {
      fetchFriends();
    }
  }, [user]);

  // Effect to fetch messages and mark them as read when a friend is selected or user changes
  useEffect(() => {
    if (selectedFriend && user) {
      fetchMessages();
      markMessagesAsRead();
    }
  }, [selectedFriend, user]);

  // Real-time subscription for direct messages
  useEffect(() => {
    if (!user || !selectedFriend) return; // Only subscribe if user and friend are selected

    console.log('Setting up real-time subscription for messages');

    // Create a unique channel for the specific conversation
    // This helps in more granular control and avoids listening to all messages
    const channel = supabase
      .channel(`direct_messages_${user.id}_${selectedFriend.id}`)
      .on('postgres_changes',
        {
          event: 'INSERT', // Listen for new message inserts
          schema: 'public',
          table: 'direct_messages',
          // Filter to only include messages between the current user and the selected friend
          filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${selectedFriend.id}),and(sender_id.eq.${selectedFriend.id},receiver_id.eq.${user.id}))`
        },
        async (payload) => {
          console.log('New direct message received:', payload.new);

          // After receiving a new message notification, fetch its full details including sender profile
          // This is important because the payload.new only contains the raw message data
          const { data: messageWithSender } = await supabase
            .from('direct_messages')
            .select(`
              *,
              sender:profiles!direct_messages_sender_id_fkey(id, username, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();

          if (messageWithSender) {
            setMessages(prev => {
              // Prevent adding duplicate messages, especially with optimistic updates
              const exists = prev.some(msg => msg.id === messageWithSender.id);
              if (exists) return prev;
              return [...prev, messageWithSender]; // Add the new message to the state
            });

            // Re-fetch conversations to update the "last message" display
            // and potentially re-sort the conversation list
            fetchConversations(friends);

            // Show a toast notification for new messages from the other person
            if (messageWithSender.sender_id !== user.id) {
              toast({
                title: "New Message",
                description: `${messageWithSender.sender?.username || 'Friend'}: ${messageWithSender.content?.substring(0, 50)}...`
              });
            }
          }
        }
      )
      .subscribe(); // Start the real-time subscription

    // Cleanup function: unsubscribe from the channel when the component unmounts
    // or when user/selectedFriend changes, to prevent memory leaks
    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user, selectedFriend, friends]); // Dependencies for the effect

  // Function to fetch the list of friends
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
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`); // Get friendships where current user is either user1 or user2

      if (error) throw error;

      // Extract the friend's profile from the friendship data
      const friendsList = data?.map(friendship => {
        return friendship.user1_id === user?.id ? friendship.user2 : friendship.user1;
      }) || [];

      setFriends(friendsList);
      // After fetching friends, also fetch their latest conversations
      await fetchConversations(friendsList);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  // Function to fetch the latest message for each conversation
  const fetchConversations = async (friendsList: Profile[]) => {
    const conversationPromises = friendsList.map(async (friend) => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        // Filter for messages between current user and this specific friend
        .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${user?.id})`)
        .order('created_at', { ascending: false }) // Get the latest message
        .limit(1)
        .single(); // Expect only one result

      return {
        friend,
        lastMessage: error ? undefined : data // If no message, lastMessage is undefined
      };
    });

    // Wait for all conversation promises to resolve
    const conversations = await Promise.all(conversationPromises);
    // Sort conversations by the latest message's timestamp
    setConversations(conversations.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0; // No messages for both
      if (!a.lastMessage) return 1; // 'a' has no message, put 'b' first
      if (!b.lastMessage) return -1; // 'b' has no message, put 'a' first
      return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
    }));
  };

  // Function to fetch all messages for the currently selected conversation
  const fetchMessages = async () => {
    if (!selectedFriend || !user) return; // Requires a selected friend and authenticated user

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          *,
          sender:profiles!direct_messages_sender_id_fkey(id, username, avatar_url)
        `)
        // Filter messages between the two users
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedFriend.id}),and(sender_id.eq.${selectedFriend.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true }); // Order messages chronologically

      if (error) throw error;

      setMessages(data || []); // Update messages state
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Function to mark messages as read for the current user in the selected conversation
  const markMessagesAsRead = async () => {
    if (!selectedFriend || !user) return;

    try {
      await supabase
        .from('direct_messages')
        .update({ read_at: new Date().toISOString() }) // Set read_at timestamp
        .eq('sender_id', selectedFriend.id) // Messages sent by the selected friend
        .eq('receiver_id', user.id) // Received by the current user
        .is('read_at', null); // Only mark unread messages
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Function to send a direct message (optimized with optimistic UI)
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission behavior

    // Don't send if no content/image or no selected friend/user
    if ((!newMessage.trim() && !imageUrl) || !selectedFriend || !user) return;

    setLoading(true); // Set loading state

    // 1. Prepare message content and a temporary ID for optimistic update
    const tempMessageId = `temp-${Date.now()}`; // Unique temporary ID
    const messageContent = newMessage.trim() || '';
    const messageImageUrl = imageUrl || null;

    // Create a local representation of the message (optimistic)
    const optimisticMessage: DirectMessage = {
      id: tempMessageId,
      sender_id: user.id,
      receiver_id: selectedFriend.id,
      content: messageContent,
      image_url: messageImageUrl,
      created_at: new Date().toISOString(), // Use current time for optimistic display
      sender: {
        id: user.id,
        username: user.email?.split('@')[0] || 'You', // Display 'You' for sender's own message
        avatar_url: user.user_metadata?.avatar_url || null // Assuming avatar is in user_metadata
      }
    };

    // 2. Immediately update the UI with the optimistic message
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage(''); // Clear input fields instantly
    setImageUrl('');

    try {
      // 3. Send the message to Supabase and retrieve the actual inserted row
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedFriend.id,
          content: messageContent,
          image_url: messageImageUrl
        })
        .select(`
          *,
          sender:profiles!direct_messages_sender_id_fkey(id, username, avatar_url)
        `) // Select all columns and sender profile
        .single(); // Expect a single inserted row

      if (error) throw error;

      // 4. On successful insert, replace the optimistic message with the real one
      // This updates the ID and exact timestamp from the database
      setMessages(prev => prev.map(msg =>
        msg.id === optimisticMessage.id ? data : msg
      ));

      // 5. Update conversation list to reflect the new last message (if applicable)
      fetchConversations(friends);

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive"
      });
      // 6. On error, remove the optimistic message from the UI
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
    } finally {
      setLoading(false); // Reset loading state
      scrollToBottom(); // Ensure view is at the bottom after operation
    }
  };

  // Function to send game results as a message
  const sendGameResult = async (message: string) => {
    if (!selectedFriend || !user) return; // Needs a selected friend and user

    console.log('Attempting to send game result:', message);

    // Call sendMessage function directly with the game result message
    // This will now benefit from the optimistic update logic
    await sendMessage({
      preventDefault: () => {}, // Mock event object
      target: {
        value: message
      }
    } as unknown as React.FormEvent); // Cast to React.FormEvent

    // Additional toast for game result specific success (optional, sendMessage already toasts for errors)
    toast({
      title: "Game Result Sent",
      description: "Your game result has been shared!"
    });
  };


  // Helper function to format timestamps
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Conditional rendering: Show conversation list if no friend is selected
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
                    onClick={() => setSelectedFriend(conversation.friend)} // Select friend on click
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
                      message.sender_id === user?.id ? 'flex-row-reverse space-x-reverse' : '' // Align messages based on sender
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
                            onClick={() => window.open(message.image_url!, '_blank')} // Open image in new tab
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
              <div ref={messagesEndRef} /> {/* Element to scroll to */}
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
                  {!imageUrl && ( // Only show image upload button if no image is currently selected
                    <ImageUpload
                      onImageUploaded={setImageUrl}
                      onImageRemoved={() => setImageUrl('')}
                      disabled={loading}
                    />
                  )}
                  <Button
                    type="button" // Important: change to "button" to prevent form submission
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
