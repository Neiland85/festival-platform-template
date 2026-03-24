## Summary

<!-- What does this PR do and why? Link to issue if applicable. -->

## Changes

<!-- List the key changes. Be specific — what files, what behavior changed. -->

-

## Test coverage

<!-- What tests were added or modified? -->

- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing performed
- [ ] No tests needed (explain below)

**Test command:** `pnpm test` / `pnpm test:e2e`

## Steps for QA

<!-- How should a reviewer verify this works? Step-by-step. -->

1. `git checkout <branch>`
2. `pnpm install && pnpm dev`
3. Navigate to …
4. Verify …

## Security checklist

- [ ] No secrets, tokens, or credentials in code or logs
- [ ] No `console.log` with sensitive data
- [ ] User input is validated (Zod schemas)
- [ ] SQL queries use parameterized statements (Drizzle ORM)
- [ ] CSRF protection maintained for mutation endpoints
- [ ] Rate limiting applied to public endpoints
- [ ] IP addresses hashed before storage (`hashIp()`)
- [ ] GDPR: no personal data stored without consent
- [ ] Dependencies audited (`pnpm audit --prod --audit-level=high`)

## Release notes

<!-- One sentence for the CHANGELOG. Use conventional commit format. -->

```
type(scope): description
```

**Version impact:** patch / minor / major / none

## Checklist

- [ ] Self-reviewed the diff
- [ ] Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
- [ ] `pnpm verify` passes locally (lint + typecheck + test + build)
- [ ] No unresolved TODO/FIXME added without a tracking issue
- [ ] Documentation updated if public API changed
- [ ] Backward compatible (or migration plan documented)

## Reviewers

<!-- Tag reviewers. Use CODEOWNERS if configured. -->

- [ ] Code review: @
- [ ] Security review (if applicable): @
- [ ] QA sign-off (if applicable): @
