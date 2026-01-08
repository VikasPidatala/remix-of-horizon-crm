-- Create storage bucket for holiday images
INSERT INTO storage.buckets (id, name, public)
VALUES ('holiday-images', 'holiday-images', true);

-- Allow authenticated users to view holiday images
CREATE POLICY "Anyone can view holiday images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'holiday-images');

-- Only admins can upload holiday images
CREATE POLICY "Admins can upload holiday images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'holiday-images' AND has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update holiday images
CREATE POLICY "Admins can update holiday images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'holiday-images' AND has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete holiday images
CREATE POLICY "Admins can delete holiday images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'holiday-images' AND has_role(auth.uid(), 'admin'::app_role));