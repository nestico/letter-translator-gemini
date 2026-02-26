-- RLS Policy Update to allow Golden Reference Imports
-- This allows the system script (using the anon key) to seed high-fidelity translation data.

-- 1. Check if the policy exists and drop it if needed
DROP POLICY IF EXISTS "System can insert golden references" ON public.translations;

-- 2. Create the policy
CREATE POLICY "System can insert golden references"
ON public.translations
FOR INSERT
TO anon
WITH CHECK (
    user_id = '82551711-7881-4f84-847d-86b4f716ed2c' 
    AND is_golden = true
);

-- 3. Also ensure anon has SELECT access to these golden references for the Dynamic Learning to work
DROP POLICY IF EXISTS "Anyone can view golden references" ON public.translations;

CREATE POLICY "Anyone can view golden references"
ON public.translations
FOR SELECT
TO anon
USING (is_golden = true);
