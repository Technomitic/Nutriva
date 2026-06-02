-- Create chat-images storage bucket for chat image attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload chat images
CREATE POLICY "Authenticated users can upload chat images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-images');

-- Allow anyone to view chat images (public bucket)
CREATE POLICY "Anyone can view chat images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-images');

-- Allow authenticated users to delete their chat images
CREATE POLICY "Authenticated users can delete chat images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-images');

-- Also add 'image' to the allowed type values for chat_messages if you have a constraint
-- ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_type_check;
-- ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_type_check CHECK (type IN ('text', 'qr', 'image'));
