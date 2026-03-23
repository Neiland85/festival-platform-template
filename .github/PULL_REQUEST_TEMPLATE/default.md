## Summary

<!-- 1-3 bullet points describing what this PR does and why -->

-

## Type of change

<!-- Check the one that applies -->

- [ ] `feat`: New feature (minor version bump)
- [ ] `fix`: Bug fix (patch version bump)
- [ ] `perf`: Performance improvement (patch version bump)
- [ ] `refactor`: Code refactoring (no version bump)
- [ ] `docs`: Documentation only
- [ ] `ci`: CI/CD changes
- [ ] `chore`: Maintenance / dependencies
- [ ] `security`: Security fix (patch version bump)
- [ ] **BREAKING CHANGE** (major version bump) — describe below

## Commit message for squash merge

<!--
  Copy this as the squash commit message.
  Must follow Conventional Commits: type(scope): description

  Examples:
    feat(hero): add image carousel with crossfade
    fix(auth): prevent session fixation on login
    perf(db): add index on events.start_date
    ci(release): add semantic-release pipeline
    chore(deps): bump next from 16.0 to 16.1
    security(csrf): rotate CSRF_SECRET on deploy

  Breaking change example:
    feat(api)!: change event response schema

    BREAKING CHANGE: event.date is now event.startDate
-->

```
type(scope): description
```

## Checklist

- [ ] Self-reviewed the diff
- [ ] No console.log / debug artifacts left
- [ ] Tests pass locally (`pnpm test`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Types check (`pnpm typecheck`)
- [ ] Commit message follows [Conventional Commits](https://www.conventionalcommits.org/)

## Related issues

<!-- Closes #N, Fixes #N, or Relates to #N -->
