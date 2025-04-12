import { UserRole, type User } from "./types";
import { JwtUtils } from "../../utils/jwt";
import { drizzleDb } from "../../lib";
import { users } from "../../db/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

// JWT expiration time in seconds (7 days)
const JWT_EXPIRATION = 7 * 24 * 60 * 60;

export class AuthService {
  async login(
    username: string,
    password: string
  ): Promise<{ user: Omit<User, "password">; token: string } | null> {
    // Find user by username from the database
    const [user] = await drizzleDb
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      return null;
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return null;
    }

    // Create JWT token with 7-day expiration
    const token = JwtUtils.createToken({
      sub: user.id,
      email: user.username, // Using username as email for JWT payload
      name: user.username,  // Using username as name for JWT payload
      role: user.role,
    }, JWT_EXPIRATION);
    
    // Convert database schema user to auth domain user
    const authUser: Omit<User, "password"> = {
      id: user.id,
      username: user.username, // Using username field from the schema
      role: user.role as UserRole,
      created_at: user.created_at ?? new Date(),
      updated_at: user.updated_at ?? new Date(),
    };
    
    return { user: authUser, token };
  }

  async register(
    userData: Omit<User, "id" | "created_at" | "updated_at">
  ): Promise<Omit<User, "password"> | null> {
    // Check if user already exists
    const [existingUser] = await drizzleDb
      .select()
      .from(users)
      .where(eq(users.username, userData.username))
      .limit(1);
      
    if (existingUser) {
      return null;
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userData.password || "", saltRounds);

    // Insert new user into the database
    const [newUser] = await drizzleDb
      .insert(users)
      .values({
        username: userData.username,
        password: hashedPassword,
        role: userData.role || UserRole.OPERATOR,
      })
      .returning();

    if (!newUser) {
      return null;
    }

    // Convert database schema user to auth domain user
    const authUser: Omit<User, "password"> = {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role as UserRole,
      created_at: newUser.created_at ?? new Date(),
      updated_at: newUser.updated_at ?? new Date(),
    };

    return authUser;
  }

  async validateToken(token: string): Promise<Omit<User, "password"> | null> {
    // Verify token
    const payload = JwtUtils.verifyToken(token);
    if (!payload) {
      return null;
    }

    // Find user by ID from the database
    const [user] = await drizzleDb
      .select()
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);
      
    if (!user) {
      return null;
    }

    // Convert database schema user to auth domain user
    const authUser: Omit<User, "password"> = {
      id: user.id,
      username: user.username,
      role: user.role as UserRole,
      created_at: user.created_at ?? new Date(),
      updated_at: user.updated_at ?? new Date(),
    };

    return authUser;
  }

  async getUsers(page = 1, pageSize = 10): Promise<{
    users: Omit<User, "password">[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    // Calculate offset
    const offset = (page - 1) * pageSize;
    
    // Get paginated users from the database
    const userList = await drizzleDb
      .select()
      .from(users)
      .limit(pageSize)
      .offset(offset);
    
    // Get total count of users
    const [countResult] = await drizzleDb
      .select({ count: sql<number>`count(*)` })
      .from(users);
    
    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / pageSize);
    
    // Map database users to auth domain users without password
    const mappedUsers = userList.map(user => ({
      id: user.id,
      username: user.username,
      role: user.role as UserRole,
      created_at: user.created_at ?? new Date(),
      updated_at: user.updated_at ?? new Date(),
    }));
    
    return {
      users: mappedUsers,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  async updateUser(
    userId: string,
    userData: Partial<Omit<User, "id" | "created_at" | "updated_at">>
  ): Promise<Omit<User, "password"> | null> {
    // Prepare update data
    const updated_ata: Record<string, any> = {};
    
    if (userData.username) {
      updated_ata.username = userData.username;
    }
    
    if (userData.role) {
      updated_ata.role = userData.role;
    }
    
    if (userData.password) {
      const saltRounds = 10;
      updated_ata.password = await bcrypt.hash(userData.password, saltRounds);
    }
    
    // Check if there's anything to update
    if (Object.keys(updated_ata).length === 0) {
      return null;
    }
    
    // Update user in the database
    const [updatedUser] = await drizzleDb
      .update(users)
      .set({
        password: userData.password
      })
      .where(eq(users.id, userId))
      .returning();
      
    if (!updatedUser) {
      return null;
    }
    
    // Convert database schema user to auth domain user
    const authUser: Omit<User, "password"> = {
      id: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role as UserRole,
      created_at: updatedUser.created_at ?? new Date(),
      updated_at: updatedUser.updated_at ?? new Date(),
    };
    
    return authUser;
  }
  
  async getUserById(userId: string): Promise<Omit<User, "password"> | null> {
    // Find user by ID from the database
    const [user] = await drizzleDb
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
      
    if (!user) {
      return null;
    }
    
    // Convert database schema user to auth domain user
    const authUser: Omit<User, "password"> = {
      id: user.id,
      username: user.username,
      role: user.role as UserRole,
      created_at: user.created_at ?? new Date(),
      updated_at: user.updated_at ?? new Date(),
    };
    
    return authUser;
  }
  
  async deleteUser(userId: string): Promise<boolean> {
    // Delete user from the database
    await drizzleDb
      .delete(users)
      .where(eq(users.id, userId));
      
    // Return true if deletion was successful
    return true;
  }
}
