export interface User {
  id: string;
  username: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  photoUrl: string;
  isActive: boolean;
  roles: string[];
  permissions: string[];
  lastLogin?: Date;
  createdAt: Date;
  updatedAt?: Date;
  createdBy: string;
}
