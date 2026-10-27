import { HttpBackend, HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { filter, finalize, map, shareReplay } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { LoginResponse } from '../../models/Auth/Login/LoginResponse';
import { Token } from './token';

/**
 * Rafraîchit le couple access/refresh token.
 *
 * `HttpBackend` est utilisé volontairement : la requête de refresh ne doit pas
 * repasser par AuthInterceptor (boucle 401) ni par l'intercepteur offline.
 * Un seul refresh est en vol à la fois : tous les appelants concurrents
 * partagent la même Observable.
 */
@Injectable({
  providedIn: 'root',
})
export class TokenRefreshService {
  private refreshInFlight$: Observable<LoginResponse> | null = null;

  constructor(
    private readonly backend: HttpBackend,
    private readonly tokenService: Token
  ) {}

  refresh(): Observable<LoginResponse> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const token = this.tokenService.getToken();
    const refreshToken = this.tokenService.getRefreshToken();

    if (!token || !refreshToken) {
      return throwError(() => new Error('Session expirée : aucun jeton de rafraîchissement disponible.'));
    }

    const request = new HttpRequest<{ token: string; refreshToken: string }>(
      'POST',
      `${environment.apiUrl}/api/Auth/refresh-token`,
      { token, refreshToken },
      { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) }
    );

    const shared$ = this.backend.handle(request).pipe(
      filter((event): event is HttpResponse<any> => event instanceof HttpResponse),
      map((event) => {
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body ?? {};
        const nextToken = body.token ?? body.accessToken ?? body.data?.token;
        const nextRefreshToken =
          body.refreshToken ?? body.data?.refreshToken ?? refreshToken;

        if (!nextToken) {
          throw new Error('Réponse de rafraîchissement invalide : nouveau jeton absent.');
        }

        this.tokenService.updateTokens(nextToken, nextRefreshToken);

        return {
          token: nextToken,
          refreshToken: nextRefreshToken,
          success: true,
          errorMessage: '',
        } as LoginResponse;
      }),
      finalize(() => {
        this.refreshInFlight$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.refreshInFlight$ = shared$;
    return shared$;
  }
}
