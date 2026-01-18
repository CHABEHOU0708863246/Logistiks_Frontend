/**
 * Pour gérer l'affichage dynamique des champs dans les formulaires Angular
 */
export interface UserEditableFields {
  canEditPersonalInfo: boolean;
  canEditProfessionalInfo: boolean;
  canEditRoles: boolean;
  canEditPermissions: boolean;
  canEditStatus: boolean;
  canEditPhoto: boolean;
}
