import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConnectivityService {
  private readonly onlineSubject = new BehaviorSubject<boolean>(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  readonly isOnline$: Observable<boolean> = this.onlineSubject.asObservable();

  private readonly handleOnline = (): void => this.onlineSubject.next(true);
  private readonly handleOffline = (): void => this.onlineSubject.next(false);

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  get isOnline(): boolean {
    return this.onlineSubject.value;
  }
}
