import { AuthService } from "../domains/auth/AuthService";
import type { BunRequest } from "bun";

export class AuthMiddleware {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async authenticate(req: BunRequest): Promise<{ user: any } | null> {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
      }

      const token = authHeader.split(" ")[1];
      const user = await this.authService.validateToken(token);

      return user ? { user } : null;
    } catch (error) {
      console.error("Authentication error:", error);
      return null;
    }
  }

  async requireAuth<T extends BunRequest>(
    req: T,
    handler: (req: T, user: any) => Promise<Response>
  ): Promise<Response> {
    const auth = await this.authenticate(req);

    if (!auth) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handler(req, auth.user);
  }

  async requireAdmin<T extends BunRequest>(
    req: T,
    handler: (req: T, user: any) => Promise<Response>
  ): Promise<Response> {
    const auth = await this.authenticate(req);

    if (!auth) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (auth.user.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    return await handler(req, auth.user);
  }
}
