-- Create activity table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on activity
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;

-- Users can insert their own activity
CREATE POLICY "Users can insert their own activity" ON activity
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own activity
CREATE POLICY "Users can view their own activity" ON activity
    FOR SELECT USING (auth.uid() = user_id);
