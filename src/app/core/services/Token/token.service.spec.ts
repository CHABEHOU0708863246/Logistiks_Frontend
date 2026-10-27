import { TestBed } from '@angular/core/testing';
import { createTestJwt } from '../../testing/jwt-test-helper';
import { Token } from './token';

describe('Token', () => {
  let service: Token;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [],
    });

    service = TestBed.inject(Token);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('persiste la session dans localStorage quand « Se souvenir de moi » est actif', () => {
    const token = createTestJwt({ id: 'user-1', role: 'MANAGER' });
    service.saveSession(token, 'refresh-token', true, 'MANAGER');

    expect(service.getToken()).toBe(token);
    expect(service.getRefreshToken()).toBe('refresh-token');
    expect(service.getRememberMe()).toBe(true);
    expect(localStorage.getItem('logistiks_auth_data')).not.toBeNull();
    expect(sessionStorage.getItem('logistiks_auth_data')).toBeNull();
  });

  it('limite la session à sessionStorage sans « Se souvenir de moi »', () => {
    const token = createTestJwt({ id: 'user-2', role: 'DRIVER' });
    service.saveSession(token, 'refresh-token', false, 'DRIVER');

    expect(service.getToken()).toBe(token);
    expect(service.getRememberMe()).toBe(false);
    expect(localStorage.getItem('logistiks_auth_data')).toBeNull();
    expect(sessionStorage.getItem('logistiks_auth_data')).not.toBeNull();
  });

  it('conserve le stockage lors du renouvellement des jetons', () => {
    const token = createTestJwt({ id: 'user-3', role: 'FINANCE' }, -10);
    service.saveSession(token, 'old-refresh', false, 'FINANCE');

    const renewedToken = createTestJwt({ id: 'user-3', role: 'FINANCE' });
    service.updateTokens(renewedToken, 'new-refresh');

    expect(service.getToken()).toBe(renewedToken);
    expect(service.getRefreshToken()).toBe('new-refresh');
    expect(localStorage.getItem('logistiks_auth_data')).toBeNull();
    expect(sessionStorage.getItem('logistiks_auth_data')).not.toBeNull();
  });

  it('reconnaît une session expirée mais rafraîchissable', () => {
    const expiredToken = createTestJwt({ id: 'user-4', role: 'MANAGER' }, -10);
    service.saveSession(expiredToken, 'refresh-token', true, 'MANAGER');

    expect(service.hasValidAccessToken()).toBe(false);
    expect(service.hasRefreshToken()).toBe(true);
    expect(service.hasSession()).toBe(true);
  });

  it('efface les deux stockages à la déconnexion', () => {
    service.saveSession(createTestJwt({ id: 'user-5' }), 'refresh-token', true, 'MANAGER');
    service.clearSession();

    expect(service.getToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(localStorage.getItem('logistiks_auth_data')).toBeNull();
    expect(sessionStorage.getItem('logistiks_auth_data')).toBeNull();
  });
});
