/**
 * Utility functions for working with JWTs
 * Note: Using the jsonwebtoken library for JWT operations
 */

import jwt from "jsonwebtoken";
import { JWT_CONFIG } from "../config";

export type JwtPayload = {
  sub: string;
  email: string;
  name: string;
  role: string;
  iat?: number;
  exp?: number;
};

export class JwtUtils {
  /**
   * Create a JWT token
   */
  static createToken(
    payload: Omit<JwtPayload, "iat" | "exp">,
    expiresIn: number = JWT_CONFIG.EXPIRES_IN
  ): string {
    return jwt.sign(payload, JWT_CONFIG.SECRET, { expiresIn });
  }

  /**
   * Verify and decode a JWT token
   */
  static verifyToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, JWT_CONFIG.SECRET) as JwtPayload;
    } catch (error) {
      console.error("JWT verification failed:", error);
      return null;
    }
  }
}
