import { Component } from '@angular/core';

@Component({
  selector: 'app-layout-component',
  imports: [],
  templateUrl: './layout-component.html',
  styleUrl: './layout-component.scss',
})
export class LayoutComponent {
  sidebarOpen = false;

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    // Bloque le scroll du body quand la sidebar est ouverte sur mobile
    document.body.style.overflow = this.sidebarOpen ? 'hidden' : '';
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
    document.body.style.overflow = '';
  }
}
