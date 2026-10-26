import { expect, Page, test } from '@playwright/test';

const PERMISSIONS = [
  'Dashboard_View',
  'Customer_Read',
  'Customer_Create',
  'Supplier_Read',
  'Supplier_Create',
  'Vehicle_Read',
  'Vehicle_Create',
  'Vehicle_Update',
  'Vehicle_Assign',
  'Document_Read',
  'Document_Upload',
  'Document_Download',
  'Contract_Read',
  'Contract_Create',
  'Contract_Update',
  'Contract_Validate',
  'Payment_Read',
  'Payment_Record',
  'Expense_Read',
  'Expense_Create',
  'Transfer_Read',
  'Transfer_Create',
  'Account_Read',
  'ROI_Read',
  'ROI_Calculate',
  'Calculation_Read',
  'Report_Read',
  'Report_Generate',
  'Report_Export',
  'Report_Schedule',
  'User_Manage',
  'Role_Manage',
  'Settings_Read',
  'Settings_Update',
  'Audit_Read',
  'Audit_Export',
];

function base64Url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function createJwt(payload: Record<string, unknown>): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url({ ...payload, exp })}.signature`;
}

const CONTRACT = {
  id: 'contract-1',
  contractNumber: 'CONT-202610-0001',
  contractType: 1,
  customerId: 'tier-1',
  customerName: 'Client Test',
  customerPhone: '0700000001',
  vehicleId: 'vehicle-1',
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
  daysRemaining: 70,
};

function dashboardSummary(): unknown {
  return {
    generatedAt: '2026-10-26T10:00:00Z',
    periodLabel: 'Octobre 2026',
    periodStart: '2026-10-01T00:00:00Z',
    periodEnd: '2026-10-31T23:59:59Z',
    kpis: {
      totalRevenue: 1000000,
      totalExpenses: 400000,
      netProfit: 600000,
      profitMarginPercent: 60,
      revenueGrowthPercent: 5,
      expenseGrowthPercent: 2,
      profitGrowthPercent: 8,
      totalVehicles: 10,
      rentedVehicles: 5,
      availableVehicles: 3,
      maintenanceVehicles: 1,
      fleetUtilizationPercent: 50,
      activeContracts: 4,
      newContractsThisMonth: 2,
      expiringIn30Days: 1,
      averageContractValue: 150000,
      totalClients: 9,
      clientsWithDebt: 2,
      totalOutstandingDebt: 75000,
    },
    revenueChart: [],
    expenseBreakdown: [],
    fleetStats: {
      totalVehicles: 10,
      rentedCount: 5,
      availableCount: 3,
      maintenanceCount: 1,
      outOfServiceCount: 1,
      byType: [
        { vehicleType: 'Moto', count: 6, percent: 60 },
        { vehicleType: 'Voiture', count: 4, percent: 40 },
      ],
      utilizationPercent: 50,
    },
    contractPerformance: {
      totalContracts: 12,
      activeContracts: 4,
      completedContracts: 6,
      terminatedContracts: 2,
      totalRevenue: 1000000,
      averageContractValue: 150000,
      collectionRate: 80,
      topContracts: [],
    },
    topVehicles: [],
    alerts: {
      totalAlerts: 2,
      criticalCount: 1,
      items: [
        { severity: 'warning', category: 'payment', title: 'Impayé', description: 'Retard' },
        { severity: 'info', category: 'insurance', title: 'Assurance', description: 'Bientôt' },
      ],
    },
    executionTimeMs: 12,
  };
}

async function installMocks(page: Page, received: string[] = []): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.toLowerCase();
    received.push(path);

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

    if (path === '/api/v2/dashboard') {
      await json({ success: true, message: '', data: dashboardSummary() });
      return;
    }

    if (path.endsWith('/api/auth/me')) {
      await json({
        id: 'e2e-user',
        username: 'e2e@logistik.test',
        email: 'e2e@logistik.test',
        firstName: 'E2E',
        lastName: 'Mobile',
        isActive: true,
        roles: ['SUPER_ADMIN'],
        permissions: PERMISSIONS,
      });
      return;
    }

    if (path.includes('/contracts/search')) {
      await json({
        success: true,
        message: '',
        data: [CONTRACT],
        totalCount: 1,
        pageNumber: 1,
        pageSize: 20,
        totalPages: 1,
      });
      return;
    }

    if (path.includes('/contracts/active') || path.includes('/contracts/expiring')) {
      await json({ success: true, message: '', data: [] });
      return;
    }

    if (path.includes('/documents/search') || path.includes('/documents/pending')) {
      await json({
        success: true,
        message: '',
        data: [],
        totalCount: 0,
        pageNumber: 1,
        pageSize: 10,
        totalPages: 0,
      });
      return;
    }

    await json({
      success: true,
      message: '',
      data: [],
      items: [],
      totalCount: 0,
      pageNumber: 1,
      pageSize: 20,
      totalPages: 0,
    });
  });
}

async function openApp(page: Page, path: string, received: string[] = []): Promise<void> {
  const token = createJwt({ id: 'e2e-user', role: 'SUPER_ADMIN', Permission: PERMISSIONS });
  await page.addInitScript((value) => {
    localStorage.setItem(
      'logistiks_auth_data',
      JSON.stringify({ token: value, role: 'SUPER_ADMIN', rememberMe: true })
    );
    localStorage.setItem('remember_me', 'true');
  }, token);

  await installMocks(page, received);
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
}

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1
  );
  expect(fits).toBe(true);
}

test.describe('Lot 6 — pages mobiles', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('contrats : tableau en cartes et filtres dans un panneau bas', async ({ page }) => {
    await openApp(page, '/dashboard/contrats/list');
    await page.keyboard.press('Escape');

    const table = page.locator('table.iam-mobile-table').first();
    await expect(table).toBeVisible();
    await expect(table.locator('tbody tr').first()).toContainText('CONT-202610-0001');

    const theadDisplay = await table
      .locator('thead')
      .evaluate((element) => getComputedStyle(element).display);
    expect(theadDisplay).toBe('none');

    const rowDisplay = await table
      .locator('tbody tr')
      .first()
      .evaluate((element) => getComputedStyle(element).display);
    expect(rowDisplay).toBe('block');

    const labelledCell = table.locator('td[data-label]').first();
    await expect(labelledCell).toHaveAttribute('data-label', /.+/);

    const trigger = page.locator('.iam-filter-trigger').first();
    await expect(trigger).toBeVisible();
    await trigger.click();

    const sheet = page.locator('.iam-filter-sheet.is-open').first();
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.round(box!.y + box!.height)).toBeGreaterThanOrEqual(840);

    await page.locator('.iam-filter-close').first().click();
    await expect(page.locator('.iam-filter-sheet.is-open')).toHaveCount(0);

    await expectNoHorizontalScroll(page);
  });

  test('documents : prise de photo, capture et aperçu avant envoi', async ({ page }) => {
    await openApp(page, '/dashboard/documents/list');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /Uploader un document/i }).first().click();

    const dialog = page.locator('.modal-dialog').first();
    await expect(dialog).toBeVisible();
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox!.width).toBeGreaterThanOrEqual(380);
    expect(dialogBox!.height).toBeGreaterThanOrEqual(820);

    const input = page.locator('.upload-dropzone input[type=file]');
    await expect(input).toHaveAttribute('accept', 'image/*,application/pdf');
    await expect(input).toHaveAttribute('capture', 'environment');

    await input.setInputFiles({
      name: 'photo.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64'
      ),
    });

    const preview = page.locator('.file-preview__image');
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute('src', /^blob:/);
    await expect(preview).toHaveAttribute('alt', /Aperçu/);

    await expectNoHorizontalScroll(page);
  });

  test('formulaire finance : une colonne et barre d’action collante', async ({ page }) => {
    await openApp(page, '/dashboard/finances/transactions/nouvelle?type=revenue');
    await page.keyboard.press('Escape');

    await expect(page.locator('form.iam-form')).toBeVisible();

    const columns = await page
      .locator('.tx-type-grid')
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns);
    expect(columns.split(' ').length).toBe(1);

    const sticky = await page
      .locator('.step-nav')
      .evaluate((element) => getComputedStyle(element).position);
    expect(sticky).toBe('sticky');

    await expectNoHorizontalScroll(page);
  });

  test('tableau de bord : données de /api/v2/dashboard, aucun écran inerte', async ({ page }) => {
    const received: string[] = [];
    await openApp(page, '/dashboard', received);
    await page.keyboard.press('Escape');

    await expect
      .poll(() => page.locator('.kpi-value').first().innerText())
      .not.toBe('0');

    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/works!/i);
    expect(body).not.toMatch(/en cours de développement/i);

    expect(received).toContain('/api/v2/dashboard');
    await expectNoHorizontalScroll(page);
  });
});
