import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { Token } from '../services/Token/token';
import { TokenRefreshService } from '../services/Token/token-refresh.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private static readonly REFRESH_EXCLUDED_PATHS = [
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/refresh-token',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/validate-reset-token',
  ];

  constructor(
    private readonly tokenService: Token,
    private readonly tokenRefreshService: TokenRefreshService
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const tokenAtRequest = this.tokenService.getToken();
    const authenticatedRequest = this.withToken(request, tokenAtRequest);

    return next.handle(authenticatedRequest).pipe(
      catchError((error: unknown) => {
        if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
          return throwError(() => error);
        }

        if (this.isAuthEndpoint(request)) {
          return throwError(() => error);
        }

        if (!this.canRefresh(request)) {
          if (this.tokenService.getToken()) {
            this.tokenService.handleTokenExpired();
          }

          return throwError(() => error);
        }

        const currentToken = this.tokenService.getToken();

        // Un autre appel concurrent a déjà rafraîchi le jeton pendant que
        // celui-ci était en vol : on rejoue directement avec le nouveau jeton.
        if (tokenAtRequest && currentToken && currentToken !== tokenAtRequest) {
          return this.retryWithCurrentToken(request, next);
        }

        return this.tokenRefreshService.refresh().pipe(
          catchError((refreshError: unknown) => {
            this.tokenService.handleTokenExpired();
            return throwError(() => refreshError);
          }),
          switchMap(() => this.retryWithCurrentToken(request, next))
        );
      })
    );
  }

  private retryWithCurrentToken(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(this.withToken(request, this.tokenService.getToken())).pipe(
      catchError((retryError: unknown) => {
        if (retryError instanceof HttpErrorResponse && retryError.status === 401) {
          this.tokenService.handleTokenExpired();
        }

        return throwError(() => retryError);
      })
    );
  }

  private withToken(request: HttpRequest<any>, token: string | null): HttpRequest<any> {
    if (!token) {
      return request;
    }

    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  private isAuthEndpoint(request: HttpRequest<any>): boolean {
    const url = request.url.toLowerCase();
    return AuthInterceptor.REFRESH_EXCLUDED_PATHS.some((path) => url.includes(path));
  }

  private canRefresh(request: HttpRequest<any>): boolean {
    return (
      !!this.tokenService.getToken() &&
      this.tokenService.hasRefreshToken() &&
      !this.isAuthEndpoint(request)
    );
  }
}
