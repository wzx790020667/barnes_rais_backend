import { AuthService } from "./AuthService";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async login(req: Request): Promise<Response> {
    try {
      const { email, password } = await req.json();

      if (!email || !password) {
        return Response.json(
          { error: "Email and password are required" },
          { status: 400 }
        );
      }

      const result = await this.authService.login(email, password);

      if (!result) {
        return Response.json({ error: "Invalid credentials" }, { status: 401 });
      }

      return Response.json(result);
    } catch (error) {
      console.error("Login error:", error);
      return Response.json({ error: "Authentication failed" }, { status: 500 });
    }
  }

  async register(req: Request): Promise<Response> {
    try {
      const userData = await req.json();

      if (!userData.email || !userData.password || !userData.name) {
        return Response.json(
          { error: "Email, password, and name are required" },
          { status: 400 }
        );
      }

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
}
