import { UserService } from "../services/UserService";

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async getUserById(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return Response.json({ error: "User ID is required" }, { status: 400 });
      }

      const user = await this.userService.getUserById(id);

      if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 });
      }

      return Response.json(user);
    } catch (error) {
      console.error("Get user error:", error);
      return Response.json({ error: "Failed to get user" }, { status: 500 });
    }
  }

  async getUsers(req: Request): Promise<Response> {
    try {
      const users = await this.userService.getUsers();
      return Response.json(users);
    } catch (error) {
      console.error("Get users error:", error);
      return Response.json({ error: "Failed to get users" }, { status: 500 });
    }
  }

  async updateUser(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return Response.json({ error: "User ID is required" }, { status: 400 });
      }

      const userData = await req.json();
      const updatedUser = await this.userService.updateUser(id, userData);

      if (!updatedUser) {
        return Response.json(
          { error: "User not found or update failed" },
          { status: 404 }
        );
      }

      return Response.json(updatedUser);
    } catch (error) {
      console.error("Update user error:", error);
      return Response.json({ error: "Failed to update user" }, { status: 500 });
    }
  }

  async deleteUser(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return Response.json({ error: "User ID is required" }, { status: 400 });
      }

      const success = await this.userService.deleteUser(id);

      if (!success) {
        return Response.json(
          { error: "User not found or delete failed" },
          { status: 404 }
        );
      }

      return Response.json({ success: true });
    } catch (error) {
      console.error("Delete user error:", error);
      return Response.json({ error: "Failed to delete user" }, { status: 500 });
    }
  }
}
