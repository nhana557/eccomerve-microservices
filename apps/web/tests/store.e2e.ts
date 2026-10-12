import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('renders the storefront homepage with branding', async ({ app, screen }) => {
  await app.open('/');

  // Verify Navbar Brand link and subtitle
  await expect(screen.getByText('SYSTEMS COMMERCE')).toBeVisible();
  await expect(screen.getByText('OFFICIAL')).toBeVisible();
});

test('shows search input and popular keywords dropdown on focus', async ({ app, screen }) => {
  await app.open('/');

  const searchInput = screen.getByPlaceholder('Cari di T.STORE...');
  await expect(searchInput).toBeVisible();

  await searchInput.focus();
  await expect(screen.getByText('Pencarian Populer')).toBeVisible();
});

test('allows typing search query', async ({ app, screen }) => {
  await app.open('/');

  const searchInput = screen.getByPlaceholder('Cari di T.STORE...');
  await searchInput.fill('Mechanical Keyboard');
  await expect(searchInput).toHaveValue('Mechanical Keyboard');
});
