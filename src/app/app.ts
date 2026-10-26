import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MobileBottomNavComponent } from './core/components/mobile-bottom-nav/mobile-bottom-nav';
import { MobileHeaderComponent } from './core/components/mobile-header/mobile-header';
import { PwaStatusComponent } from './core/components/pwa-status/pwa-status';
import { MobileDomService } from './core/services/MobileDom/mobile-dom.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PwaStatusComponent, MobileHeaderComponent, MobileBottomNavComponent],
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('Logistiks_Frontend');

  constructor(private readonly mobileDom: MobileDomService) {}

  ngOnInit(): void {
    this.mobileDom.start();
  }
}
