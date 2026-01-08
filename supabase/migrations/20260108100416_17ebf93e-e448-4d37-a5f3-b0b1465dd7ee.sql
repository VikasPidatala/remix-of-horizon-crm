-- Create a table for storing the holidays overview image
CREATE TABLE public.holiday_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  overview_image_url text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by text
);

-- Enable RLS
ALTER TABLE public.holiday_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view the settings
CREATE POLICY "Authenticated users can view holiday settings" 
ON public.holiday_settings 
FOR SELECT 
USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert holiday settings" 
ON public.holiday_settings 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update
CREATE POLICY "Admins can update holiday settings" 
ON public.holiday_settings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert a default row
INSERT INTO public.holiday_settings (id, overview_image_url, updated_by)
VALUES ('00000000-0000-0000-0000-000000000001', null, 'System');