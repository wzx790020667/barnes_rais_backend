import { AuthService } from "./AuthService";
import type { BunRequest } from "bun";
import { z } from "zod";
import { UserRole } from "./types";

// Define Zod schemas for request validation
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

const registerSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  role: z.nativeEnum(UserRole).default(UserRole.OPERATOR)
});

const createUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  role: z.nativeEnum(UserRole).default(UserRole.OPERATOR)
});

const updateUserSchema = z.object({
  password: z.string().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update"
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10)
});

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async login(req: Request): Promise<Response> {
    try {
      const body = await req.json();
      
      // Validate request body
      const result = loginSchema.safeParse(body);
      
      if (!result.success) {
        return Response.json(
          { error: result.error.format() },
          { status: 400 }
        );
      }
      
      const { username, password } = result.data;
      const loginResult = await this.authService.login(username, password);

      if (!loginResult) {
        return Response.json({ error: "Invalid credentials" }, { status: 401 });
      }

      return Response.json(loginResult);
    } catch (error) {
      console.error("Login error:", error);
      return Response.json({ error: "Authentication failed" }, { status: 500 });
    }
  }

  async register(req: Request): Promise<Response> {
    try {
      const body = await req.json();
      
      // Validate request body
      const result = registerSchema.safeParse(body);
      
      if (!result.success) {
        return Response.json(
          { error: result.error.format() },
          { status: 400 }
        );
      }
      
      const userData = result.data;
      const user = await this.authService.register(userData);

      if (!user) {
        return Response.json({ error: "Registration failed" }, { status: 400 });
      }

      return Response.json(user, { status: 201 });
    } catch (error) {
      console.error("Registration error:", error);
      return Response.json({ error: "Registration failed" }, { status: 500 });
    }
  }

  async createUser(req: Request): Promise<Response> {
    try {
      const body = await req.json();
      
      // Validate request body
      const result = createUserSchema.safeParse(body);
      
      if (!result.success) {
        return Response.json(
          { error: result.error.format() },
          { status: 400 }
        );
      }
      
      const userData = result.data;
      const user = await this.authService.register(userData);

      if (!user) {
        return Response.json({ error: "User creation failed" }, { status: 400 });
      }

      return Response.json(user, { status: 201 });
    } catch (error) {
      console.error("User creation error:", error);
      return Response.json({ error: "User creation failed" }, { status: 500 });
    }
  }

  async getUsers(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      
      // Validate pagination parameters using Zod
      const result = paginationSchema.safeParse({
        page: url.searchParams.get('page') || undefined,
        pageSize: url.searchParams.get('pageSize') || undefined
      });
      
      if (!result.success) {
        return Response.json(
          { error: result.error.format() },
          { status: 400 }
        );
      }
      
      const { page, pageSize } = result.data;
      const users = await this.authService.getUsers(page, pageSize);
      
      return Response.json(users);
    } catch (error) {
      console.error("Get users error:", error);
      return Response.json({ error: "Failed to retrieve users" }, { status: 500 });
    }
  }

  async updateUser(userId: string, req: BunRequest): Promise<Response> {
    try {
      if (!userId) {
        return Response.json({ error: "User ID is required" }, { status: 400 });
      }
      
      const body = await req.json();
      
      // Validate request body
      const result = updateUserSchema.safeParse(body);
      
      if (!result.success) {
        return Response.json(
          { error: result.error.format() },
          { status: 400 }
        );
      }
      
      const userData = result.data;
      const updatedUser = await this.authService.updateUser(userId, userData);
      
      if (!updatedUser) {
        return Response.json({ error: "User update failed" }, { status: 400 });
      }
      
      return Response.json(updatedUser);
    } catch (error) {
      console.error("Update user error:", error);
      return Response.json({ error: "Failed to update user" }, { status: 500 });
    }
  }
  
  async deleteUser(userId: string): Promise<Response> {
    try {
      if (!userId) {
        return Response.json({ error: "User ID is required" }, { status: 400 });
      }
      
      // Get user to check role
      const user = await this.authService.getUserById(userId);
      
      if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 });
      }
      
      // Prevent deletion of admin users
      if (user.role === UserRole.ADMIN) {
        return Response.json({ error: "Admin users cannot be deleted" }, { status: 403 });
      }
      
      const success = await this.authService.deleteUser(userId);
      
      if (!success) {
        return Response.json({ error: "User deletion failed" }, { status: 400 });
      }
      
      return Response.json({ success: true });
    } catch (error) {
      console.error("Delete user error:", error);
      return Response.json({ error: "Failed to delete user" }, { status: 500 });
    }
  }
}
