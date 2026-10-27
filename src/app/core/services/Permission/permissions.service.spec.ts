import { TestBed } from '@angular/core/testing';
import { createTestJwt } from '../../testing/jwt-test-helper';
import { Token } from '../Token/token';
import { Permissions } from './permissions.service';

describe('Permissions', () => {
  let service: Permissions;
  let tokenService: Token;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [],
    });

    tokenService = TestBed.inject(Token);
    service = TestBed.inject(Permissions);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('lit la revendication Permission (majuscule) du JWT', () => {
    const token = createTestJwt({
      id: 'user-1',
      role: 'MANAGER',
      Permission: ['Vehicle_Read', 'Dashboard_View'],
    });
    tokenService.saveSession(token, 'refresh', false, 'MANAGER');

    expect(service.hasPermission('Vehicle_Read')).toBe(true);
    expect(service.hasPermission('Dashboard_View')).toBe(true);
    expect(service.hasPermission('Customer_Read')).toBe(false);
    expect(service.getUserPermissions()).toEqual(['Vehicle_Read', 'Dashboard_View']);
  });

  it('accepte une revendication Permission unique (chaîne)', () => {
    const token = createTestJwt({
      id: 'user-2',
      role: 'FINANCE',
      Permission: 'Payment_Read',
    });
    tokenService.saveSession(token, 'refresh', false, 'FINANCE');

    expect(service.hasPermission('Payment_Read')).toBe(true);
    expect(service.hasAnyPermission('Payment_Read', 'Vehicle_Read')).toBe(true);
  });

  it('recharge les permissions quand le token change (refresh)', () => {
    tokenService.saveSession(
      createTestJwt({ id: 'user-3', role: 'DRIVER', Permission: ['Vehicle_Read'] }),
      'refresh-1',
      false,
      'DRIVER'
    );
    expect(service.hasPermission('Vehicle_Read')).toBe(true);

    tokenService.saveSession(
      createTestJwt({ id: 'user-3', role: 'DRIVER', Permission: ['Document_Read'] }),
      'refresh-2',
      false,
      'DRIVER'
    );

    expect(service.hasPermission('Document_Read')).toBe(true);
    expect(service.hasPermission('Vehicle_Read')).toBe(false);
  });

  it('n’accorde aucune permission par rôle sans revendication explicite', () => {
    tokenService.saveSession(
      createTestJwt({ id: 'user-4', role: 'MANAGER' }),
      'refresh',
      false,
      'MANAGER'
    );

    expect(service.hasPermission('Customer_Read')).toBe(false);
    expect(service.hasPermission('Vehicle_Read')).toBe(false);
  });

  it('applique le bypass SUPER_ADMIN comme le backend', () => {
    tokenService.saveSession(
      createTestJwt({ id: 'user-5', role: 'SUPER_ADMIN' }),
      'refresh',
      false,
      'SUPER_ADMIN'
    );

    expect(service.hasPermission('Customer_Read')).toBe(true);
    expect(service.hasAllPermissions('Customer_Read', 'Vehicle_Read')).toBe(true);
  });
});
