
-- Add voice_url column to direct_messages table
ALTER TABLE public.direct_messages 
ADD COLUMN voice_url text;
