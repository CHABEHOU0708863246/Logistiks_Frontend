import { CommonModule } from '@angular/common';
import { Component, HostListener, Input } from '@angular/core';

/**
 * Enveloppe les filtres d'une page. Sur ordinateur le contenu est affiché
 * exactement comme avant (display: contents), sur mobile il est déplacé dans
 * un panneau qui monte du bas, ouvert par un bouton « Filtres ».
 */
@Component({
  selector: 'app-mobile-filter-sheet',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      class="iam-filter-trigger"
      aria-haspopup="dialog"
      [attr.aria-expanded]="isOpen"
      (click)="open()"
    >
      <i class="bx bx-filter-alt" aria-hidden="true"></i>
      <span>{{ title }}</span>
      @if (activeCount > 0) {
        <span class="iam-filter-trigger__count">{{ activeCount }}</span>
      }
      <i class="bx bx-chevron-up" aria-hidden="true"></i>
    </button>

    @if (isOpen) {
      <div class="iam-filter-backdrop" (click)="close()"></div>
    }

    <section
      class="iam-filter-sheet"
      [class.is-open]="isOpen"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="title"
      [attr.aria-hidden]="!isOpen"
    >
      <header class="iam-filter-header">
        <span class="iam-filter-header__title">
          <i class="bx bx-filter-alt" aria-hidden="true"></i>
          {{ title }}
        </span>
        <button type="button" class="iam-filter-close" aria-label="Fermer les filtres" (click)="close()">
          <i class="bx bx-x" aria-hidden="true"></i>
        </button>
      </header>

      <div class="iam-filter-body">
        <ng-content></ng-content>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .iam-filter-trigger,
      .iam-filter-backdrop,
      .iam-filter-header {
        display: none;
      }

      .iam-filter-sheet {
        display: contents;
      }

      @media (max-width: 900px) {
        .iam-filter-trigger {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          min-height: 48px;
          margin: 0 0 12px;
          padding: 10px 14px;
          border: 1px solid #e0e2ef;
          border-radius: 14px;
          background: #ffffff;
          color: #3c3489;
          font-family: 'Public Sans', sans-serif;
          font-size: 15px;
          font-weight: 700;
          box-shadow: 0 2px 10px rgba(15, 13, 43, 0.06);
        }

        .iam-filter-trigger > .bx:first-child {
          font-size: 20px;
        }

        .iam-filter-trigger > .bx:last-child {
          margin-left: auto;
          font-size: 20px;
        }

        .iam-filter-trigger__count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          border-radius: 11px;
          background: #696cff;
          color: #ffffff;
          font-size: 12px;
        }

        .iam-filter-backdrop {
          display: block;
          position: fixed;
          inset: 0;
          z-index: 1199;
          background: rgba(15, 13, 43, 0.45);
        }

        .iam-filter-sheet {
          display: flex;
          flex-direction: column;
          position: fixed;
          right: 0;
          bottom: 0;
          left: 0;
          z-index: 1200;
          max-height: 88dvh;
          padding-bottom: env(safe-area-inset-bottom, 0px);
          background: #ffffff;
          border-radius: 22px 22px 0 0;
          box-shadow: 0 -16px 44px rgba(15, 13, 43, 0.24);
          transform: translateY(105%);
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .iam-filter-sheet.is-open {
          transform: translateY(0);
        }

        .iam-filter-header {
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 18px 12px;
          border-bottom: 1px solid #eef0f6;
        }

        .iam-filter-header__title {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #111827;
          font-size: 17px;
          font-weight: 800;
        }

        .iam-filter-close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border: 0;
          border-radius: 12px;
          background: #f3f4f6;
          color: #4b5563;
          font-size: 24px;
        }

        .iam-filter-body {
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: 14px 16px 24px;
        }
      }
    `,
  ],
})
export class MobileFilterSheetComponent {
  @Input() title = 'Filtres';
  @Input() activeCount = 0;

  isOpen = false;

  open(): void {
    this.isOpen = true;
    document.body.classList.add('iam-sheet-open');
  }

  close(): void {
    this.isOpen = false;
    document.body.classList.remove('iam-sheet-open');
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}
