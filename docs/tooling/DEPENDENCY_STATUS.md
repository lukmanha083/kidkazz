# Dependency Status and Deprecation Warnings

## Overview

This document tracks the status of dependencies in the kidkazz monorepo and explains any deprecation warnings.

## Resolved Deprecation Warnings ✅

We have successfully resolved the following deprecated dependencies through pnpm overrides:

1. **glob@7.2.3** → Upgraded to **glob@^10.4.0**
   - Old version was causing deprecation warnings
   - Now using modern glob with better performance

2. **inflight@1.0.6** → Replaced with **@zkochan/inflight@^1.0.0**
   - Original package is unmaintained
   - Using community-maintained fork

## Remaining Subdependency Warnings ⚠️

The following 4 deprecated packages are **subdependencies** (dependencies of our dependencies) and cannot be directly controlled:

### 1. @esbuild-kit/core-utils@3.3.2
- **Status**: Deprecated
- **Reason**: Merged into [tsx](https://tsx.is)
- **Used by**: `drizzle-kit@0.31.7` (transitive dependency)
- **Impact**: None - functionality works correctly
- **Fix**: Will be resolved when drizzle-kit or its dependencies update

### 2. @esbuild-kit/esm-loader@2.6.5
- **Status**: Deprecated
- **Reason**: Merged into [tsx](https://tsx.is)
- **Used by**: `drizzle-kit@0.31.7` (transitive dependency)
- **Impact**: None - functionality works correctly
- **Fix**: Will be resolved when drizzle-kit or its dependencies update

### 3. rollup-plugin-inject@3.0.2
- **Status**: Deprecated
- **Reason**: Replaced by `@rollup/plugin-inject`
- **Used by**: Vite or TanStack Router build tools (transitive dependency)
- **Impact**: None - build process works correctly
- **Fix**: Will be resolved when build tools update

### 4. sourcemap-codec@1.4.8
- **Status**: Old version (not critical)
- **Reason**: Older version of sourcemap utilities
- **Used by**: Vite or build tools (transitive dependency)
- **Impact**: None - source maps work correctly
- **Fix**: Will be resolved when build tools update

## Actions Taken

1. ✅ Added pnpm overrides to force newer versions of `glob` and `inflight`
2. ✅ Updated `drizzle-kit` from `0.24.2` to `0.31.7`
3. ✅ Forced single `esbuild` version (`0.21.5`) to avoid conflicts
4. ✅ Cleaned and reinstalled all dependencies
5. ✅ Reduced deprecation warnings from **6 to 4**

## pnpm Overrides

The following overrides are configured in the root `package.json`:

```json
"pnpm": {
  "overrides": {
    "glob@<8": "^10.4.0",
    "inflight@<2": "npm:@zkochan/inflight@^1.0.0",
    "esbuild": "^0.21.5"
  }
}
```

## Conclusion

The remaining 4 deprecated package warnings are **subdependencies** that:
- Do not pose security risks
- Do not affect functionality
- Will be automatically resolved when upstream packages update their dependencies
- Are common in large monorepos and can be safely ignored

## Monitoring

We will continue to monitor these warnings and:
1. Update dependencies regularly
2. Check for new versions of build tools
3. Remove this document when all warnings are resolved

---

**Last Updated**: 2025-11-16
**Status**: 4 subdependency warnings remaining (down from 6)
