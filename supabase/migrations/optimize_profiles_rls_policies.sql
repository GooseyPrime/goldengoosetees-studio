-- ============================================
-- Migration: Optimize RLS Policies for public.profiles
-- ============================================
-- 
-- Purpose: Enhance Row-Level Security on public.profiles table per Supabase best practices
-- 
-- Changes:
-- 1. Optimize existing policies with subselect pattern for better plan caching
-- 2. Add missing DELETE policy for profiles table
-- 3. Add missing admin UPDATE policy for profiles table
-- 4. Update admin policies to use optimized pattern
--
-- Issue: RLS Disabled in Public - Entity: public.profiles
-- Root Cause: While RLS was enabled, policies needed optimization for:
--   - Plan caching (subselect pattern)
--   - Complete CRUD coverage (missing DELETE)
--   - Complete admin coverage (missing UPDATE)
--
-- ============================================

-- ============================================
-- Step 1: Drop existing user policies (for idempotency)
-- ============================================
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all users" ON profiles;
DROP POLICY IF EXISTS "Admins can update all users" ON profiles;

-- ============================================
-- Step 2: Create optimized policies with subselect pattern
-- Using (SELECT auth.uid()) for better PostgreSQL plan caching
-- ============================================

-- SELECT: Users can view their own profile
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT 
    TO authenticated
    USING ((SELECT auth.uid()) = id);

-- INSERT: Users can insert their own profile
CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT 
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = id);

-- UPDATE: Users can update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE 
    TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

-- DELETE: Users can delete their own profile (if needed)
-- Note: This allows users to delete their own accounts
-- Consider disabling if soft-delete pattern is preferred
CREATE POLICY "Users can delete their own profile" ON profiles
    FOR DELETE 
    TO authenticated
    USING ((SELECT auth.uid()) = id);

-- ============================================
-- Step 3: Create optimized admin policies
-- Admins can view all users (using role-based check)
-- ============================================
CREATE POLICY "Admins can view all users" ON profiles
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

-- Admins can update any user profile
CREATE POLICY "Admins can update all users" ON profiles
    FOR UPDATE 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

-- ============================================
-- Step 4: Verify RLS is enabled (idempotent)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Validation Query
-- Run this to verify policies are applied correctly
-- ============================================
-- SELECT 
--     schemaname, 
--     tablename, 
--     policyname, 
--     permissive,
--     roles,
--     cmd,
--     qual,
--     with_check
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename = 'profiles'
-- ORDER BY policyname;
