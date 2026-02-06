import { test, expect } from '@playwright/test';

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
    // Click on first row
    await page.locator('table tbody tr').first().click();

    // View drawer should open - wait for drawer dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
  });

  test('should display tags section in view drawer', async ({ page }) => {
    // Click first row
    await page.locator('table tbody tr').first().click();

    // Drawer should be visible (wait longer for animation)
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 });

    // Tags heading should exist in drawer
    await expect(page.locator('[role="dialog"]').getByRole('heading', { name: 'Tags' })).toBeVisible();
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

    // Trigger validation by blurring
    await codeInput.blur();

    // Wait for async validation (debounce + API call)
    await page.waitForTimeout(1500);

    // Should show duplicate error message
    await expect(page.getByText(/already exists/i)).toBeVisible({ timeout: 5000 });
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

    // Should show range error (message: "Account code must match account type range")
    await expect(page.getByText(/must match account type range/i)).toBeVisible({ timeout: 5000 });
  });

  test('should create account successfully', async ({ page }) => {
    // Click Add Account
    await page.getByRole('button', { name: 'Add Account' }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Generate unique code in Asset range (1xxx) since default type is Asset
    const uniqueCode = `1${Date.now().toString().slice(-3)}`;

    // Fill form
    await page.locator('input#code').fill(uniqueCode);
    await page.locator('input#name').fill('Test Account E2E');

    // Account type is already Asset by default, no need to change

    // Submit form
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Wait for success toast
    await expect(page.getByText('Account created successfully')).toBeVisible({ timeout: 10000 });
  });

  test('code field is disabled for non-detail (header) accounts', async ({ page }) => {
    // First row is usually a header account (1000 - Kas & Bank)
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();

    // Wait for view drawer
    await expect(page.locator('[role="dialog"]')).toBeVisible();

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

    // Click first row to open view drawer
    await page.locator('table tbody tr').first().click();

    // Drawer should be visible with Tags section
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('[role="dialog"]').getByRole('heading', { name: 'Tags' })).toBeVisible();
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
