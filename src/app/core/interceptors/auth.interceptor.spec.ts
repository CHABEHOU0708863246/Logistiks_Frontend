import {
  HttpClient,
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { createTestJwt } from '../testing/jwt-test-helper';
import { Token } from '../services/Token/token';
import { AuthInterceptor } from './auth.interceptor';

describe('AuthInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokenService: Token;
  let router: Router;
  const refreshUrl = `${environment.apiUrl}/api/Auth/refresh-token`;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthInterceptor,
          multi: true,
        },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    tokenService = TestBed.inject(Token);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('rafraîchit un jeton expiré et rejoue la requête de façon transparente', async () => {
    const expiredToken = createTestJwt({ id: 'user-1', Permission: ['Vehicle_Read'] }, -10);
    tokenService.saveSession(expiredToken, 'refresh-old', false, 'MANAGER');

    const resultPromise = firstValueFrom(http.get<{ ok: boolean }>('/api/protected'));

    const initial = httpMock.expectOne('/api/protected');
    expect(initial.request.headers.get('Authorization')).toBe(`Bearer ${expiredToken}`);
    initial.flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    const refresh = httpMock.expectOne(refreshUrl);
    const renewedToken = createTestJwt({ id: 'user-1', Permission: ['Vehicle_Read'] });
    refresh.flush({ token: renewedToken, refreshToken: 'refresh-new' });

    const replay = httpMock.expectOne('/api/protected');
    expect(replay.request.headers.get('Authorization')).toBe(`Bearer ${renewedToken}`);
    replay.flush({ ok: true });

    await expect(resultPromise).resolves.toEqual({ ok: true });
    expect(tokenService.getToken()).toBe(renewedToken);
  });

  it('ne déclenche qu’un seul refresh pour 10 requêtes 401 simultanées', async () => {
    const expiredToken = createTestJwt({ id: 'user-2', Permission: ['Dashboard_View'] }, -10);
    tokenService.saveSession(expiredToken, 'refresh-old', true, 'MANAGER');

    const results = Array.from({ length: 10 }, () =>
      firstValueFrom(http.get<{ ok: boolean }>('/api/protected'))
    );

    const initial = httpMock.match('/api/protected');
    expect(initial.length).toBe(10);
    initial.forEach((request) => {
      expect(request.request.headers.get('Authorization')).toBe(`Bearer ${expiredToken}`);
      request.flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });
    });

    const refresh = httpMock.expectOne(refreshUrl);
    const renewedToken = createTestJwt({ id: 'user-2', Permission: ['Dashboard_View'] });
    refresh.flush({ token: renewedToken, refreshToken: 'refresh-new' });

    const replay = httpMock.match('/api/protected');
    expect(replay.length).toBe(10);
    replay.forEach((request) => {
      expect(request.request.headers.get('Authorization')).toBe(`Bearer ${renewedToken}`);
      request.flush({ ok: true });
    });

    await expect(Promise.all(results)).resolves.toEqual(
      Array.from({ length: 10 }, () => ({ ok: true }))
    );
  });

  it('ne déconnecte pas si la requête rejouée échoue hors 401', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const expiredToken = createTestJwt({ id: 'user-4', Permission: ['Vehicle_Read'] }, -10);
    tokenService.saveSession(expiredToken, 'refresh-old', true, 'MANAGER');

    const resultPromise = firstValueFrom(http.get('/api/protected'));

    const initial = httpMock.expectOne('/api/protected');
    initial.flush({}, { status: 401, statusText: 'Unauthorized' });

    const refresh = httpMock.expectOne(refreshUrl);
    const renewedToken = createTestJwt({ id: 'user-4', Permission: ['Vehicle_Read'] });
    refresh.flush({ token: renewedToken, refreshToken: 'refresh-new' });

    const replay = httpMock.expectOne('/api/protected');
    replay.flush({ message: 'server error' }, { status: 500, statusText: 'Internal Server Error' });

    await expect(resultPromise).rejects.toBeTruthy();
    expect(tokenService.getToken()).toBe(renewedToken);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('déconnecte sur 401 quand aucun refresh token n’est disponible', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const token = createTestJwt({ id: 'user-5', Permission: ['Vehicle_Read'] });
    tokenService.saveSession(token, null, true, 'MANAGER');

    const resultPromise = firstValueFrom(http.get('/api/protected'));

    const initial = httpMock.expectOne('/api/protected');
    initial.flush({}, { status: 401, statusText: 'Unauthorized' });

    await expect(resultPromise).rejects.toBeTruthy();
    expect(tokenService.getToken()).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(
      ['/auth/login'],
      expect.objectContaining({ queryParams: { sessionExpired: '1' } })
    );
  });

  it('déconnecte proprement si le refresh échoue', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const expiredToken = createTestJwt({ id: 'user-3', Permission: ['Vehicle_Read'] }, -10);
    tokenService.saveSession(expiredToken, 'refresh-old', true, 'MANAGER');

    const resultPromise = firstValueFrom(http.get('/api/protected'));

    const initial = httpMock.expectOne('/api/protected');
    initial.flush({}, { status: 401, statusText: 'Unauthorized' });

    const refresh = httpMock.expectOne(refreshUrl);
    refresh.flush({ message: 'invalid refresh' }, { status: 401, statusText: 'Unauthorized' });

    await expect(resultPromise).rejects.toBeTruthy();

    expect(tokenService.getToken()).toBeNull();
    expect(tokenService.getRefreshToken()).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(
      ['/auth/login'],
      expect.objectContaining({
        queryParams: { sessionExpired: '1' },
        replaceUrl: true,
      })
    );
  });
});
