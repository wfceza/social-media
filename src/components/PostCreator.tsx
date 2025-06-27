
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ImageUpload } from './ImageUpload';

export const PostCreator = () => {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !imageUrl) || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          content: content.trim() || '',
          author_id: user.id,
          author_email: user.email || '',
          author_name: user.email?.split('@')[0] || 'Anonymous',
          image_url: imageUrl || null,
        });

      if (error) throw error;
      
      setContent('');
      setImageUrl('');
      toast({ title: "Post created!", description: "Your post has been shared." });
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create post. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const canPost = (content.trim() || imageUrl) && !loading;

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] resize-none border-0 focus-visible:ring-0 text-lg placeholder:text-gray-500"
            maxLength={500}
          />
          <div className="flex items-center justify-between">
            <ImageUpload
              onImageUploaded={setImageUrl}
              onImageRemoved={() => setImageUrl('')}
              currentImageUrl={imageUrl}
              disabled={loading}
            />
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {content.length}/500
              </span>
              <Button
                type="submit"
                disabled={!canPost}
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {loading ? 'Posting...' : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Post
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
