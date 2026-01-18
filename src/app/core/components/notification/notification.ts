import { Component } from '@angular/core';
import { AppNotification } from '../../services/Notification/notification';
import { Notification as NotificationService } from '../../services/Notification/notification';

@Component({
  selector: 'app-notification',
  imports: [],
  templateUrl: './notification.html',
  styleUrl: './notification.scss',
})
export class Notification {
notifications: AppNotification[] = [];

  constructor(private notificationService: NotificationService) {
    this.notificationService.notifications$.subscribe(
      notifications => this.notifications = notifications
    );
  }

  remove(id: number): void {
    this.notificationService.remove(id);
  }
}
