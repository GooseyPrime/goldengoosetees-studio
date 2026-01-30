# Quick Reference: Applying RLS Optimizations

## For Existing Databases

### Option 1: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to: **SQL Editor**
3. Copy and paste the contents of: `supabase/migrations/optimize_users_rls_policies.sql`
4. Click **Run** to execute the migration
5. Verify with the validation query at the bottom of the migration file

### Option 2: Using Supabase CLI
```bash
# Make sure you're in the project directory
cd /path/to/goldengoosetees-kiosk

# Apply the migration
supabase db push

# Or apply a specific migration file
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/optimize_users_rls_policies.sql
```

---

## For Fresh Deployments

The optimizations are already included in `supabase/schema.sql`. Simply:

```bash
# Reset database to schema
supabase db reset

# Or create fresh database from schema
psql -h your-db-host -U postgres -d postgres -f supabase/schema.sql
```

---

## Verification Steps

### 1. Check RLS is Enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';
```

Expected result: `rowsecurity = true`

### 2. List All Policies
```sql
SELECT 
    policyname, 
    cmd as operation,
    roles,
    qual::text as using_clause
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'users'
ORDER BY cmd, policyname;
```

Expected: 6 policies
- **SELECT**: "Users can view their own profile", "Admins can view all users"
- **INSERT**: "Users can insert their own profile"
- **UPDATE**: "Users can update their own profile", "Admins can update all users"
- **DELETE**: "Users can delete their own profile"

### 3. Test Policies (Safe to Run)
```sql
-- This query will show policy definitions
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual::text as using_expression,
    with_check::text as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'users';
```

---

## Testing with Actual Queries

### Test 1: Authenticated User Viewing Own Profile
```javascript
// In your application, with authenticated user
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

// Should succeed and return user's own data
```

### Test 2: Authenticated User Viewing Other Profiles
```javascript
// Try to access another user's profile
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', 'some-other-user-id')
  .single();

// Should fail with RLS policy violation
// or return empty result
```

### Test 3: Admin Viewing All Users
```javascript
// With authenticated admin user (role = 'admin')
const { data, error } = await supabase
  .from('users')
  .select('*');

// Should succeed and return all users
```

### Test 4: User Deleting Own Account
```javascript
// With authenticated user
const { error } = await supabase
  .from('users')
  .delete()
  .eq('id', userId);

// Should succeed (NEW functionality)
```

---

## Rollback (If Needed)

If you need to revert changes:

```sql
-- Drop new policies
DROP POLICY IF EXISTS "Users can delete their own profile" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Recreate old policies (without subselect pattern)
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );
```

---

## Common Issues & Solutions

### Issue: "relation 'users' does not exist"
**Solution**: Make sure the users table is created first. Run the full schema.sql or create the table.

### Issue: "permission denied for table users"
**Solution**: Ensure you're connected with proper permissions (postgres/supabase service role).

### Issue: Policies still using old pattern
**Solution**: Drop all user policies and recreate them using the migration script.

### Issue: "role 'authenticated' does not exist"
**Solution**: This is a Supabase Auth role. Ensure Supabase Auth is properly set up in your project.

---

## Performance Benchmarking (Optional)

To measure performance improvement:

```sql
-- Before optimization (if you kept a backup)
EXPLAIN ANALYZE
SELECT * FROM users WHERE id = 'user-uuid-here';

-- After optimization
EXPLAIN ANALYZE
SELECT * FROM users WHERE id = 'user-uuid-here';

-- Compare the query plans and execution times
```

---

## Support & Documentation

- **Full Documentation**: See `RLS_OPTIMIZATION.md` for detailed explanation
- **Supabase RLS Docs**: https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL RLS Docs**: https://www.postgresql.org/docs/current/ddl-rowsecurity.html

---

## Migration Checklist

- [ ] Back up your database (if production)
- [ ] Review migration file: `supabase/migrations/optimize_users_rls_policies.sql`
- [ ] Apply migration via dashboard or CLI
- [ ] Run verification queries above
- [ ] Test with authenticated users in your app
- [ ] Test with admin users in your app
- [ ] Monitor logs for any RLS policy violations
- [ ] Update any affected application code (if needed)

**Note**: These changes are backwards-compatible. Existing application code should work without modifications.
