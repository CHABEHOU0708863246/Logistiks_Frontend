import { UserPreferences } from "./UserPreferences";

export interface UserProfile {
  id: string;
  userId: string;
  address?: string;
  city?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
  preferences?: UserPreferences;
  gender?: string;
  maritalStatus?: string;
  dateOfBirth?: Date;
  nationalId?: string;
  postalCode?: string;
  numberOfChildren?: number;
  createdAt: Date;
  updatedAt?: Date;
}
