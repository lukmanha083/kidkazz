# Dependency Migration Guide

This guide explains how to safely update major dependencies without breaking production.

## Quick Reference

| Update Type | Risk | Action |
|-------------|------|--------|
| Patch (x.x.1 → x.x.2) | Low | Auto-merge ✅ |
| Minor (x.1.x → x.2.x) | Low | Review then merge |
| Major (1.x.x → 2.x.x) | High | Full migration process |

---

## Major Update Migration Process

### Phase 1: Research (Before Coding)

1. **Read the changelog**
   ```
   https://github.com/{package}/releases
   https://github.com/{package}/blob/main/CHANGELOG.md
   ```

2. **Check migration guide**
   - Most major packages have official migration guides
   - Example: https://react.dev/blog/2024/04/25/react-19-upgrade-guide

3. **Identify breaking changes**
   - API changes
   - Removed features
   - New requirements (Node version, peer deps)

4. **Estimate impact**
   - How many files affected?
   - Do we use deprecated features?

### Phase 2: Create Migration Branch

```bash
# Always work on a separate branch
git checkout main
git pull
git checkout -b chore/migrate-{package}-v{version}

# Example
git checkout -b chore/migrate-react-19
```

### Phase 3: Update Dependencies

```bash
# Update specific package
pnpm update {package}@{version}

# Example: Update React to v19
pnpm update react@19 react-dom@19 @types/react@19 @types/react-dom@19

# Check for peer dependency warnings
pnpm install
```

### Phase 4: Fix Breaking Changes

1. **Run type check**
   ```bash
   pnpm type-check
   # Fix all TypeScript errors
   ```

2. **Run tests**
   ```bash
   pnpm test
   # Fix failing tests
   ```

3. **Run linter**
   ```bash
   pnpm lint
   # Fix lint errors (may have new rules)
   ```

4. **Manual testing**
   ```bash
   pnpm dev
   # Test critical user flows manually
   ```

### Phase 5: Deploy & Test

**Current Phase (Infancy - No Real Users):**
```bash
# Deploy directly to production (IP protected, no real users)
cd services/accounting-service && wrangler deploy
cd services/product-service && wrangler deploy
# ... all affected services

# Test thoroughly - only your IP can access
```

**Future Phase (Beta - Real Users):**
```bash
# Deploy to staging first
cd services/accounting-service && wrangler deploy --env staging
# Test on staging for 24-48 hours
# Then deploy to production
# See: docs/guides/STAGING_DEPLOYMENT_GUIDE.md
```

### Phase 6: Create Pull Request

```bash
git add -A
git commit -m "chore: migrate {package} to v{version}

Breaking changes addressed:
- Change 1
- Change 2

Tested:
- [ ] All tests pass
- [ ] Type check passes
- [ ] Staging deployment tested
- [ ] Manual testing done
"

git push -u origin chore/migrate-{package}-v{version}
gh pr create --title "chore: migrate {package} to v{version}" --body "..."
```

### Phase 7: Review & Merge

1. **CI must pass** - All tests green
2. **Code review** - Another developer reviews
3. **Staging tested** - Confirmed working on staging
4. **Merge to main**

### Phase 8: Deploy & Monitor

1. **Deploy to production**
2. **Monitor error tracking** (Sentry, LogRocket, etc.)
3. **Watch Cloudflare analytics** for errors
4. **Be ready to rollback** if issues arise

---

## Rollback Strategy

If something breaks in production:

```bash
# Option 1: Revert the commit
git revert {commit-hash}
git push

# Option 2: Redeploy previous version
# In Cloudflare dashboard, rollback to previous deployment
```

---

## Locked Dependencies (renovate.json)

These packages are locked to prevent auto-updates:

| Package | Locked Version | Reason |
|---------|---------------|--------|
| react | <19.0.0 | Major rewrite, needs migration |
| vite | <6.0.0 | Breaking config changes |
| vitest | <3.0.0 | Requires Vite 6 |
| zod | <4.0.0 | API changes |
| @biomejs/biome | <2.0.0 | Config format changes |

### How to Unlock for Migration

1. Remove the lock from `renovate.json`
2. Follow the migration process above
3. Add lock back if needed for stability

---

## Example: React 19 Migration Checklist

When ready to migrate React 18 → 19:

- [ ] Read https://react.dev/blog/react-19
- [ ] Create branch `chore/migrate-react-19`
- [ ] Update packages:
  ```bash
  pnpm update react@19 react-dom@19 @types/react@19 @types/react-dom@19
  ```
- [ ] Fix deprecated `forwardRef` usage
- [ ] Fix `ref` prop changes
- [ ] Fix `use` hook migration
- [ ] Update all tests
- [ ] Manual testing of all pages
- [ ] Create PR, get review
- [ ] Merge and deploy
- [ ] Monitor for 24-48 hours
- [ ] Update lock in renovate.json if stable

---

## Safe Update Schedule

Recommended approach for production stability:

| Day | Action |
|-----|--------|
| Monday | Review auto-merged patches |
| Tuesday | Merge approved minor updates |
| Wednesday | Research major updates |
| Thursday | Work on major migrations (feature branch) |
| Friday | NO deployments (avoid weekend fires 🔥) |

---

**Last Updated**: 2026-02-04
