import { UserController } from "../controllers/UserController";

const userController = new UserController();

export async function userRoutes(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;

  // Get all users
  if (path === "/api/users" && req.method === "GET") {
    return await userController.getUsers(req);
  }

  // Get user by ID
  if (path.match(/^\/api\/users\/[^\/]+$/) && req.method === "GET") {
    return await userController.getUserById(req);
  }

  // Update user
  if (path.match(/^\/api\/users\/[^\/]+$/) && req.method === "PUT") {
    return await userController.updateUser(req);
  }

  // Delete user
  if (path.match(/^\/api\/users\/[^\/]+$/) && req.method === "DELETE") {
    return await userController.deleteUser(req);
  }

  // Return null if this handler doesn't match the route
  return null;
}
