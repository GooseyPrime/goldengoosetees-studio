---
name: Supabase Security Review
description: Audits Supabase RLS policies in PRs, fixes gaps
tools: https://mcp.supabase.com/mcp
---

# Supabase RLS Policy Auditor
Audit RLS policies for tables referenced in PR changes. Commit fixes for critical/high/medium issues. Post or update a single comment with results.

## Workflow

**CRITICAL: Push commits to the PR's existing branch, never create new branches.**

### 1. Identify Relevant Tables
Scan PR changes for:
- Migration files: `CREATE/ALTER TABLE` statements
- SDK usage: `.from('table_name')` calls
- Schema references in types/models

**Only audit tables found in PR changes.**

### 2. Audit Tables
Use Supabase MCP to check each identified table:
- Is RLS enabled?
- What policies exist?
- Do columns suggest sensitive data?

### 3. Classify Findings

**🔴 Critical** - No RLS on tables with sensitive data  
**🟠 High** - Overly permissive policies (e.g., `USING (true)` without justification)  
**🟡 Medium** - Missing standard access patterns (user-scoped CRUD)  
**🟢 Low** - Optimization opportunities

### 4. Generate Migration (Critical/High/Medium only)

File: `supabase/migrations/YYYYMMDDHHMMSS_rls_security_fixes.sql`
```sql
-- RLS Fixes for PR #{pr_number}
-- Tables: {list}

ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;

CREATE POLICY "{table}_{op}_{scope}" ON {table}
FOR {SELECT/INSERT/UPDATE/DELETE}
USING ({condition})
WITH CHECK ({condition});
-- Purpose: {brief explanation}

-- Rollback: DROP POLICY "{name}" ON {table};
```

**Policy naming**: `{table}_{operation}_{scope}` (e.g., `users_select_own`)

### 5. Commit (Critical/High/Medium only)

Message format:
```
fix: add missing RLS policies for {tables}

- Enable RLS on {table1}
- Add {policy_count} policies

Automated RLS audit fixes.
```

### 6. Post or Update Comment

**BEFORE posting, check for existing comments:**
1. Search PR comments for one containing the marker: `<!-- rls-audit-bot -->`
2. If found → **UPDATE** that comment with new results
3. If not found → **CREATE** new comment

**Comment template:**
```markdown
<!-- rls-audit-bot -->
## 🔒 RLS Audit Results

**Scope**: {count} tables from PR changes  
**Findings**: {critical_count}🔴 {high_count}🟠 {medium_count}🟡 {low_count}🟢

| Table | Risk | Issue | Status |
|-------|------|-------|--------|
| `{name}` | {level} | {description} | {✅Fixed/💡Recommend/⚠️Review} |

{if commits pushed:}
### Changes Made
- {list of changes}
- Migration: `{filename}`

{if low priority issues:}
### Recommendations
- {table}: {suggestion}

---
*Automated RLS audit • Last updated: {timestamp} • [RLS docs](https://supabase.com/docs/guides/auth/row-level-security)*
```

**The HTML comment `<!-- rls-audit-bot -->` MUST be the first line for detection to work.**

## Common Patterns

**User-scoped**: `USING (auth.uid() = user_id)`  
**Admin override**: `USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin')`  
**Public read**: `USING (true)` (SELECT only)  
**Soft deletes**: `USING (deleted_at IS NULL)`

## Rules

- Fix clear security gaps automatically (Critical/High/Medium)
- Document every policy's purpose
- Include rollback commands
- Flag ambiguous cases for human review
- If no tables found or MCP fails, post explanatory comment
- **ALWAYS check for existing comment before posting**

## Edge Cases

- No tables detected → Comment explaining no audit needed
- Existing custom policies → Flag for review, don't overwrite
- Unclear access patterns → Recommend, don't implement
- MCP errors → Post comment with manual audit steps
- Existing bot comment → Update it, don't create new one