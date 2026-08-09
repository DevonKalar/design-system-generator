import { expect, test, type Page } from '@playwright/test';

/** Unique per run so a previous run's rows cannot affect assertions. */
const runId = Date.now().toString(36);

async function signIn(page: Page): Promise<void> {
  // Google's consent screen cannot be driven from a test. This mints a session through the
  // flag-guarded test-login route; the refresh cookie lands in the browser context, and the
  // app's on-load refresh exchanges it for an access token exactly as it would after a real
  // Google redirect.
  const response = await page.context().request.post('/api/auth/test-login', {
    data: { email: `playwright-${runId}@example.com` },
  });
  expect(response.ok()).toBe(true);
}

async function createSystem(page: Page, name: string): Promise<void> {
  await page.getByLabel('New design system name').fill(name);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
}

test.describe('unauthenticated', () => {
  test('redirects to the login page', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  });

  test('shows an error when Google sign-in fails', async ({ page }) => {
    await page.goto('/login?error=oauth_failed');

    await expect(page.getByRole('alert')).toContainText('Sign-in failed');
  });
});

test.describe('signed in', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('creates a design system and opens its editor', async ({ page }) => {
    const name = `Acme ${runId}`;
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Design systems' })).toBeVisible();
    await createSystem(page, name);

    // Creating navigates straight into the editor.
    await expect(page).toHaveURL(/\/systems\/[0-9a-f-]{36}$/);
    await expect(page.getByLabel('Name for brand palette')).toHaveValue('brand');
    await expect(page.getByTestId('preview-light')).toBeVisible();
    await expect(page.getByTestId('preview-dark')).toBeVisible();
  });

  test('edits a token and updates the preview without a reload', async ({ page }) => {
    await page.goto('/');
    await createSystem(page, `Preview ${runId}`);

    const primaryButton = page
      .getByTestId('preview-light')
      .getByRole('button', { name: 'Primary' });

    const before = await primaryButton.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );

    await page.getByLabel('primary step').selectOption('900');

    // No navigation, no refetch — the draft is resolved in the browser.
    await expect
      .poll(() => primaryButton.evaluate((element) => getComputedStyle(element).backgroundColor))
      .not.toBe(before);

    // And it still reaches the server.
    await expect(page.getByRole('status')).toHaveText('Saved', { timeout: 5000 });
  });

  test('persists edits across a reload', async ({ page }) => {
    await page.goto('/');
    await createSystem(page, `Persist ${runId}`);

    await page.getByLabel('primary step').selectOption('800');
    await expect(page.getByRole('status')).toHaveText('Saved', { timeout: 5000 });

    await page.reload();

    await expect(page.getByLabel('primary step')).toHaveValue('800');
  });

  test('shows the generated files and downloads a zip', async ({ page }) => {
    await page.goto('/');
    await createSystem(page, `Export ${runId}`);

    await page.getByRole('button', { name: 'export' }).click();

    const code = page.locator('pre');
    await expect(code).toContainText("@import 'tailwindcss'");
    await expect(code).toContainText('--color-brand-500');
    await expect(code).toContainText('@theme static');

    await page.getByRole('button', { name: 'tokens.css' }).click();
    await expect(code).toContainText('--spacing-4');
    await expect(code).not.toContainText('@theme');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download .zip' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe(`export-${runId}.zip`);
  });

  test('reports a failing contrast pair', async ({ page }) => {
    await page.goto('/');
    await createSystem(page, `Contrast ${runId}`);

    await expect(page.getByText('foreground on background')).toBeVisible();

    // Exact, or this also matches "card-foreground step" and friends.
    await page.getByLabel('foreground step', { exact: true }).selectOption('200');

    await expect(page.getByText('Fails').first()).toBeVisible();
  });

  test('signs out and returns to the login page', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/\/login$/);
  });
});
