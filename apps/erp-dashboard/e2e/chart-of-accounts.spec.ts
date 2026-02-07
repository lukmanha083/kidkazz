import { test, expect, request } from '@playwright/test';

// Track created accounts for teardown
const createdAccountIds: string[] = [];

/**
 * TEMPORARY: CI bypass secret for E2E testing in GitHub Actions
 *
 * This bypasses the country-based IP filter on backend services.
 * ⚠️ REMOVE THIS when proper authentication is implemented on backend.
 *
 * See: docs/guides/CI_BYPASS_HEADER.md
 */
const CI_BYPASS_SECRET = process.env.CI_BYPASS_SECRET;

// Helper to get accounting service URL
const getAccountingServiceUrl = () =>
  process.env.VITE_ACCOUNTING_SERVICE_URL || 'https://accounting-service.tesla-hakim.workers.dev';

// Backend service domains that need CI bypass header
const BACKEND_DOMAINS = [
  'accounting-service.tesla-hakim.workers.dev',
  'product-service.tesla-hakim.workers.dev',
  'inventory-service.tesla-hakim.workers.dev',
  'business-partner-service.tesla-hakim.workers.dev',
  'order-service.tesla-hakim.workers.dev',
  'payment-service.tesla-hakim.workers.dev',
  'shipping-service.tesla-hakim.workers.dev',
  'api-gateway.tesla-hakim.workers.dev',
];

// Global beforeEach: Set up CI bypass header interception for ALL tests
test.beforeEach(async ({ page }) => {
  if (CI_BYPASS_SECRET) {
    await page.route(
      (url) => BACKEND_DOMAINS.some((domain) => url.hostname.includes(domain)),
      async (route) => {
        const headers = {
          ...route.request().headers(),
          'x-ci-bypass': CI_BYPASS_SECRET,
        };
        await route.continue({ headers });
      }
    );
  }
});

// Teardown: delete all created accounts after tests
test.afterAll(async () => {
  if (createdAccountIds.length === 0) return;

  const headers: Record<string, string> = {};
  if (CI_BYPASS_SECRET) {
    headers['x-ci-bypass'] = CI_BYPASS_SECRET;
  }

  const apiContext = await request.newContext({
    baseURL: getAccountingServiceUrl(),
    extraHTTPHeaders: headers,
  });

  for (const accountId of createdAccountIds) {
    try {
      await apiContext.delete(`/api/accounts/${accountId}`);
    } catch {
      // Ignore errors during cleanup (account may not exist)
    }
  }

  await apiContext.dispose();
  createdAccountIds.length = 0;
});

