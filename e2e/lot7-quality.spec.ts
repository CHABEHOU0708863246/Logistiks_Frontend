import { expect, Page, test } from '@playwright/test';

const PERMISSIONS = [
  'Dashboard_View',
  'Contract_Read',
  'Contract_Create',
  'Payment_Read',
  'Payment_Record',
  'Customer_Read',
  'Vehicle_Read',
  'Document_Read',
  'Report_Read',
  'Report_Generate',
  'User_Manage',
  'Settings_Read',
  'Audit_Read',
];

function base64Url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function createJwt(payload: Record<string, unknown>, lifetimeSeconds = 3600): string {
  const exp = Math.floor(Date.now() / 1000) + lifetimeSeconds;
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url({ ...payload, exp })}.signature`;
}

const USER = {
  id: 'e2e-lot7',
  username: 'e2e.lot7@logistik.test',
  email: 'e2e.lot7@logistik.test',
  firstName: 'E2E',
  lastName: 'Recette',
  phone: '+22500000000',
  isActive: true,
  roles: ['SUPER_ADMIN'],
  permissions: PERMISSIONS,
};

async function installApiMocks(page: Page): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.toLowerCase();

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

    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(body),
      });

    if (path.endsWith('/api/auth/login')) {
      await json({
        token: createJwt({ id: USER.id, role: 'SUPER_ADMIN', Permission: PERMISSIONS }),
        refreshToken: 'refresh-lot7',
      });
      return;
    }

    if (path.endsWith('/api/auth/me')) {
      await json(USER);
      return;
    }

    if (path === '/api/v2/dashboard') {
      await json({
        success: true,
        message: '',
        data: {
          generatedAt: new Date().toISOString(),
          periodLabel: 'Octobre 2026',
          periodStart: '2026-10-01T00:00:00Z',
          periodEnd: '2026-10-31T23:59:59Z',
          kpis: {
            totalRevenue: 0,
            totalExpenses: 0,
            netProfit: 0,
            profitMarginPercent: 0,
            revenueGrowthPercent: null,
            expenseGrowthPercent: null,
            profitGrowthPercent: null,
            totalVehicles: 0,
            rentedVehicles: 0,
            availableVehicles: 0,
            maintenanceVehicles: 0,
            fleetUtilizationPercent: 0,
            activeContracts: 0,
            newContractsThisMonth: 0,
            expiringIn30Days: 0,
            averageContractValue: 0,
            totalClients: 0,
            clientsWithDebt: 0,
            totalOutstandingDebt: 0,
          },
          revenueChart: [],
          expenseBreakdown: [],
          fleetStats: {
            totalVehicles: 0,
            rentedCount: 0,
            availableCount: 0,
            maintenanceCount: 0,
            outOfServiceCount: 0,
            byType: [],
            utilizationPercent: 0,
          },
          contractPerformance: {
            totalContracts: 0,
            activeContracts: 0,
            completedContracts: 0,
            terminatedContracts: 0,
            totalRevenue: 0,
            averageContractValue: 0,
            collectionRate: 0,
            topContracts: [],
          },
          topVehicles: [],
          alerts: { totalAlerts: 0, criticalCount: 0, items: [] },
          executionTimeMs: 1,
        },
      });
      return;
    }

    await json({ success: true, message: '', data: [], totalCount: 0 });
  });
}

test.describe('Lot 7 — connexion statique et PWA', () => {
  test('connexion mobile, session conservée après actualisation', async ({ page }) => {
    await installApiMocks(page);
    await page.goto('/');

    await expect(page.locator('#iam-static-login')).toBeVisible();
    await expect(page.locator('#isl-email')).toHaveAttribute('autocomplete', 'username');
    await expect(page.locator('#isl-password')).toHaveAttribute('autocomplete', 'current-password');

    const emailBox = await page.locator('#isl-email').boundingBox();
    const passwordBox = await page.locator('#isl-password').boundingBox();
    expect(emailBox).not.toBeNull();
    expect(passwordBox).not.toBeNull();
    expect(emailBox!.height).toBeGreaterThanOrEqual(48);
    expect(passwordBox!.height).toBeGreaterThanOrEqual(48);

    await page.locator('#isl-password').fill('Password123!');
    await page.locator('#isl-toggle').click();
    await expect(page.locator('#isl-password')).toHaveAttribute('type', 'text');
    await page.locator('#isl-toggle').click();
    await expect(page.locator('#isl-password')).toHaveAttribute('type', 'password');

    await page.locator('#isl-email').fill(USER.email);
    await page.locator('#isl-submit').click();

    await expect(page).toHaveURL(/\/dashboard$/);
    const mobile = (page.viewportSize()?.width ?? 390) <= 900;
    await expect(page.locator(mobile ? '.mobile-header' : '.topbar')).toBeVisible();

    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('logistiks_auth_data') || '{}')
    );
    expect(stored.token).toBeTruthy();
    expect(stored.rememberMe).toBe(true);

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator(mobile ? '.mobile-header' : '.topbar')).toBeVisible();
  });

  test('connexion desktop sans débordement horizontal', async ({ page }) => {
    await installApiMocks(page);
    await page.goto('/');

    const card = page.locator('.isl-card');
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(440);

    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    );
    expect(fits).toBe(true);
  });

});

test.describe('Lot 7 — PWA', () => {
  test.use({ serviceWorkers: 'allow' });

  test('PWA installable : manifest, icônes et service worker', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Installabilité vérifiée sur Chromium (Chrome Android).');

    await page.goto('/');

    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });

    // Au premier chargement le SW s'installe ; un rechargement le rend actif.
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);

    const manifest = await page.evaluate(async () => {
      const response = await fetch('manifest.webmanifest');
      return response.json();
    });

    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.icons.some((icon: { sizes: string }) => icon.sizes === '192x192')).toBe(true);
    expect(manifest.icons.some((icon: { sizes: string }) => icon.sizes === '512x512')).toBe(true);

    const cdp = await page.context().newCDPSession(page);
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
    expect(installabilityErrors).toEqual([]);
  });
});
