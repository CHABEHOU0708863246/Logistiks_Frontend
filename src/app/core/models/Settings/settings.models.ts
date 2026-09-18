/**
 * Modèles du paramétrage global (MODULE 16).
 */

/** Paramètre système tel que renvoyé par l'API. */
export interface SystemSetting {
  category: string;
  key: string;
  value: string;
  /** String | Integer | Decimal | Boolean | DateTime | Json */
  dataType: string;
  description?: string | null;
  updatedAt?: string | null;
  updatedBy?: string;
}

/** Mise à jour d'un paramètre (corps du PUT par lot). */
export interface SettingsUpdateRequest {
  category: string;
  key: string;
  value: string;
}

/** Type de saisie déduit du DataType backend. */
export type SettingInputType = 'text' | 'number' | 'boolean';

/** Paramètre préparé pour l'affichage (libellé, saisie, formatage). */
export interface SettingField {
  key: string;
  label: string;
  value: string;
  boolValue: boolean;
  dataType: string;
  description: string;
  inputType: SettingInputType;
  /** Champ monétaire : suffixe FCFA et séparateurs de milliers. */
  isMoney: boolean;
}
