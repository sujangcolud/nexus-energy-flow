/*
  # Add Share Investments and Opening Balances Tables

  1. New Tables
    - `share_investments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `shareholder_name` (text)
      - `contribution_amount` (numeric)
      - `investment_date` (date)
      - `payment_mode` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `opening_balances`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `cutoff_date` (date)
      - `opening_balance_amount` (numeric)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for user access and super admin management

  3. Updates
    - Fix profiles table to include role information
    - Update user management functions
*/

-- Fix the profiles table to include proper user data that UserManagementTab expects
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text;

-- Create share_investments table for the new Share Investments tab
CREATE TABLE IF NOT EXISTS public.share_investments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  shareholder_name text NOT NULL,
  contribution_amount numeric NOT NULL,
  investment_date date DEFAULT CURRENT_DATE,
  payment_mode text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create opening_balances table for cutoff date and opening balance management
CREATE TABLE IF NOT EXISTS public.opening_balances (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  cutoff_date date NOT NULL,
  opening_balance_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id) -- Only one opening balance per user
);

-- Enable RLS on share_investments table
ALTER TABLE public.share_investments ENABLE ROW LEVEL SECURITY;

-- RLS policies for share_investments
CREATE POLICY "Super users can view all share investments" 
  ON public.share_investments 
  FOR SELECT 
  USING (has_role('super_user'::app_role) OR has_role('super_admin'::app_role));

CREATE POLICY "Users can manage own share investments" 
  ON public.share_investments 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Enable RLS on opening_balances table
ALTER TABLE public.opening_balances ENABLE ROW LEVEL SECURITY;

-- RLS policies for opening_balances
CREATE POLICY "Super users can view all opening balances" 
  ON public.opening_balances 
  FOR SELECT 
  USING (has_role('super_user'::app_role) OR has_role('super_admin'::app_role));

CREATE POLICY "Users can manage own opening balances" 
  ON public.opening_balances 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Update the handle_new_user function to properly create profiles with role information
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email
  );
  
  -- Assign default user role (first user gets super_admin, others get user)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN (SELECT COUNT(*) FROM auth.users) = 1 THEN 'super_admin'::app_role
      ELSE 'user'::app_role
    END
  );
  
  -- Update profile with role information
  UPDATE public.profiles 
  SET role = (SELECT role::text FROM public.user_roles WHERE user_id = NEW.id LIMIT 1)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Create a function to get user profiles with roles for the UserManagementTab
CREATE OR REPLACE FUNCTION public.get_user_profiles_with_roles()
RETURNS TABLE(
  id uuid,
  email text,
  first_name text,
  last_name text,
  role text,
  created_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    COALESCE(ur.role::text, 'user') as role,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE public.is_super_admin();
$$;

-- Create trigger to update role in profiles when user_roles changes
CREATE OR REPLACE FUNCTION public.sync_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.profiles 
    SET role = NEW.role::text
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles 
    SET role = 'user'
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger on user_roles to sync with profiles
DROP TRIGGER IF EXISTS sync_profile_role_trigger ON public.user_roles;
CREATE TRIGGER sync_profile_role_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role();