test.describe('Chart of Accounts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/accounting/chart-of-accounts');
    // Wait for page to load by checking the heading
    await expect(page.getByRole('heading', { name: 'Chart of Accounts' })).toBeVisible({ timeout: 15000 });
    // Wait for table data to load
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });
  });

  test('should load accounts correctly', async ({ page }) => {
    // Verify page title
    await expect(page.getByRole('heading', { name: 'Chart of Accounts' })).toBeVisible();

    // Verify data table is present with accounts
    await expect(page.getByRole('table')).toBeVisible();

    // Verify at least one account row exists
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible();
  });

  test('should open view drawer on row click', async ({ page }) => {
    // Click on the account name text directly (more reliable than positional td)
    await page.locator('table tbody tr').first().getByText('Kas & Bank').click();

    // View drawer should open - wait for drawer dialog (longer timeout for CI)
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 });
  });

  test('should display tags section in view drawer', async ({ page }) => {
    // Click on the account name text directly
    await page.locator('table tbody tr').first().getByText('Kas & Bank').click();

    // Drawer should be visible (wait longer for animation)
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 });

    // Tags heading should exist in drawer
    await expect(page.locator('[role="dialog"]').getByRole('heading', { name: 'Tags' })).toBeVisible({ timeout: 5000 });
  });

  test('should open form drawer on Add Account click', async ({ page }) => {
    // Click Add Account button
    await page.getByRole('button', { name: 'Add Account' }).click();

    // Form drawer should open with "Add New Account" title
    await expect(page.locator('[role="dialog"]').getByText('Add New Account')).toBeVisible({ timeout: 5000 });
  });

  test('should show inline error for duplicate account code', async ({ page }) => {
    // First, get an existing code from the table
    const firstRowCode = await page.locator('table tbody tr').first().locator('td').nth(1).textContent();

    // Click Add Account
    await page.getByRole('button', { name: 'Add Account' }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Use the existing code we found (e.g., 1000)
    const codeInput = page.locator('input#code');
    await codeInput.fill(firstRowCode || '1000');

    // Trigger validation by blurring and wait for the validation API call
    const validationPromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/accounts/validate-code') || response.url().includes('/api/accounts?code='),
      { timeout: 10000 }
    ).catch(() => null); // Don't fail if no API call (validation might use cached data)

    await codeInput.blur();
    await validationPromise;

    // Should show duplicate error message (assertion retries until visible)
    await expect(page.getByText(/already exists/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show error for code not matching account type range', async ({ page }) => {
    // Click Add Account
    await page.getByRole('button', { name: 'Add Account' }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Default is Asset type which expects 1xxx range
    // Enter a code outside Asset range (e.g., 2001 which is Liability range)
    const codeInput = page.locator('input#code');
    await codeInput.fill('2001');
    await codeInput.blur();

    // Should show range error (message: "Account code must be between 1000-1999 for Asset accounts")
    await expect(page.getByText(/must be between.*for Asset/i)).toBeVisible({ timeout: 5000 });
  });

  test('should create account successfully', async ({ page }) => {
    // Click Add Account
    await page.getByRole('button', { name: 'Add Account' }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Generate unique code in Asset range (1xxx) with high entropy
    // Format: 1 + last 3 digits of timestamp + random 2 digits
    const timestamp = Date.now().toString();
    const randomSuffix = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, '0');
    const uniqueCode = `1${timestamp.slice(-3)}${randomSuffix}`.slice(0, 4); // Ensure max 4 digits
    const uniqueName = `Test Account E2E ${timestamp.slice(-6)}`;

    // Fill form
    await page.locator('input#code').fill(uniqueCode);
    await page.locator('input#name').fill(uniqueName);

    // Account type is already Asset by default, no need to change

    // Intercept the create request to capture the account ID for teardown
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/accounts') && response.request().method() === 'POST'
    );

    // Submit form
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Wait for API response and capture account ID
    const response = await responsePromise;
    if (response.ok()) {
      try {
        const responseData = await response.json();
        if (responseData.data?.id) {
          createdAccountIds.push(responseData.data.id);
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    // Wait for success toast
    await expect(page.getByText('Account created successfully')).toBeVisible({ timeout: 10000 });
  });

  test('code field is disabled for non-detail (header) accounts', async ({ page }) => {
    // Click on a known header account (Kas & Bank, code 1000) by its name text
    await page.locator('table tbody tr').filter({
      hasText: 'Kas & Bank',
    }).first().getByText('Kas & Bank').click();

    // Wait for view drawer (longer timeout for CI)
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 });

    // Open edit from view drawer
    await page.getByRole('button', { name: 'Edit' }).click();

    // Wait for edit form
    await expect(page.locator('[role="dialog"]').getByText('Edit Account')).toBeVisible();

    // Code input should be disabled for header accounts
    const codeInput = page.locator('input#code');
    await expect(codeInput).toBeDisabled();
  });
});

test.describe('Chart of Accounts - Responsive Design', () => {
  // Note: Tailwind responsive classes work by hiding the content inside the th,
  // not the th element itself. We test by checking cell content visibility instead.

  test('should hide Tags cell content on mobile (320px)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/dashboard/accounting/chart-of-accounts');
    await expect(page.getByRole('heading', { name: 'Chart of Accounts' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('table')).toBeVisible();

    // First row tags cell - content should have hidden class on mobile
    // The cells use "hidden xl:flex" so content is hidden on mobile
    const firstRowTagsCell = page.locator('table tbody tr').first().locator('td').nth(6);
    const tagBadges = firstRowTagsCell.locator('[class*="hidden xl:flex"]');

    // On mobile (320px), the xl breakpoint is not active, so hidden class applies
    // The element exists but has display:none from 'hidden' class
    await expect(tagBadges).toHaveCSS('display', 'none');
  });

  test('should show Tags cell content on desktop (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard/accounting/chart-of-accounts');
    await expect(page.getByRole('table')).toBeVisible({ timeout: 15000 });

    // First row tags cell - content should be visible (xl breakpoint active)
    const firstRowTagsCell = page.locator('table tbody tr').first().locator('td').nth(6);
    const tagContent = firstRowTagsCell.locator('[class*="xl:flex"], [class*="xl:inline"]').first();

    // On desktop (1280px = xl), the xl:flex/xl:inline overrides hidden
    await expect(tagContent).toBeVisible();
  });

  test('mobile users can view tags in drawer', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/dashboard/accounting/chart-of-accounts');
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });

    // Click on the account name text directly
    await page.locator('table tbody tr').first().getByText('Kas & Bank').click();

    // Drawer should be visible with Tags section (longer timeout for CI)
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[role="dialog"]').getByRole('heading', { name: 'Tags' })).toBeVisible({ timeout: 5000 });
  });

  test('all columns headers visible on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard/accounting/chart-of-accounts');
    await expect(page.getByRole('table')).toBeVisible({ timeout: 15000 });

    // All column header buttons should be visible
    const headerButtons = page.locator('th button');
    await expect(headerButtons.filter({ hasText: 'Account Name' })).toBeVisible();
    await expect(headerButtons.filter({ hasText: 'Code' })).toBeVisible();
    await expect(headerButtons.filter({ hasText: 'Type' })).toBeVisible();
    await expect(headerButtons.filter({ hasText: 'Category' })).toBeVisible();
    await expect(headerButtons.filter({ hasText: 'Level' })).toBeVisible();
    await expect(headerButtons.filter({ hasText: 'Status' })).toBeVisible();
    await expect(headerButtons.filter({ hasText: 'Tags' })).toBeVisible();
  });
});
