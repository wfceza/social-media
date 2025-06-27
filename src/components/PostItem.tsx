
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageSquare, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Post {
  id: string;
  content: string;
  authorName: string;
  authorEmail: string;
  timestamp: string;
  likes: string[];
  comments: Array<{
    id: string;
    content: string;
    author_name: string;
    created_at: string;
  }>;
}

interface PostItemProps {
  post: Post;
}

export const PostItem = ({ post }: PostItemProps) => {
  const [showComments, setShowComments] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const isLiked = user && post.likes.includes(user.id);
  const likeCount = post.likes.length;

  const handleLike = async () => {
    if (!user) return;

    try {
      if (isLiked) {
        // Unlike the post
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Like the post
        const { error } = await supabase
          .from('likes')
          .insert({
            post_id: post.id,
            user_id: user.id
          });

        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Error updating like:', error);
      toast({ 
        title: "Error", 
        description: "Failed to update like. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          content: commentContent.trim(),
          author_id: user.id,
          author_name: user.email?.split('@')[0] || 'Anonymous'
        });

      if (error) throw error;

      setCommentContent('');
      toast({ title: "Comment added!", description: "Your comment has been posted." });
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast({ 
        title: "Error", 
        description: "Failed to add comment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    );
  };

  return (
    <Card className="mb-4 transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3 mb-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              {post.authorName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-sm">{post.authorName}</h3>
              <span className="text-xs text-gray-500">
                {formatTimestamp(post.timestamp)}
              </span>
            </div>
            <p className="mt-2 text-gray-800 leading-relaxed">{post.content}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`flex items-center space-x-2 ${
              isLiked ? 'text-red-500 hover:text-red-600' : 'text-gray-500 hover:text-red-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            <span>{likeCount}</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-2 text-gray-500 hover:text-blue-500"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{post.comments.length}</span>
          </Button>
        </div>

        {showComments && (
          <div className="mt-4 space-y-3">
            <form onSubmit={handleComment} className="flex space-x-2">
              <Input
                placeholder="Write a comment..."
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                className="flex-1"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!commentContent.trim() || loading}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>

            <div className="space-y-2">
              {post.comments.map((comment) => (
                <div key={comment.id} className="flex items-start space-x-2 bg-gray-50 rounded-lg p-3">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="bg-gradient-to-r from-purple-400 to-blue-400 text-white text-xs">
                      {comment.author_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">{comment.author_name}</span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
