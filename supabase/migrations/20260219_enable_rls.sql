-- Enable Row Level Security
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own translations
CREATE POLICY "Users can only view their own translations"
ON translations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can only insert their own translations
CREATE POLICY "Users can only insert their own translations"
ON translations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own translations (if editing allowed)
CREATE POLICY "Users can only update their own translations"
ON translations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own translations
CREATE POLICY "Users can only delete their own translations"
ON translations FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
