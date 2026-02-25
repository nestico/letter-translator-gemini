
-- Drop old recursive policies if they exist
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all activity" ON public.activity;
DROP POLICY IF EXISTS "Admins can view all translations" ON public.translations;

-- Create a security definer function to check for admin status without recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply policies using the non-recursive function
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can view all activity" ON public.activity
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can view all translations" ON public.translations
    FOR SELECT USING (public.is_admin());
