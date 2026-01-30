# Database Migrations

This directory contains SQL migration files for the Golden Goose Tees Kiosk database.

## Current Migrations

### 1. `optimize_users_rls_policies.sql`
**Purpose**: Optimize Row-Level Security (RLS) policies for the `public.users` table and other tables.

**Changes**:
- Adds missing DELETE policy for users
- Adds missing admin UPDATE policy for users
- Optimizes all policies with subselect pattern `(SELECT auth.uid())` for better query plan caching
- Applied to: users, designs, orders, design_sessions, admin_audit_log

**Status**: ✅ Production ready, fully idempotent

**How to Apply**:
```sql
-- Via Supabase Dashboard SQL Editor
-- Copy and paste the file contents and run

-- Or via Supabase CLI
supabase db push

-- Or via psql
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/optimize_users_rls_policies.sql
```

**Documentation**: See `/MIGRATION_GUIDE.md` for detailed instructions.

---

### 2. `add_soft_delete_to_orders.sql`
**Purpose**: Adds soft delete functionality to the orders table.

**Changes**:
- Adds `deleted_at` timestamp column
- Adds `deleted_by` UUID reference
- Adds `delete_reason` text field

**Status**: ✅ Applied

---

## Migration Best Practices

1. **Idempotency**: All migrations should use `IF EXISTS` / `IF NOT EXISTS` to be safely re-runnable
2. **Testing**: Always test migrations in dev/staging before production
3. **Backup**: Back up production database before applying migrations
4. **Verification**: Include verification queries at the bottom of migration files
5. **Documentation**: Document what each migration does and why

## File Naming Convention

Format: `<description_of_change>.sql`

Examples:
- `add_user_preferences_table.sql`
- `optimize_users_rls_policies.sql`
- `add_soft_delete_to_orders.sql`

## Applying Migrations

### Development
```bash
supabase db reset  # Resets to schema.sql
```

### Production
```bash
supabase db push   # Applies pending migrations
```

### Manual
```bash
psql -h db.example.supabase.co -U postgres -d postgres -f supabase/migrations/your-migration.sql
```

## Rollback

If a migration causes issues, you can:

1. **Manual rollback**: Create a rollback script with inverse operations
2. **Database restore**: Restore from backup
3. **Schema reset**: Only in dev - `supabase db reset`

See individual migration files for specific rollback instructions.

## Resources

- [Supabase Migrations Docs](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL Migration Best Practices](https://www.postgresql.org/docs/current/sql-commands.html)
- Main schema: `/supabase/schema.sql`
