import { Injectable } from '@angular/core';

/**
 * Adapte le DOM des pages existantes au rendu mobile, sans réécrire chaque
 * tableau : les tableaux deviennent des cartes (libellés repris des en-têtes)
 * et les actions de ligne se regroupent derrière un menu « … ».
 *
 * Le service ne déplace aucun nœud géré par Angular : il ajoute des classes,
 * des attributs data-label et un bouton déclencheur. Les vues Angular peuvent
 * donc être recréées sans conflit, et le MutationObserver réapplique le rendu
 * après chaque navigation ou re-rendu.
 */
@Injectable({ providedIn: 'root' })
export class MobileDomService {
  private started = false;
  private scheduled = false;
  private observer?: MutationObserver;

  private readonly onDocumentClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const trigger = target.closest('.iam-mobile-actions__trigger') as HTMLElement | null;
    if (trigger) {
      event.preventDefault();
      event.stopPropagation();

      const cell = trigger.closest('.iam-mobile-actions') as HTMLElement | null;
      if (!cell) {
        return;
      }

      const wasOpen = cell.classList.contains('is-open');
      this.closeMenus();

      if (!wasOpen) {
        cell.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
      return;
    }

    if (!target.closest('.iam-mobile-actions')) {
      this.closeMenus();
    }
  };

  start(): void {
    if (this.started || typeof document === 'undefined') {
      return;
    }

    this.started = true;
    this.enhance();
    this.observer = new MutationObserver(() => this.schedule());
    this.observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', this.onDocumentClick, true);
    window.addEventListener('scroll', () => this.closeMenus(), { passive: true });
  }

  private schedule(): void {
    if (this.scheduled) {
      return;
    }

    this.scheduled = true;
    window.requestAnimationFrame(() => {
      this.scheduled = false;
      this.enhance();
    });
  }

  private enhance(): void {
    const tables = document.querySelectorAll<HTMLTableElement>('table.data-table');
    tables.forEach((table) => this.enhanceTable(table));
  }

  private enhanceTable(table: HTMLTableElement): void {
    table.classList.add('iam-mobile-table');

    const headerRow = table.querySelector<HTMLTableRowElement>('thead tr:last-child');
    const headers = headerRow
      ? Array.from(headerRow.querySelectorAll('th')).map((th) =>
          (th.textContent || '').replace(/\s+/g, ' ').trim()
        )
      : [];

    Array.from(table.tBodies).forEach((body) => {
      Array.from(body.rows).forEach((row) => {
        const cells = Array.from(row.children).filter(
          (child): child is HTMLTableCellElement => child.tagName === 'TD'
        );

        if (cells.length === 1 && cells[0].hasAttribute('colspan')) {
          cells[0].classList.add('iam-mobile-empty');
          return;
        }

        cells.forEach((cell, index) => {
          const label = headers[index] || '';
          cell.setAttribute('data-label', label);
          cell.classList.add('iam-mobile-cell');
        });

        const last = cells[cells.length - 1];
        if (!last) {
          return;
        }

        const existingTrigger = last.querySelector(
          '.btn-actions-trigger, .iam-mobile-actions__trigger, .bx-dots-vertical-rounded'
        );
        if (existingTrigger) {
          return;
        }

        const controls = Array.from(
          last.querySelectorAll<HTMLElement>('button, a.btn, .btn, .action-btn, .icon-btn')
        ).filter((control) => !control.hasAttribute('disabled'));

        if (controls.length < 2) {
          return;
        }

        last.classList.add('iam-mobile-actions');
        if (!last.querySelector('.iam-mobile-actions__trigger')) {
          const trigger = document.createElement('button');
          trigger.type = 'button';
          trigger.className = 'iam-mobile-actions__trigger';
          trigger.setAttribute('aria-label', 'Actions de la ligne');
          trigger.setAttribute('aria-expanded', 'false');
          trigger.innerHTML = '<i class="bx bx-dots-horizontal-rounded" aria-hidden="true"></i>';
          last.appendChild(trigger);
        }
      });
    });
  }

  private closeMenus(): void {
    document.querySelectorAll('.iam-mobile-actions.is-open').forEach((cell) => {
      cell.classList.remove('is-open');
      const trigger = cell.querySelector('.iam-mobile-actions__trigger');
      trigger?.setAttribute('aria-expanded', 'false');
    });
  }
}
