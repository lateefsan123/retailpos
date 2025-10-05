-- Create pending_registrations table
-- This table stores user registrations that are waiting for admin approval

CREATE TABLE IF NOT EXISTS public.pending_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    business_type VARCHAR(100) NOT NULL,
    business_description TEXT,
    business_address TEXT NOT NULL,
    business_phone VARCHAR(20),
    currency VARCHAR(3) DEFAULT 'USD',
    website VARCHAR(255),
    vat_number VARCHAR(50),
    open_time TIME,
    close_time TIME,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved BOOLEAN DEFAULT FALSE,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by INTEGER REFERENCES public.users(user_id),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pending_registrations_status ON public.pending_registrations(status);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_user_id ON public.pending_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_created_at ON public.pending_registrations(created_at);

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;

-- Policy to allow admins to read all pending registrations
CREATE POLICY "Admins can view all pending registrations" ON public.pending_registrations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE user_id = auth.uid()::integer 
            AND role = 'admin'
        )
    );

-- Policy to allow admins to update pending registrations
CREATE POLICY "Admins can update pending registrations" ON public.pending_registrations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE user_id = auth.uid()::integer 
            AND role = 'admin'
        )
    );

-- Policy to allow system to insert pending registrations
CREATE POLICY "System can insert pending registrations" ON public.pending_registrations
    FOR INSERT WITH CHECK (true);

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pending_registrations_updated_at 
    BEFORE UPDATE ON public.pending_registrations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

