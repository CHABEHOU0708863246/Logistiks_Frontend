import { expect, Page, test } from '@playwright/test';

type LoginMode = 'ok' | '401' | '423' | 'offline';

function base64Url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function createJwt(payload: Record<string, unknown>, lifetimeSeconds = 3600): string {
  const exp = Math.floor(Date.now() / 1000) + lifetimeSeconds;
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url({ ...payload, exp })}.signature`;
}

interface AuthMocks {
  login: LoginMode;
  forgotOffline: boolean;
  resetOffline: boolean;
  resetTokenValid: boolean;
}

async function installAuthMocks(page: Page, mocks: AuthMocks): Promise<void> {
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
      if (mocks.login === 'offline') {
        await route.abort('internetdisconnected');
        return;
      }

      if (mocks.login === '401') {
        await json({ success: false, message: 'Unauthorized' }, 401);
        return;
      }

      if (mocks.login === '423') {
        await json({ success: false, message: 'Compte verrouillé' }, 423);
        return;
      }

      await json({
        token: createJwt({ id: 'e2e-user', role: 'MANAGER', Permission: [] }),
        refreshToken: 'refresh-e2e',
      });
      return;
    }

    if (path.endsWith('/api/auth/forgot-password')) {
      if (mocks.forgotOffline) {
        await route.abort('internetdisconnected');
        return;
      }

      await json({ success: true, message: 'Email envoyé' });
      return;
    }

    if (path.endsWith('/api/auth/validate-reset-token')) {
      await json({
        success: mocks.resetTokenValid,
        message: mocks.resetTokenValid ? '' : 'Lien expiré',
      });
      return;
    }

    if (path.endsWith('/api/auth/reset-password')) {
      if (mocks.resetOffline) {
        await route.abort('internetdisconnected');
        return;
      }

      await json({ success: true, message: 'Mot de passe réinitialisé' });
      return;
    }

    if (path.endsWith('/api/auth/me')) {
      await json({
        id: 'e2e-user',
        email: 'e2e@logistik.test',
        firstName: 'E2E',
        lastName: 'User',
        isActive: true,
        roles: ['MANAGER'],
        permissions: [],
      });
      return;
    }

    await json({ success: true, data: [], totalCount: 0 });
  });
}

async function fontSize(page: Page, selector: string): Promise<string> {
  return page
    .locator(selector)
    .evaluate((element) => getComputedStyle(element).fontSize);
}

test.describe('Lot 5 — connexion et mot de passe sur mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('connexion : une colonne, champs 16 px, autocomplete et mot de passe masquable', async ({
    page,
  }) => {
    await installAuthMocks(page, {
      login: 'ok',
      forgotOffline: false,
      resetOffline: false,
      resetTokenValid: true,
    });

    await page.goto('/auth/login');

    const email = page.locator('#email');
    const password = page.locator('#password');

    await expect(email).toHaveAttribute('autocomplete', 'username');
    await expect(password).toHaveAttribute('autocomplete', 'current-password');
    await expect(email).toHaveAttribute('inputmode', 'email');

    expect(await fontSize(page, '#email')).toBe('16px');
    expect(await fontSize(page, '#password')).toBe('16px');

    const emailBox = await email.boundingBox();
    const passwordBox = await password.boundingBox();
    const submitBox = await page.locator('button[type=submit]').boundingBox();

    expect(emailBox).not.toBeNull();
    expect(passwordBox).not.toBeNull();
    expect(submitBox).not.toBeNull();

    // Une seule colonne : mêmes abscisse et largeur pour les deux champs.
    expect(Math.abs(emailBox!.x - passwordBox!.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(emailBox!.width - passwordBox!.width)).toBeLessThanOrEqual(2);
    expect(emailBox!.height).toBeGreaterThanOrEqual(48);
    expect(passwordBox!.height).toBeGreaterThanOrEqual(48);
    expect(submitBox!.height).toBeGreaterThanOrEqual(48);

    const toggle = page.locator('button.password-toggle');
    await expect(toggle).toHaveAttribute('aria-label', 'Afficher le mot de passe');
    await expect(password).toHaveAttribute('type', 'password');

    await password.fill('Secret123!');
    await toggle.click();
    await expect(password).toHaveAttribute('type', 'text');
    await expect(toggle).toHaveAttribute('aria-label', 'Masquer le mot de passe');

    const toggleBox = await toggle.boundingBox();
    expect(toggleBox).not.toBeNull();
    expect(toggleBox!.width).toBeGreaterThanOrEqual(44);
    expect(toggleBox!.height).toBeGreaterThanOrEqual(44);

    await toggle.click();
    await expect(password).toHaveAttribute('type', 'password');
  });

  test('connexion : identifiants faux, compte verrouillé et hors ligne', async ({ page }) => {
    const mocks: AuthMocks = {
      login: '401',
      forgotOffline: false,
      resetOffline: false,
      resetTokenValid: true,
    };
    await installAuthMocks(page, mocks);

    await page.goto('/auth/login');

    const email = page.locator('#email');
    const password = page.locator('#password');
    const submit = page.locator('button[type=submit]');
    const alert = page.locator('.form-alert');

    await email.fill('e2e@logistik.test');
    await password.fill('MauvaisMotDePasse!');
    await submit.click();
    await expect(alert).toContainText('Email ou mot de passe incorrect');

    mocks.login = '423';
    await submit.click();
    await expect(alert).toContainText(/compte est verrouillé/i);

    mocks.login = 'offline';
    await submit.click();
    await expect(alert).toContainText(/hors ligne/i);
  });

  test('mot de passe oublié : formulaire mobile et erreur hors ligne', async ({ page }) => {
    const mocks: AuthMocks = {
      login: 'ok',
      forgotOffline: true,
      resetOffline: false,
      resetTokenValid: true,
    };
    await installAuthMocks(page, mocks);

    await page.goto('/auth/forgot-password');

    const email = page.locator('#email');
    await expect(email).toHaveAttribute('autocomplete', 'email');
    expect(await fontSize(page, '#email')).toBe('16px');

    const emailBox = await email.boundingBox();
    expect(emailBox).not.toBeNull();
    expect(emailBox!.height).toBeGreaterThanOrEqual(48);

    const primary = await page.locator('.btn-primary').boundingBox();
    const secondary = await page.locator('.btn-secondary').boundingBox();
    expect(primary).not.toBeNull();
    expect(secondary).not.toBeNull();
    expect(Math.abs(primary!.x - secondary!.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(primary!.width - secondary!.width)).toBeLessThanOrEqual(2);

    await email.fill('e2e@logistik.test');
    await page.locator('button[type=submit]').click();
    await expect(page.locator('.alert-error')).toContainText(/hors ligne/i);
  });

  test('réinitialisation : champs 16 px, autocomplete, confirmation et hors ligne', async ({
    page,
  }) => {
    const mocks: AuthMocks = {
      login: 'ok',
      forgotOffline: false,
      resetOffline: false,
      resetTokenValid: true,
    };
    await installAuthMocks(page, mocks);

    await page.goto('/auth/reset-password?email=e2e%40logistik.test&token=jeton-e2e');

    const newPassword = page.locator('#newPassword');
    const confirmPassword = page.locator('#confirmPassword');

    await expect(newPassword).toBeVisible();
    await expect(newPassword).toHaveAttribute('autocomplete', 'new-password');
    await expect(confirmPassword).toHaveAttribute('autocomplete', 'new-password');
    expect(await fontSize(page, '#newPassword')).toBe('16px');
    expect(await fontSize(page, '#confirmPassword')).toBe('16px');

    const newBox = await newPassword.boundingBox();
    const confirmBox = await confirmPassword.boundingBox();
    expect(newBox).not.toBeNull();
    expect(confirmBox).not.toBeNull();
    expect(newBox!.height).toBeGreaterThanOrEqual(48);
    expect(confirmBox!.height).toBeGreaterThanOrEqual(48);

    const toggle = page.locator('.toggle-password').first();
    await expect(toggle).toHaveAttribute('aria-label', 'Afficher le mot de passe');
    await newPassword.fill('Secret123!');
    await toggle.click();
    await expect(newPassword).toHaveAttribute('type', 'text');
    await expect(toggle).toHaveAttribute('aria-label', 'Masquer le mot de passe');
    await toggle.click();
    await expect(newPassword).toHaveAttribute('type', 'password');

    await confirmPassword.fill('Different123!');
    await expect(page.locator('.error-message')).toContainText(/ne correspondent pas/i);

    mocks.resetOffline = true;
    await confirmPassword.fill('Secret123!');
    await page.locator('button[type=submit]').click();
    await expect(page.locator('.alert-error')).toContainText(/hors ligne/i);
  });
});
