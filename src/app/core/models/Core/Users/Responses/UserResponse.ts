import { User } from "../Entities/User";
import { UserPreferences } from "../Entities/UserPreferences";
import { UserProfile } from "../Entities/UserProfile";

export interface UserResponse {
  succeeded: boolean;
  message?: string;
  errors: string[];
  user?: User;
  profile?: UserProfile;
  preferences?: UserPreferences;
}
