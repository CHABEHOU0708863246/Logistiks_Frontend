import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { createTestJwt } from '../../testing/jwt-test-helper';
import { TokenRefreshService } from './token-refresh.service';
import { Token } from './token';

describe('TokenRefreshService', () => {
  let service: TokenRefreshService;
  let tokenService: Token;
  let httpMock: HttpTestingController;
  const refreshUrl = `${environment.apiUrl}/api/Auth/refresh-token`;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [],
    });

    service = TestBed.inject(TokenRefreshService);
    tokenService = TestBed.inject(Token);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('ne déclenche qu’un seul refresh pour 10 appels concurrents', () => {
    const expiredToken = createTestJwt({ id: 'user-1', Permission: ['Vehicle_Read'] }, -10);
    tokenService.saveSession(expiredToken, 'refresh-old', false, 'MANAGER');

    const results: unknown[] = [];
    forkJoin(Array.from({ length: 10 }, () => service.refresh())).subscribe((responses) => {
      results.push(...responses);
    });

    const request = httpMock.expectOne(refreshUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      token: expiredToken,
      refreshToken: 'refresh-old',
    });

    const renewedToken = createTestJwt({ id: 'user-1', Permission: ['Vehicle_Read'] });
    request.flush({ token: renewedToken, refreshToken: 'refresh-new' });

    expect(results.length).toBe(10);
    expect(tokenService.getToken()).toBe(renewedToken);
    expect(tokenService.getRefreshToken()).toBe('refresh-new');
  });

  it('enchaîne 10 rafraîchissements successifs sans blocage', async () => {
    tokenService.saveSession(
      createTestJwt({ id: 'user-2', Permission: ['Dashboard_View'] }, -10),
      'refresh-0',
      true,
      'MANAGER'
    );

    for (let index = 0; index < 10; index++) {
      const pending = firstValueFrom(service.refresh());
      const request = httpMock.expectOne(refreshUrl);
      const renewedToken = createTestJwt({
        id: 'user-2',
        Permission: ['Dashboard_View'],
      });

      request.flush({ token: renewedToken, refreshToken: `refresh-${index + 1}` });

      const response = await pending;
      expect(response.token).toBe(renewedToken);
      expect(tokenService.getRefreshToken()).toBe(`refresh-${index + 1}`);
    }
  });
});
