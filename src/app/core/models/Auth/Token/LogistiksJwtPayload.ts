export interface LogistiksJwtPayload {
  unique_name: string;
  role: string | string[];
  exp: number;
  userId: string;
  email?: string;
}
