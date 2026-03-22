## Migration Change

<!-- Use this template for PRs that modify database schema or migrations. -->

### Summary
<!-- What does this migration do? (add table, alter column, drop index, etc.) -->


### Migration files changed
<!-- List all files in drizzle/ or migrations/ that this PR adds/modifies. -->

- [ ] `drizzle/XXXX_*.sql` — _describe change_

### Checklist

- [ ] Ran `pnpm db:generate` and verified the generated SQL is correct
- [ ] Tested migration locally with `docker compose -f docker-compose.ci.yml up -d` + `pnpm exec drizzle-kit push --force`
- [ ] Verified rollback procedure (see Rollback Plan below)
- [ ] Migration is backward-compatible with the current deployed code (no breaking column drops/renames without a multi-step plan)
- [ ] No `DROP TABLE` or `DROP COLUMN` without explicit team approval
- [ ] Large table migrations use batching or `CONCURRENTLY` where applicable
- [ ] Added/updated seed data if schema change affects `scripts/seed.ts`
- [ ] Updated TypeScript schema in `src/adapters/db/schema.ts`

### Data impact

| Action | Table(s) | Rows affected (estimate) | Downtime risk |
|--------|----------|--------------------------|---------------|
| _ADD/ALTER/DROP_ | _table_name_ | _N/A or estimate_ | _None / Brief / Requires maintenance_ |

### Rollback Plan

<!-- REQUIRED: Describe exactly how to revert this migration if it fails. -->

**Pre-migration backup:**
```bash
./scripts/backup-before-migrate.sh "$STAGING_DATABASE_URL"
```

**Rollback steps:**
1. <!-- e.g., "Restore from backup: pg_restore --clean --if-exists ..." -->
2. <!-- e.g., "Revert migration: drizzle-kit drop <migration-name>" -->
3. <!-- e.g., "Deploy previous commit: git revert <sha> && push" -->

**Rollback SQL (if applicable):**
```sql
-- Paste the exact SQL to undo this migration
-- e.g., ALTER TABLE events DROP COLUMN IF EXISTS capacity;
```

### Testing

- [ ] Unit tests pass with new schema
- [ ] E2E tests pass (CI will verify via ephemeral DB)
- [ ] Manually tested on local Postgres 16

### Reviewer notes

<!-- Any context the reviewer needs — edge cases, ordering dependencies, etc. -->

