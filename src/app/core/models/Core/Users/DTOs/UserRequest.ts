export interface UserRequest {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  photoUrl: string;
  password?: string;
  confirmPassword?: string;
  roles: string[];
  isActive: boolean;
  photoFile?: File;
}
