import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { NotificationService } from '../services/Notification/notification-service';

const OFFLINE_MESSAGE = 'Cette action nécessite une connexion Internet. Réessayez une fois reconnecté.';
const OFFLINE_TITLE = 'Hors connexion';

export const offlineInterceptor: HttpInterceptorFn = (request, next) => {
  const isWrite = request.method !== 'GET' && request.method !== 'HEAD';
  const isLogout = request.url.includes('/api/Auth/logout');

  if (isWrite && !isLogout && typeof navigator !== 'undefined' && !navigator.onLine) {
    inject(NotificationService).warning(OFFLINE_TITLE, OFFLINE_MESSAGE);
    return throwError(() => new HttpErrorResponse({
      status: 0,
      statusText: 'Offline',
      url: request.url,
      error: { message: OFFLINE_MESSAGE }
    }));
  }

  return next(request);
};
