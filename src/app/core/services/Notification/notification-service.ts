import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AppNotification {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications = new BehaviorSubject<AppNotification[]>([]);
  public notifications$: Observable<AppNotification[]> = this.notifications.asObservable();
  private notificationId = 0;

  /**
   * Afficher une notification de succès
   */
  success(title: string, message: string, duration: number = 4000): void {
    this.show({
      type: 'success',
      title,
      message,
      duration,
      icon: '✓'
    });
  }

  /**
   * Afficher une notification d'erreur
   */
  error(title: string, message: string, duration: number = 5000): void {
    this.show({
      type: 'error',
      title,
      message,
      duration,
      icon: '✕'
    });
  }

  /**
   * Afficher une notification d'avertissement
   */
  warning(title: string, message: string, duration: number = 4000): void {
    this.show({
      type: 'warning',
      title,
      message,
      duration,
      icon: '⚠'
    });
  }

  /**
   * Afficher une notification d'information
   */
  info(title: string, message: string, duration: number = 4000): void {
    this.show({
      type: 'info',
      title,
      message,
      duration,
      icon: 'ℹ'
    });
  }

  /**
   * Afficher une notification personnalisée
   */
  private show(notification: Omit<AppNotification, 'id'>): void {
    const id = ++this.notificationId;
    const newNotification: AppNotification = {
      ...notification,
      id
    };

    const currentNotifications = this.notifications.value;
    this.notifications.next([...currentNotifications, newNotification]);

    // Auto-suppression après la durée définie
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, notification.duration);
    }
  }

  /**
   * Supprimer une notification
   */
  remove(id: number): void {
    const currentNotifications = this.notifications.value;
    this.notifications.next(
      currentNotifications.filter(notification => notification.id !== id)
    );
  }

  /**
   * Supprimer toutes les notifications
   */
  clear(): void {
    this.notifications.next([]);
  }
}
