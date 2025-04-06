export enum UserRole {
  ADMIN = "admin",
  OPERATOR = "operator",
}

export interface User {
  id: string;
  username: string;
  password?: string; // Not returned in responses
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}
