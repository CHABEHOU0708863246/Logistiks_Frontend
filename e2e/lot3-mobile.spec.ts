import { expect, Page, test } from '@playwright/test';

function base64Url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function createJwt(payload: Record<string, unknown>, lifetimeSeconds = 3600): string {
  const exp = Math.floor(Date.now() / 1000) + lifetimeSeconds;
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url({ ...payload, exp })}.signature`;
}

const PERMISSIONS = [
  'Dashboard_View',
  'Customer_Read',
  'Supplier_Read',
  'Vehicle_Read',
  'Document_Read',
  'Contract_Read',
  'Payment_Read',
  'Payment_Record',
  'Expense_Read',
  'Account_Read',
  'ROI_Read',
  'Report_Read',
  'Report_Generate',
  'Calculation_Read',
  'User_Manage',
  'Role_Manage',
  'Settings_Read',
  'Audit_Read',
];

const USER = {
  id: 'e2e-mobile',
  username: 'e2e.mobile@logistik.test',
  email: 'e2e.mobile@logistik.test',
  phone: '+22500000000',
  firstName: 'E2E',
  lastName: 'Mobile',
  photoUrl: '',
  isActive: true,
  roles: ['MANAGER'],
  permissions: PERMISSIONS,
};

async function installMocks(page: Page): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.toLowerCase();

    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        },
      });
      return;
    }

    const json = (body: unknown) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(body),
      });

    if (path.endsWith('/api/auth/me')) {
      await json(USER);
      return;
    }

    if (path.endsWith('/api/auth/logout')) {
      await json(true);
      return;
    }

    if (path.includes('/vehicles/statistics')) {
      await json({
        success: true,
        data: {
          totalVehicles: 0,
          availableVehicles: 0,
          rentedVehicles: 0,
          vehiclesWithExpiredInsurance: 0,
        },
      });
      return;
    }

    if (path.includes('/vehicles/')) {
      await json({ success: true, data: [], totalCount: 0 });
      return;
    }

    await json({ success: true, data: [], totalCount: 0 });
  });
}

async function openDashboard(page: Page, expectMobile: boolean = true): Promise<void> {
  const token = createJwt({ id: USER.id, role: 'MANAGER', Permission: PERMISSIONS });

  await page.addInitScript(
    ({ value }) => {
      localStorage.setItem(
        'logistiks_auth_data',
        JSON.stringify({ token: value, role: 'MANAGER', rememberMe: true })
      );
      localStorage.setItem('remember_me', 'true');
    },
    { value: token }
  );

  await installMocks(page);
  await page.goto('/dashboard');

  if (expectMobile) {
    await expect(page.locator('.mobile-header')).toBeVisible();
    await expect(page.locator('.topbar')).toBeHidden();
  } else {
    await expect(page.locator('.mobile-header')).toBeHidden();
    await expect(page.locator('.topbar')).toBeVisible();
  }
}

test.describe('Lot 3 — coquille mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('tiroir, focus, scroll, navigation et barre basse', async ({ page }) => {
    await openDashboard(page);

    const sidebar = page.locator('#sidebar');
    const backdrop = page.locator('.sidebar-backdrop');
    const menuButton = page.locator('.mobile-header__icon[aria-label="Ouvrir le menu"]');
    const bottomNav = page.locator('.mobile-bottom-nav');

    await expect(bottomNav).toBeVisible();
    await expect(bottomNav.locator('.mobile-bottom-nav__item')).toHaveCount(5);
    await expect(bottomNav.getByText('Accueil')).toBeVisible();
    await expect(bottomNav.getByText('Contrats')).toBeVisible();
    await expect(bottomNav.getByText('Encaisser')).toBeVisible();
    await expect(bottomNav.getByText('Tiers')).toBeVisible();
    await expect(bottomNav.getByText('Plus')).toBeVisible();
    await expect(page.locator('.mobile-header__profile')).toHaveAttribute(
      'href',
      '/dashboard/profiles'
    );

    // Le bouton « Plus » ouvre aussi le tiroir.
    await bottomNav.getByText('Plus').click();
    await expect(sidebar).toHaveClass(/open/);
    await page.keyboard.press('Escape');
    await expect(sidebar).not.toHaveClass(/open/);

    // Aucun lien mort dans le menu.
    await menuButton.click();
    await expect(sidebar).toHaveClass(/open/);
    await expect(page.locator('#sidebar a[href*="impayes"]')).toHaveCount(0);
    await expect(page.locator('#sidebar a[href*="assurances"]')).toHaveCount(0);
    await expect(page.locator('#sidebar a[href*="maintenance"]')).toHaveCount(0);
    await expect(page.locator('#sidebar a[href*="planifies"]')).toHaveCount(0);
    await expect(page.getByText('Contrats expirants')).toHaveCount(0);

    // Fermeture par le fond.
    await page.mouse.click(380, 500);
    await expect(sidebar).not.toHaveClass(/open/);

    // Répétition sans limite : ouverture/fermeture par Échap.
    for (let index = 0; index < 4; index++) {
      await menuButton.click();
      await expect(sidebar).toHaveClass(/open/);
      await expect(page.locator('body')).toHaveClass(/iam-nav-open/);
      await expect.poll(() =>
        page.evaluate(() => document.body.classList.contains('iam-nav-open'))
      ).toBe(true);
      await page.keyboard.press('Escape');
      await expect(sidebar).not.toHaveClass(/open/);
      await expect(page.locator('body')).not.toHaveClass(/iam-nav-open/);
    }

    // Focus maintenu dans le menu + défilement bloqué.
    await menuButton.click();
    await expect(sidebar).toHaveClass(/open/);
    await expect.poll(() => page.evaluate(() => window.getComputedStyle(document.body).overflow)).toBe(
      'hidden'
    );
    await expect
      .poll(() =>
        page.evaluate(() => document.activeElement?.closest('#sidebar') !== null)
      )
      .toBe(true);

    await page.keyboard.press('Shift+Tab');
    await expect
      .poll(() =>
        page.evaluate(() => document.activeElement?.closest('#sidebar') !== null)
      )
      .toBe(true);

    await page.keyboard.press('Escape');
    await expect(sidebar).not.toHaveClass(/open/);

    // Fermeture à chaque navigation.
    await menuButton.click();
    await expect(sidebar).toHaveClass(/open/);
    await page.locator('#sidebar a[href="/dashboard/documents"]').click();
    await expect(page).toHaveURL(/\/dashboard\/documents/);
    await expect(page.locator('.mobile-header__title')).toContainText('Documents');
    await expect(page.locator('.mobile-header__icon[aria-label="Retour"]')).toBeVisible();
    await expect(sidebar).not.toHaveClass(/open/);
    await expect(page.locator('body')).not.toHaveClass(/iam-nav-open/);

    // Action principale toujours accessible.
    await bottomNav.getByLabel(/Encaisser/).click();
    await expect(page).toHaveURL(/transactions\/nouvelle\?type=revenue/);
    await expect(page.locator('.mobile-header__title')).toHaveText('Encaisser');
    await expect(page.locator('.tx-type-revenue')).toHaveClass(/active/);

    // Aucun calque cliquable quand le tiroir est fermé.
    const closedState = await page.evaluate(() => {
      const panel = document.getElementById('sidebar');
      const overlay = document.querySelector('.sidebar-backdrop');
      return {
        panelPointerEvents: panel ? getComputedStyle(panel).pointerEvents : null,
        panelVisibility: panel ? getComputedStyle(panel).visibility : null,
        overlayPointerEvents: overlay ? getComputedStyle(overlay).pointerEvents : null,
        overlayVisibility: overlay ? getComputedStyle(overlay).visibility : null,
      };
    });

    expect(closedState.panelPointerEvents).toBe('none');
    expect(closedState.panelVisibility).toBe('hidden');
    expect(closedState.overlayPointerEvents).toBe('none');
    expect(closedState.overlayVisibility).toBe('hidden');
  });

  test('desktop : sidebar fixe et repliable', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openDashboard(page, false);

    const sidebar = page.locator('#sidebar');
    await expect(page.locator('.mobile-header')).toBeHidden();
    await expect(page.locator('.mobile-bottom-nav')).toBeHidden();
    await expect(page.locator('.topbar')).toBeVisible();
    await expect(page.locator('.menu-toggle-btn').first()).toBeHidden();

    await expect(sidebar).toHaveCSS('width', '268px');
    await page.locator('.sidebar-collapse-btn').click();
    await expect(sidebar).toHaveCSS('width', '84px');
    await expect(page.locator('.main-content')).toHaveCSS('margin-left', '84px');

    await page.locator('.sidebar-collapse-btn').click();
    await expect(sidebar).toHaveCSS('width', '268px');
    await expect(page.locator('.main-content')).toHaveCSS('margin-left', '268px');
  });
});
