import type { User } from "../models/User";
import { JwtUtils } from "../../../utils/jwt";
import type { JwtPayload } from "../../../utils/jwt";

// Mock user database for demonstration
// In a real app, this would be replaced with a database query
const MOCK_USERS: User[] = [
  {
    id: "1",
    email: "admin@example.com",
    name: "Admin User",
    password: "password123", // This would be hashed in a real app
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    email: "user@example.com",
    name: "Regular User",
    password: "password123", // This would be hashed in a real app
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export class AuthService {
  async login(
    email: string,
    password: string
  ): Promise<{ user: Omit<User, "password">; token: string } | null> {
    // Find user by email
    const user = MOCK_USERS.find((u) => u.email === email);

    // Check if user exists and password matches
    if (!user || user.password !== password) {
      return null;
    }

    // Create JWT token
    const token = JwtUtils.createToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // Return user without password and token
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async register(
    userData: Omit<User, "id" | "createdAt" | "updatedAt">
  ): Promise<Omit<User, "password"> | null> {
    // Check if user already exists
    const existingUser = MOCK_USERS.find((u) => u.email === userData.email);
    if (existingUser) {
      return null;
    }

    // Create new user
    const newUser: User = {
      id: (MOCK_USERS.length + 1).toString(),
      ...userData,
      role: userData.role || "user", // Default role is user
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // In a real app, save to database
    MOCK_USERS.push(newUser);

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  async validateToken(token: string): Promise<Omit<User, "password"> | null> {
    // Verify token
    const payload = JwtUtils.verifyToken(token);
    if (!payload) {
      return null;
    }

    // Find user by ID
    const user = MOCK_USERS.find((u) => u.id === payload.sub);
    if (!user) {
      return null;
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
