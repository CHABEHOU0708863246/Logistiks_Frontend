import { Component } from '@angular/core';
import { AppNotification, NotificationService } from '../../services/Notification/notification-service';

@Component({
  selector: 'app-notification-component',
  imports: [],
  templateUrl: './notification-component.html',
  styleUrl: './notification-component.scss',
})
export class NotificationComponent {
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
