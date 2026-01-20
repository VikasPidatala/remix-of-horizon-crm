-- Add reminder fields to calls table
ALTER TABLE public.calls 
ADD COLUMN reminder_date date,
ADD COLUMN reminder_time time without time zone;