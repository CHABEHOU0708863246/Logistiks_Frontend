export interface LogistiksJwtPayload {
  unique_name?: string;
  role?: string | string[];
  roles?: string | string[];
  exp: number;
  userId?: string;
  id?: string;
  email?: string;
  /**
   * Revendication émise par le backend : une ou plusieurs valeurs "Permission".
   * Le JWT sérialise plusieurs revendications du même type en tableau.
   */
  Permission?: string | string[];
  permissions?: string | string[];
  permission?: string | string[];
}
