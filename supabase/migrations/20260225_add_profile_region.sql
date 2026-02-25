-- Add region column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region text DEFAULT 'Global';

-- Update the handle_new_user function if necessary, 
-- but we usually set the region manually for now or via a future UI picker.
