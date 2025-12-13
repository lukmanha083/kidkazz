# Quick Start: GitHub + Claude + Sentry Integration

**Get automated error monitoring and fixing running in 30 minutes**

## 🎯 Goal

Set up an automated pipeline where:
1. Errors in production are caught by Sentry
2. GitHub issues are automatically created
3. Claude Code analyzes and creates PRs to fix issues

## ⚡ Quick Setup (30 Minutes)

### Step 1: Sentry Setup (10 minutes)

```bash
# 1. Install Sentry SDK
pnpm add @sentry/cloudflare -w

# 2. Add to one service first (api-gateway)
cd services/api-gateway

# 3. Create .dev.vars if it doesn't exist
echo 'SENTRY_DSN="YOUR_DSN_HERE"' >> .dev.vars
```

Edit `services/api-gateway/wrangler.jsonc`:
```jsonc
{
  "compatibility_flags": ["nodejs_compat"]  // Add this line
}
```

Edit `services/api-gateway/src/index.ts`:
```typescript
import { Hono } from 'hono';
import * as Sentry from '@sentry/cloudflare';

const app = new Hono();

// ... your routes ...

export default Sentry.withSentry(
  (env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  }),
  app
);
```

Test it:
```bash
pnpm dev
# Visit http://localhost:8787 and trigger an error
```

### Step 2: GitHub Integration (5 minutes)

1. Go to [sentry.io](https://sentry.io) → Settings → Integrations
2. Find **GitHub** → Click **Install**
3. Select your `kidkazz` repository
4. Enable **Issue Sync**

### Step 3: Claude Code Setup (10 minutes)

```bash
# Option A: Using Claude Code CLI
claude
/install-github-app

# Option B: Manually
# Visit: https://github.com/marketplace/actions/claude-code-action-official
```

Create `.github/workflows/claude-fix.yml`:
```yaml
name: Claude Auto-Fix

on:
  issues:
    types: [opened, labeled]

jobs:
  auto-fix:
    if: contains(github.event.issue.labels.*.name, 'sentry')
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write

    steps:
      - uses: actions/checkout@v4

      - uses: anthropics/claude-code-action@v1
        with:
          api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          instructions: |
            Fix the error in this issue.
            Follow Hexagonal Architecture patterns.
            Add tests where needed.
```

Add your Anthropic API key:
- Go to GitHub repo → Settings → Secrets → Actions
- Add `ANTHROPIC_API_KEY`

### Step 4: Configure Alert Rules (5 minutes)

In Sentry:
1. Settings → Alerts → New Alert Rule
2. Configure:
   - **When**: Event is seen more than 5 times in 1 hour
   - **Then**: Create issue in GitHub
   - **Labels**: sentry, bug, automated

### Step 5: Test End-to-End (5 minutes)

Create a test error:
```typescript
// Add to api-gateway/src/index.ts
app.get('/api/test-error', () => {
  throw new Error('Test Sentry integration');
});
```

Deploy and test:
```bash
pnpm deploy
curl https://your-worker.workers.dev/api/test-error
```

Check:
1. ✅ Error appears in Sentry (within seconds)
2. ✅ GitHub issue created (within 1 minute)
3. ✅ Claude Code comments on issue
4. ✅ PR created with fix

## 📊 What You Get

### Before Integration
```
Error → Manual discovery (hours/days later)
      → Developer investigates (30-60 min)
      → Fix implemented (1-4 hours)
      → Testing (30 min)
      → PR review (hours/days)
      → Deploy
Total: Days
```

### After Integration
```
Error → Sentry (seconds)
      → GitHub Issue (1 minute)
      → Claude analyzes (2 minutes)
      → PR created (3-5 minutes)
      → Human review (10 minutes)
      → Deploy
Total: 15-20 minutes
```

## 🔄 Workflow Example

**Real scenario**: Payment service throws error

```
14:30:00 - Error: Cannot read property 'amount' of undefined
14:30:01 - Sentry captures error
14:30:45 - GitHub issue #124 created
14:31:00 - GitHub Action triggers
14:31:30 - Claude Code starts analysis
14:33:00 - Claude identifies null check missing
14:35:00 - PR #125 created with fix
14:40:00 - Developer reviews and approves
14:42:00 - Auto-deployed to production
```

**Time to fix: 12 minutes** ⚡

## 💰 Cost Breakdown

| Service | Cost | What You Get |
|---------|------|--------------|
| Sentry (Team) | $26/month | 50K errors, GitHub integration |
| Claude Pro | $20/month | Unlimited Claude Code usage |
| GitHub Actions | Free | 2,000 minutes/month |
| **Total** | **$46/month** | Automated error fixing |

**ROI**: Saves ~10-20 hours/month of developer time = $1,500-3,000 saved

## 📈 Next Steps

### Week 1: Single Service
- ✅ Set up Sentry in api-gateway
- ✅ Test with manual errors
- ✅ Verify GitHub integration

### Week 2: All Services
- Add Sentry to remaining 5 services
- Configure service-specific alert rules
- Create shared Sentry config

### Week 3: Optimize
- Tune alert thresholds
- Add custom error contexts
- Set up performance monitoring

### Week 4: Advanced Features
- Add Slack notifications
- Create custom dashboards
- Implement release tracking

## 🎓 Learning Resources

**Must-Read Documentation**:
1. [Sentry for Cloudflare Workers](https://docs.sentry.io/platforms/javascript/guides/cloudflare/)
2. [Claude Code GitHub Actions](https://docs.claude.com/en/docs/claude-code/github-actions)
3. [Full Integration Guide](./SENTRY_CLAUDE_GITHUB_INTEGRATION.md)

**Video Tutorials**:
- Sentry + Cloudflare setup (YouTube)
- Claude Code demos (Anthropic)

## ⚠️ Common Gotchas

1. **Forgot `nodejs_compat` flag** → Sentry won't work
2. **Wrong DSN** → Check your .dev.vars and secrets
3. **Missing API key** → Add ANTHROPIC_API_KEY to GitHub secrets
4. **No labels on issues** → Configure Sentry alert rules
5. **Rate limits** → Adjust alert thresholds to avoid spam

## 🆘 Troubleshooting

### Sentry not capturing errors?
```bash
# Check DSN is set
wrangler secret list

# Enable debug mode
# In your code: debug: true in Sentry config
```

### GitHub issues not created?
- Check Sentry → Settings → Integrations → GitHub
- Verify alert rules are active
- Check you're on Team plan or higher

### Claude not responding?
- Check GitHub Action logs
- Verify ANTHROPIC_API_KEY secret
- Ensure issue has "sentry" label

## 📞 Support

- **Sentry**: [forum.sentry.io](https://forum.sentry.io)
- **Claude Code**: [GitHub Issues](https://github.com/anthropics/claude-code/issues)
- **Cloudflare**: [Community Forum](https://community.cloudflare.com)

---

**Ready to start?** Follow [Step 1](#step-1-sentry-setup-10-minutes) above! 🚀

For detailed instructions, see [SENTRY_CLAUDE_GITHUB_INTEGRATION.md](./SENTRY_CLAUDE_GITHUB_INTEGRATION.md)
