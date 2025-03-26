import type { User } from "../auth/types";

// Mock user database for demonstration
const MOCK_USERS: User[] = [
  {
    id: "1",
    email: "admin@example.com",
    name: "Admin User",
    password: "password123",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    email: "user@example.com",
    name: "Regular User",
    password: "password123",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export class UserService {
  async getUserById(id: string): Promise<Omit<User, "password"> | null> {
    const user = MOCK_USERS.find((u) => u.id === id);
    if (!user) return null;
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUsers(): Promise<Omit<User, "password">[]> {
    return MOCK_USERS.map(({ password: _, ...user }) => user);
  }

  async updateUser(
    id: string,
    userData: Partial<User>
  ): Promise<Omit<User, "password"> | null> {
    const index = MOCK_USERS.findIndex((u) => u.id === id);
    if (index === -1) return null;

    MOCK_USERS[index] = {
      ...MOCK_USERS[index],
      ...userData,
      updatedAt: new Date(),
    };

    const { password: _, ...updatedUser } = MOCK_USERS[index];
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    const index = MOCK_USERS.findIndex((u) => u.id === id);
    if (index === -1) return false;
    MOCK_USERS.splice(index, 1);
    return true;
  }
}
