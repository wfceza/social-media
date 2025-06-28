import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Check, X, Users } from 'lucide-react';

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
}

export const FriendRequests = () => {
  const { user } = useAuth();
  const [searchUsername, setSearchUsername] = useState('');
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFriendRequests();
      fetchFriends();
    }
  }, [user]);

  const fetchFriendRequests = async () => {
    try {
      // Fetch pending requests received
      const { data: received, error: receivedError } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:profiles!friend_requests_sender_id_fkey(id, username, avatar_url)
        `)
        .eq('receiver_id', user?.id)
        .eq('status', 'pending');

      if (receivedError) throw receivedError;

      // Fetch sent requests
      const { data: sent, error: sentError } = await supabase
        .from('friend_requests')
        .select(`
          *,
          receiver:profiles!friend_requests_receiver_id_fkey(id, username, avatar_url)
        `)
        .eq('sender_id', user?.id)
        .eq('status', 'pending');

      if (sentError) throw sentError;

      setPendingRequests(received || []);
      setSentRequests(sent || []);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  };

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
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const sendFriendRequest = async () => {
    if (!searchUsername.trim() || !user) return;

    setLoading(true);
    try {
      // Find user by username in profiles table
      const { data: targetProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', searchUsername.trim())
        .single();

      if (profileError || !targetProfile) {
        toast({ title: "User not found", variant: "destructive" });
        return;
      }

      if (targetProfile.id === user.id) {
        toast({ title: "You cannot send a friend request to yourself", variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: targetProfile.id
        });

      if (error) {
        if (error.code === '23505') {
          toast({ title: "Friend request already sent", variant: "destructive" });
        } else {
          throw error;
        }
        return;
      }

      toast({ title: "Friend request sent!" });
      setSearchUsername('');
      fetchFriendRequests();
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const respondToFriendRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      toast({ title: `Friend request ${status}!` });
      fetchFriendRequests();
      if (status === 'accepted') {
        fetchFriends();
      }
    } catch (error: any) {
      console.error('Error responding to friend request:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Send Friend Request */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5" />
            <span>Add Friend</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              placeholder="Enter friend's username"
              type="text"
            />
            <Button
              onClick={sendFriendRequest}
              disabled={loading || !searchUsername.trim()}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Send Request
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Friend Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Friend Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    {request.sender?.avatar_url ? (
                      <AvatarImage src={request.sender.avatar_url} />
                    ) : (
                      <AvatarFallback>
                        {request.sender?.username?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-medium">{request.sender?.username || 'Unknown User'}</p>
                    <p className="text-sm text-gray-500">Sent a friend request</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => respondToFriendRequest(request.id, 'accepted')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => respondToFriendRequest(request.id, 'rejected')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Friends List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Friends ({friends.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {friends.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No friends yet. Send some friend requests!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {friends.map((friend) => (
                <div key={friend.id} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Avatar>
                    {friend.avatar_url ? (
                      <AvatarImage src={friend.avatar_url} />
                    ) : (
                      <AvatarFallback>
                        {friend.username?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-medium">{friend.username || 'Unknown User'}</p>
                    <p className="text-sm text-gray-500">Friend</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sent Requests */}
      {sentRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sent Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sentRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    {request.receiver?.avatar_url ? (
                      <AvatarImage src={request.receiver.avatar_url} />
                    ) : (
                      <AvatarFallback>
                        {request.receiver?.username?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-medium">{request.receiver?.username || 'Unknown User'}</p>
                    <p className="text-sm text-gray-500">Request pending</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
