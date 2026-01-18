import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Token } from '../services/Token/token';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private tokenService: Token) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Récupère le jeton d'authentification depuis le service
    const token = this.tokenService.getToken();

    let clonedRequest = request;

    // Si un jeton est disponible, clone la requête et ajoute l'en-tête Authorization
    if (token) {
      clonedRequest = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    // Passe la requête (modifiée ou non) au prochain gestionnaire
    return next.handle(clonedRequest); // CORRECTION: utiliser clonedRequest
  }
}
