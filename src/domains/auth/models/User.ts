export interface User {
  id: string;
  email: string;
  name: string;
  password?: string; // Not returned in responses
  role: "admin" | "user";
  createdAt: Date;
  updatedAt: Date;
}
