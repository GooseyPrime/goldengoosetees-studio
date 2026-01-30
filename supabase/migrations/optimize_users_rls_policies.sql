-- ============================================
-- Migration: Optimize RLS Policies for public.users
-- ============================================
-- 
-- Purpose: Enhance Row-Level Security on public.users table per Supabase best practices
-- 
-- Changes:
-- 1. Optimize existing policies with subselect pattern for better plan caching
-- 2. Add missing DELETE policy for users table
-- 3. Add performance index on users.id (policy filter column)
-- 4. Update admin policies to use optimized pattern
--
-- Issue: RLS Disabled in Public - Entity: public.users
-- Root Cause: While RLS was enabled, policies needed optimization for:
--   - Plan caching (subselect pattern)
--   - Complete CRUD coverage (missing DELETE)
--   - Query performance (index on policy columns)
--
-- ============================================

-- ============================================
-- Step 1: Add performance index on users.id
-- (Though id is PK, explicit index helps policy checks)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_id_rls ON users(id);

-- ============================================
-- Step 2: Drop existing user policies
-- ============================================
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- ============================================
-- Step 3: Create optimized policies with subselect pattern
-- Using (SELECT auth.uid()) for better PostgreSQL plan caching
-- ============================================

-- SELECT: Users can view their own profile
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT 
    TO authenticated
    USING ((SELECT auth.uid()) = id);

-- INSERT: Users can insert their own profile
CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT 
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = id);

-- UPDATE: Users can update their own profile
CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE 
    TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

-- DELETE: Users can delete their own profile (if needed)
-- Note: This allows users to delete their own accounts
-- Consider disabling if soft-delete pattern is preferred
CREATE POLICY "Users can delete their own profile" ON users
    FOR DELETE 
    TO authenticated
    USING ((SELECT auth.uid()) = id);

-- ============================================
-- Step 4: Create optimized admin policies
-- Admins can view all users (using role-based check)
-- ============================================
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

-- Admins can update any user profile
CREATE POLICY "Admins can update all users" ON users
    FOR UPDATE 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = (SELECT auth.uid()) 
            AND role = 'admin'
        )
    );

-- ============================================
-- Step 5: Verify RLS is enabled (idempotent)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

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
-- AND tablename = 'users'
-- ORDER BY policyname;
