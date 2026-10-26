import { test, expect, type Page } from '@playwright/test';

const API_HOSTS = ['https://localhost:7134', 'https://logistiks-backend.onrender.com'];

const user = {
  id: '1',
  username: 'gestionnaire',
  email: 'gestionnaire@logistiks.ci',
  firstName: 'Awa',
  lastName: 'Kone',
  phone: '0700000000',
  isActive: true,
  roles: ['SUPER_ADMIN'],
  permissions: []
};

const contract = {
  id: 'C1',
  contractNumber: 'CONT-202610-0001',
  contractType: 1,
  customerId: 'T1',
  customerName: 'Client Test',
  customerPhone: '0700000001',
  vehicleId: 'V1',
  vehicleCode: 'MOTO-001',
  vehicleFullName: 'Yamaha Crypton',
  startDate: '2026-10-01T00:00:00.000Z',
  endDate: '2026-12-31T00:00:00.000Z',
  durationInWeeks: 12,
  weeklyAmount: 50000,
  totalAmount: 600000,
  securityDeposit: 0,
  depositPaid: true,
  paymentFrequency: 1,
  paymentFrequencyLabel: 'Hebdomadaire',
  paymentDay: 1,
  paymentDayLabel: 'Lundi',
  status: 3,
  statusLabel: 'Actif',
  isActive: true,
  isExpired: false,
  terms: {},
  documentsCount: 1,
  createdBy: '1',
  createdAt: '2026-10-01T00:00:00.000Z',
  weeksRemaining: 10,
  daysRemaining: 70
};

function token(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: '1',
    id: '1',
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + 3600,
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'SUPER_ADMIN',
    role: 'SUPER_ADMIN'
  })).toString('base64url');
  return `${header}.${payload}.signature`;
}

async function openApp(page: Page, path: string): Promise<void> {
  await page.addInitScript((authToken) => {
    localStorage.setItem('logistiks_auth_data', JSON.stringify({ token: authToken, role: 'SUPER_ADMIN' }));
    localStorage.setItem('remember_me', 'true');
  }, token());
  await page.route(/https:\/\/(localhost:7134|logistiks-backend\.onrender\.com)\/.*/, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname === '/api/Auth/me' || pathname === '/api/user/me') {
      return route.fulfill({ json: user });
    }

    if (pathname.includes('/Contracts/search')) {
      return route.fulfill({
        json: {
          success: true,
          message: '',
          data: [contract],
          totalCount: 1,
          pageNumber: 1,
          pageSize: 20,
          totalPages: 1
        }
      });
    }

    if (pathname.match(/\/Contracts\/[^/]+\/penalties$/)) {
      return route.fulfill({
        json: {
          success: true,
          message: '',
          data: {
            contractId: contract.id,
            contractNumber: contract.contractNumber,
            lateFeePerPayment: 0,
            gracePeriodDays: 0,
            totalPenalties: 0,
            totalOverduePayments: 0,
            payments: []
          }
        }
      });
    }

    if (request.method() === 'POST' && pathname.match(/\/Contracts\/[^/]+\/payments$/)) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return route.fulfill({
        json: {
          success: true,
          message: 'Paiement enregistré',
          data: {
            contractId: contract.id,
            contractNumber: contract.contractNumber,
            paymentDate: new Date().toISOString(),
            amountDue: 50000,
            amountPaid: 50000,
            status: 2,
            statusLabel: 'Payé',
            method: 1,
            reference: '',
            recordedBy: '1',
            recordedAt: new Date().toISOString()
          }
        }
      });
    }

    if (pathname.includes('/Contracts/active') || pathname.includes('/Contracts/expiring') || pathname.includes('/Contracts/payments/overdue')) {
      return route.fulfill({ json: { success: true, message: '', data: [] } });
    }

    if (pathname.startsWith('/api/v1/Contracts/')) {
      return route.fulfill({ json: { success: true, message: '', data: contract } });
    }

    if (pathname.startsWith('/api/v1/audit')) {
      return route.fulfill({ json: { success: true, message: '', data: [], totalCount: 0, pageNumber: 1, pageSize: 20, totalPages: 0 } });
    }

    if (pathname.startsWith('/api/v1/settings')) {
      return route.fulfill({ json: { success: true, message: '', data: [] } });
    }

    return route.fulfill({
      json: {
        success: true,
        message: '',
        data: [],
        items: [],
        totalCount: 0,
        pageNumber: 1,
        pageSize: 20,
        totalPages: 0
      }
    });
  });

  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
}

