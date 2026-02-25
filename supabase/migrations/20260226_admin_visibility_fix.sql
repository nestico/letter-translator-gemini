
-- Policy for 'activity' table: Admins can view all activity
CREATE POLICY "Admins can view all activity" ON public.activity
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy for 'translations' table: Admins can view all translations
CREATE POLICY "Admins can view all translations" ON public.translations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
