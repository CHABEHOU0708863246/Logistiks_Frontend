export interface UserPreferences {
  language: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  notificationSettings: any;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  dashboardLayout: string;
  dashboardWidgets: string[];
  theme: string;
  accentColor: string;
  itemsPerPage: number;
  defaultView: string;
  autoSave: boolean;
  autoLogoutMinutes: number;
}
