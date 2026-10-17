import { expect, test, type Page } from '@playwright/test';

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

// Weather is disabled in this run, so its 503 is expected; everything else must be clean.
const unexpected = (errors: ReadonlyArray<string>) => errors.filter((e) => !/503|Service Unavailable/i.test(e));

test('every page renders and navigation marks the current page', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Next up' })).toBeVisible();
  await expect(page.getByText(/Weather is unavailable right now/)).toBeVisible();

  for (const [link, heading] of [
    ['Calendar', 'Calendar'],
    ['Inventory', 'Inventory'],
    ['Shopping', 'Shopping'],
    ['Settings', 'Settings'],
  ] as const) {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: link }).click();
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.getByRole('link', { name: link })).toHaveAttribute('aria-current', 'page');
  }
  expect(unexpected(errors)).toEqual([]);
});

test('add a task from the dialog and see it in the calendar', async ({ page }, testInfo) => {
  const title = `Edge the front walk (${testInfo.project.name})`;
  await page.goto('/calendar');
  await page.getByRole('button', { name: 'Add task' }).click();
  const dialog = page.getByRole('dialog', { name: 'New task' });
  await expect(dialog.getByLabel('Title')).toBeFocused();

  await dialog.getByRole('button', { name: 'Add task' }).click();
  await expect(dialog.getByText('Title is required')).toBeVisible();

  await dialog.getByLabel('Title').fill(title);
  await dialog.getByLabel('Category').selectOption('mowing');
  await dialog.getByRole('button', { name: 'Add task' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: title })).toBeVisible();
});

test('theme toggle switches and remembers night mode', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Night theme' });
  const startDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await toggle.click();
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(!startDark);
  await page.reload();
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(!startDark);
});

test('shopping preview runs without touching the list', async ({ page }) => {
  await page.goto('/shopping');
  await page.getByRole('button', { name: '120 days' }).click();
  await page.getByRole('button', { name: 'Preview only' }).click();
  await expect(page.getByRole('status').filter({ hasText: /Preview:/ })).toBeVisible();
});
