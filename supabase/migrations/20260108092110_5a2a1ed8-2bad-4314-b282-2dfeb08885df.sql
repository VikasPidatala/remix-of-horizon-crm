-- Create holidays table
CREATE TABLE public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date date NOT NULL,
  message text,
  image_url text,
  created_by text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view holidays
CREATE POLICY "Authenticated users can view holidays"
ON public.holidays
FOR SELECT
USING (true);

-- Only admins can create holidays
CREATE POLICY "Admins can create holidays"
ON public.holidays
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update holidays
CREATE POLICY "Admins can update holidays"
ON public.holidays
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete holidays
CREATE POLICY "Admins can delete holidays"
ON public.holidays
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_holidays_updated_at
BEFORE UPDATE ON public.holidays
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();