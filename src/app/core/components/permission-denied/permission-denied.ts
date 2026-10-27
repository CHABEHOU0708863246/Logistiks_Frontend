import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-permission-denied',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="denied-page">
      <section class="denied-card">
        <div class="denied-icon"><i class="bx bx-lock-alt"></i></div>
        <h1>Accès refusé</h1>
        <p>Vous n'avez pas les permissions nécessaires pour ouvrir cette page.</p>
        <a class="denied-action" routerLink="/dashboard">Retour au tableau de bord</a>
      </section>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: #f5f5f9;
      }

      .denied-page {
        display: grid;
        place-items: center;
        min-height: 100vh;
        padding: 24px;
        font-family: 'Public Sans', sans-serif;
      }

      .denied-card {
        width: 100%;
        max-width: 440px;
        padding: 32px 24px;
        text-align: center;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 18px;
        box-shadow: 0 16px 40px rgba(15, 13, 43, 0.08);
      }

      .denied-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 64px;
        height: 64px;
        margin-bottom: 16px;
        border-radius: 18px;
        background: rgba(105, 108, 255, 0.12);
        color: #696cff;
        font-size: 30px;
      }

      h1 {
        margin: 0 0 8px;
        color: #111827;
        font-size: 22px;
      }

      p {
        margin: 0 0 24px;
        color: #6b7280;
        font-size: 14px;
        line-height: 1.5;
      }

      .denied-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 10px 18px;
        border-radius: 10px;
        background: #696cff;
        color: #ffffff;
        font-size: 14px;
        font-weight: 700;
        text-decoration: none;
      }

      .denied-action:focus-visible {
        outline: 2px solid #696cff;
        outline-offset: 2px;
      }
    `,
  ],
})
export class PermissionDenied {}
