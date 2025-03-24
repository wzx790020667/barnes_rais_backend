import { supabase, db } from "./supabase";

// Example of a user type - replace with your actual schema
interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export const UserRepository = {
  /**
   * Get a user by ID
   */
  async getById(
    id: string
  ): Promise<{ data: User | null; error: Error | null }> {
    return db.query(async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as User;
    });
  },

  /**
   * Create a new user
   */
  async create(
    user: Omit<User, "id" | "created_at">
  ): Promise<{ data: User | null; error: Error | null }> {
    return db.query(async () => {
      const { data, error } = await supabase
        .from("users")
        .insert(user)
        .select()
        .single();

      if (error) throw error;
      return data as User;
    });
  },

  /**
   * Update an existing user
   */
  async update(
    id: string,
    user: Partial<Omit<User, "id" | "created_at">>
  ): Promise<{ data: User | null; error: Error | null }> {
    return db.query(async () => {
      const { data, error } = await supabase
        .from("users")
        .update(user)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as User;
    });
  },

  /**
   * Delete a user
   */
  async delete(
    id: string
  ): Promise<{ data: { success: boolean } | null; error: Error | null }> {
    return db.query(async () => {
      const { error } = await supabase.from("users").delete().eq("id", id);

      if (error) throw error;
      return { success: true };
    });
  },
};
