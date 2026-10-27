import { expect, test } from '@playwright/test';

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
  id: 'e2e-user',
  username: 'e2e.manager@logistik.test',
  email: 'e2e.manager@logistik.test',
  phone: '+22500000000',
  firstName: 'E2E',
  lastName: 'Manager',
  photoUrl: '',
  isActive: true,
  roles: ['MANAGER'],
  permissions: PERMISSIONS,
};

test.use({ viewport: { width: 1280, height: 800 } });

test.describe('Lot 2 — session fiable', () => {
  test('expired token refresh, clean logout and immediate login', async ({ page }) => {
    let loginCount = 0;
    let refreshCount = 0;

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

      const json = (body: unknown, status = 200) =>
        route.fulfill({
          status,
          contentType: 'application/json',
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify(body),
        });

      if (path.endsWith('/api/auth/login')) {
        loginCount += 1;
        await json({
          token: createJwt({ id: USER.id, role: 'MANAGER', Permission: PERMISSIONS }),
          refreshToken: `refresh-${loginCount}`,
        });
        return;
      }

      if (path.endsWith('/api/auth/refresh-token')) {
        refreshCount += 1;
        await json({
          token: createJwt({ id: USER.id, role: 'MANAGER', Permission: PERMISSIONS }),
          refreshToken: `refresh-${loginCount}-${refreshCount}`,
        });
        return;
      }

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

      if (
        path.includes('/vehicles/available') ||
        path.includes('/vehicles/rented') ||
        path.includes('/vehicles/maintenance') ||
        path.includes('/vehicles/expiring-insurance') ||
        path.includes('/vehicles/search')
      ) {
        await json({ success: true, data: [], totalCount: 0 });
        return;
      }

      if (
        path.includes('/tiers') ||
        path.includes('/documents') ||
        path.includes('/contracts')
      ) {
        await json({ success: true, data: [], totalCount: 0 });
        return;
      }

      await json({ success: true, data: [], totalCount: 0 });
    });

    await page.goto('/auth/login');
    await page.locator('#email').fill(USER.email);
    await page.locator('#password').fill('Password123!');
    await page.locator('button[type=submit]').click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('.topbar-user')).toBeVisible();
    expect(loginCount).toBe(1);

    const storedSession = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('logistiks_auth_data') || '{}')
    );
    expect(storedSession.rememberMe).toBe(true);

    // Jeton expiré : le guard doit rafraîchir avant d'afficher le dashboard.
    const expiredToken = createJwt(
      { id: USER.id, role: 'MANAGER', Permission: PERMISSIONS },
      -60
    );
    await page.evaluate((token) => {
      const data = JSON.parse(localStorage.getItem('logistiks_auth_data') || '{}');
      data.token = token;
      localStorage.setItem('logistiks_auth_data', JSON.stringify(data));
    }, expiredToken);

    const refreshBeforeReload = refreshCount;
    await page.reload();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('.topbar-user')).toBeVisible();
    expect(refreshCount).toBeGreaterThan(refreshBeforeReload);

    // Route protégée par permission : un jeton sans User_Manage doit être refusé.
    const limitedToken = createJwt({
      id: USER.id,
      role: 'DRIVER',
      Permission: ['Vehicle_Read'],
    });
    await page.evaluate((token) => {
      const data = JSON.parse(localStorage.getItem('logistiks_auth_data') || '{}');
      data.token = token;
      data.role = 'DRIVER';
      localStorage.setItem('logistiks_auth_data', JSON.stringify(data));
    }, limitedToken);

    await page.goto('/dashboard/users');
    await expect(page).toHaveURL(/\/access-denied/);
    await expect(page.locator('h1')).toHaveText('Accès refusé');

    await page.goto('/dashboard');
    await expect(page.locator('.topbar-user')).toBeVisible();

    // Déconnexion propre.
    await page.locator('.topbar-user').click();
    await page.locator('.dropdown-item--danger').click();
    await expect(page).toHaveURL(/\/auth\/login/);

    const cleared = await page.evaluate(() => ({
      local: localStorage.getItem('logistiks_auth_data'),
      session: sessionStorage.getItem('logistiks_auth_data'),
      refresh: localStorage.getItem('refresh_token'),
    }));
    expect(cleared).toEqual({ local: null, session: null, refresh: null });

    // Reconnexion immédiate.
    await page.locator('#email').fill(USER.email);
    await page.locator('#password').fill('Password123!');
    await page.locator('button[type=submit]').click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('.topbar-user')).toBeVisible();
    expect(loginCount).toBe(2);
  });
});
