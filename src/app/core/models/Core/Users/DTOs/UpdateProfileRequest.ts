export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  photoUrl?: string;
  gender?: string;
  maritalStatus?: string;
  dateOfBirth?: Date;
  nationalId?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  numberOfChildren?: number;
  notes?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
  photoFile?: File;
}
