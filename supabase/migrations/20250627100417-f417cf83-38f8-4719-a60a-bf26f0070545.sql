
-- Create a storage bucket for uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Create storage policies for the uploads bucket
CREATE POLICY "Users can upload files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view all files" ON storage.objects
FOR SELECT USING (bucket_id = 'uploads');

CREATE POLICY "Users can delete their own files" ON storage.objects
FOR DELETE USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add image_url column to posts table for image attachments
ALTER TABLE public.posts ADD COLUMN image_url TEXT;

-- Add image_url column to messages table for image attachments
ALTER TABLE public.messages ADD COLUMN image_url TEXT;
