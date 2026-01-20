-- Create calls table for tracking phone calls
CREATE TABLE public.calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  call_date DATE NOT NULL DEFAULT CURRENT_DATE,
  call_time TIME,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Create policies for all authenticated users
CREATE POLICY "Authenticated users can view all calls" 
ON public.calls 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create calls" 
ON public.calls 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update calls" 
ON public.calls 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete calls" 
ON public.calls 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_calls_updated_at
BEFORE UPDATE ON public.calls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create activity log trigger for calls
CREATE OR REPLACE FUNCTION public.trg_activity_log_calls()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  a record;
  v_action text;
  v_details text;
BEGIN
  SELECT * INTO a FROM public.get_actor();

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_details := 'a call: ' || COALESCE(NEW.phone, '');
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
    v_details := 'a call: ' || COALESCE(NEW.phone, '');
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_details := 'a call: ' || COALESCE(OLD.phone, '');
  END IF;

  INSERT INTO public.activity_logs (user_id, user_name, user_role, module, action, details)
  VALUES (a.actor_id, a.actor_name, a.actor_role, 'calls', v_action, v_details);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_calls_activity_log
AFTER INSERT OR UPDATE OR DELETE ON public.calls
FOR EACH ROW
EXECUTE FUNCTION public.trg_activity_log_calls();