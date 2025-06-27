
import { useState } from 'react';
import { PostCreator } from './PostCreator';
import { PostItem } from './PostItem';

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
    authorName: string;
    timestamp: string;
  }>;
}

export const PostFeed = () => {
  const [posts] = useState<Post[]>([]);
  const [loading] = useState(false);

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
          <p className="text-sm text-gray-400 mt-2">
            Database tables will be set up soon to store your posts.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostItem key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};
