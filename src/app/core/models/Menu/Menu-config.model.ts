export interface MenuPermissionConfig {
  menuItems: MenuItemConfig[];
}

export interface MenuItemConfig {
  route: string;
  label: string;
  icon: string;
  requiredPermissions: string[];
  requiredRoles: string[];
  subItems: MenuItemConfig[];
  isVisible: boolean;
  badgeValue?: string;
  badgeClass?: string;
}

// Interface pour la réponse de l'API
export interface MenuResponse {
  success: boolean;
  menu: MenuItemConfig[];
  message?: string;
}