test.describe('Lot U — mobile 390x844', () => {
  test('menu latéral : 20 ouvertures, fond cliquable, Échap et navigation', async ({ page }) => {
    await openApp(page, '/dashboard/about');
    const sidebar = page.locator('#sidebar');
    const toggle = page.locator('.menu-toggle-btn').first();
    const backdrop = page.locator('.sidebar-backdrop');

    await expect(sidebar).not.toHaveClass(/open/);

    for (let i = 0; i < 20; i++) {
      await toggle.click();
      await expect(sidebar).toHaveClass(/open/);
      await expect(backdrop).toHaveClass(/show/);
      await expect.poll(async () => Math.round((await sidebar.boundingBox())?.x ?? -1)).toBe(0);
      await page.mouse.click(360, 420);
      await expect(sidebar).not.toHaveClass(/open/);
      await expect.poll(async () => Math.round((await sidebar.boundingBox())?.x ?? 0)).toBe(-268);
    }

    await toggle.click();
    await expect(sidebar).toHaveClass(/open/);
    await page.keyboard.press('Escape');
    await expect(sidebar).not.toHaveClass(/open/);

    await toggle.click();
    await expect(sidebar).toHaveClass(/open/);
    await page.getByRole('link', { name: 'Tableau de bord' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('#sidebar')).not.toHaveClass(/open/);
  });

  test('hamburger disponible sur un écran secondaire', async ({ page }) => {
    await openApp(page, '/dashboard/finances/transactions');
    const toggle = page.locator('.menu-toggle-btn--mobile');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator('#sidebar')).toHaveClass(/open/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#sidebar')).not.toHaveClass(/open/);
  });

  test('aucune marge desktop résiduelle sur mobile', async ({ page }) => {
    const screens = [
      '/dashboard/audit',
      '/dashboard/documents/list',
      '/dashboard/finances/transactions',
      '/dashboard/finances/transactions/nouvelle',
      '/dashboard/vehicules/ajouter',
      '/dashboard/vehicules/list',
      '/dashboard/rentabilite/vehicules'
    ];

    for (const screen of screens) {
      await openApp(page, screen);
      const content = page.locator('.main-content, .layout-page').first();
      await expect(content).toBeVisible();
      const margin = await content.evaluate((element) => getComputedStyle(element).marginLeft);
      expect(margin, screen).toBe('0px');
    }
  });

  test('modale de paiement : plein écran, champs 16 px, inputmode decimal et envoi unique', async ({ page }) => {
    await openApp(page, '/dashboard/contrats');
    await page.keyboard.press('Escape');
    await expect(page.locator('#sidebar')).not.toHaveClass(/open/);
    await expect(page.locator('tr', { hasText: contract.contractNumber }).first()).toBeVisible();
    await page.evaluate(() => {
      const app = document.querySelector('app-contrats-list') as any;
      const ng = (window as any).ng;
      const component = ng.getComponent(app);
      component.openPaymentModal(component.contracts[0]);
      ng.applyChanges(component);
    });

    const sheet = page.locator('.modal-sheet--payment');
    await expect(sheet).toBeVisible();

    const box = await sheet.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.round(box!.width)).toBe(390);
    expect(Math.round(box!.height)).toBe(844);

    const amount = sheet.locator('input[formcontrolname="amountPaid"]');
    await expect(amount).toHaveAttribute('inputmode', 'decimal');
    const fontSize = await amount.evaluate((element) => getComputedStyle(element).fontSize);
    expect(fontSize).toBe('16px');

    let paymentRequests = 0;
    page.on('request', (request) => {
      if (request.method() === 'POST' && /\/Contracts\/[^/]+\/payments$/.test(new URL(request.url()).pathname)) {
        paymentRequests++;
      }
    });

    await amount.fill('50000');
    const submit = sheet.locator('button[type="submit"]');
    await submit.click();
    await page.evaluate(() => {
      const form = document.querySelector('.modal-sheet--payment form') as HTMLFormElement | null;
      form?.requestSubmit();
      form?.requestSubmit();
    });

    await expect(sheet).toBeHidden({ timeout: 10_000 });
    expect(paymentRequests).toBe(1);
  });

  test('lien Paramètres du menu utilisateur', async ({ page }) => {
    await openApp(page, '/dashboard/about');
    await page.locator('.topbar-user').click();
    const settings = page.locator('.dropdown-menu a', { hasText: 'Paramètres' });
    await expect(settings).toHaveAttribute('href', '/dashboard/settings/general');
    await settings.click();
    await expect(page).toHaveURL(/\/dashboard\/settings\/general/);
  });
});

test.describe('Lot U — non-régression desktop 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('sidebar visible et contenu toujours décalé de 268 px', async ({ page }) => {
    await openApp(page, '/dashboard/audit');
    await expect(page.locator('#sidebar')).toBeVisible();
    await expect(page.locator('.sidebar-backdrop')).toBeHidden();
    await expect(page.locator('.menu-toggle-btn--mobile')).toBeHidden();
    const margin = await page.locator('.main-content').evaluate((element) => getComputedStyle(element).marginLeft);
    expect(margin).toBe('268px');
  });
});
