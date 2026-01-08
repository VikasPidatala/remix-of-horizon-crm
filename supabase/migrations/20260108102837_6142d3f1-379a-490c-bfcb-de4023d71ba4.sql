-- Add end_date column to holidays table and rename date to start_date
ALTER TABLE public.holidays RENAME COLUMN date TO start_date;
ALTER TABLE public.holidays ADD COLUMN end_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Update end_date to equal start_date for existing records
UPDATE public.holidays SET end_date = start_date;