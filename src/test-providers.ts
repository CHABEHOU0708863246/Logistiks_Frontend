import { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

/**
 * Providers communs à TOUS les tests (`@angular/build:unit-test` → providersFile).
 *
 * Sans eux, la majorité des specs de composants échouaient sur
 * `NG0201: No provider found for ActivatedRoute` (RouterLink, navigation) ou
 * HttpClient dès qu'un composant injectait un service.
 *
 * Les specs peuvent toujours surcharger localement dans leur propre
 * `TestBed.configureTestingModule`.
 */
const testProviders: (Provider | EnvironmentProviders)[] = [
  // Route joker vide : évite « NG04002: Cannot match any routes » quand un
  // composant redirige (ex. /auth/login après détection d'un token absent).
  provideRouter([{ path: '**', children: [] }]),
  provideHttpClient(),
  provideHttpClientTesting(),
  provideNoopAnimations(),
];

export default testProviders;
