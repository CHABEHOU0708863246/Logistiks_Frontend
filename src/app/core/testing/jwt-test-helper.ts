function base64Url(value: object): string {
  return btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Construit un JWT non signé pour les tests (le front ne vérifie pas la signature).
 */
export function createTestJwt(
  payload: Record<string, unknown>,
  lifetimeSeconds: number = 3600
): string {
  const exp = Math.floor(Date.now() / 1000) + lifetimeSeconds;
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url({ ...payload, exp })}.signature`;
}
