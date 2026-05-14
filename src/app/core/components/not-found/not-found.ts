import { CommonModule, DecimalPipe, DatePipe, SlicePipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NotificationComponent } from '../notification-component/notification-component';
import { SidebarComponent } from '../sidebar-component/sidebar-component';

@Component({
  selector: 'app-not-found',
    imports: [
    CommonModule,
    RouterModule
  ],
  standalone: true,
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {

  goBack(): void {
  window.history.back();
}

}
