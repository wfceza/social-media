
import { useState, useEffect } from 'react';
import { PostCreator } from './PostCreator';
import { PostItem } from './PostItem';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Post {
  id: string;
  content: string;
  author_name: string;
  author_email: string;
  created_at: string;
  likes: string[];
  comments: Array<{
    id: string;
    content: string;
    author_name: string;
    created_at: string;
  }>;
}

export const PostFeed = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchPosts = async () => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Fetch likes and comments for each post
      const postsWithData = await Promise.all(
        (postsData || []).map(async (post) => {
          const { data: likesData } = await supabase
            .from('likes')
            .select('user_id')
            .eq('post_id', post.id);

          const { data: commentsData } = await supabase
            .from('comments')
            .select('*')
            .eq('post_id', post.id)
            .order('created_at', { ascending: true });

          return {
            ...post,
            likes: likesData?.map(like => like.user_id) || [],
            comments: commentsData?.map(comment => ({
              id: comment.id,
              content: comment.content,
              author_name: comment.author_name,
              created_at: comment.created_at
            })) || []
          };
        })
      );

      setPosts(postsWithData);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user]);

  // Set up real-time subscription for posts, likes, and comments
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('posts_realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'posts' },
        () => {
          console.log('Posts table changed, refetching...');
          fetchPosts();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'likes' },
        () => {
          console.log('Likes table changed, refetching...');
          fetchPosts();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        () => {
          console.log('Comments table changed, refetching...');
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <PostCreator />
      
      {posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No posts yet. Be the first to share something!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostItem 
              key={post.id} 
              post={{
                ...post,
                authorName: post.author_name,
                authorEmail: post.author_email,
                timestamp: post.created_at
              }} 
            />
          ))}
        </div>
      )}
    </div>
  );
};
