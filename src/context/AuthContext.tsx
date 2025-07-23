import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export type UserRole = "user" | "data_entry" | "reports_viewer" | "super_admin";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  userRole: UserRole | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  hasRole: (requiredRole: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log("Fetching profile for user:", userId);

      // Try to get profile first
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      console.log("Profile data:", profile, "Profile error:", profileError);

      // Use the new security definer function to get user role safely
      const { data: userRole, error: roleError } = await supabase.rpc(
        "get_current_user_role",
      );

      console.log("Role data:", userRole, "Role error:", roleError);

      // Fallback: if database role lookup fails but user is the admin email
      let finalRole = userRole;
      if (roleError || !userRole) {
        console.log("Database role lookup failed, checking fallback...");
        if (session?.user?.email === "sujan1nepal@gmail.com") {
          console.log("Using super_admin fallback for sujan1nepal@gmail.com");
          finalRole = "super_admin";
        } else {
          finalRole = "user";
        }
      }

      // If we have a profile, create the app user
      if (profile) {
        const appUser: AppUser = {
          id: userId,
          email: profile.email || "",
          name:
            `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
            "User",
          role: (finalRole as UserRole) || "user",
          first_name: profile.first_name,
          last_name: profile.last_name,
        };
        console.log("Setting app user:", appUser);
        setUser(appUser);
      } else {
        // Profile doesn't exist yet, create a basic user object
        console.log("No profile found, creating basic user");
        const basicUser: AppUser = {
          id: userId,
          email: session?.user?.email || "",
          name: "User",
          role: (userRole as UserRole) || "user",
        };
        setUser(basicUser);
      }
    } catch (error: any) {
      console.error("Error fetching user profile:", error);

      // Check for refresh token errors
      if (
        error?.message?.includes("refresh_token_not_found") ||
        error?.message?.includes("Invalid Refresh Token") ||
        error?.message?.includes("AuthApiError: Invalid Refresh Token")
      ) {
        console.log("Refresh token error in profile fetch, signing out");
        // Clear everything and let the auth state listener handle it
        setUser(null);
        setSession(null);
        supabase.auth.signOut().catch(console.error);
        return;
      }

      // Create a fallback user object for other errors
      const fallbackUser: AppUser = {
        id: userId,
        email: session?.user?.email || "",
        name: "User",
        role: "user",
      };
      setUser(fallbackUser);
    }
  };

  useEffect(() => {
    console.log("Setting up auth state listener");

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session);

      // Handle token refresh errors
      if (event === "TOKEN_REFRESHED" && !session) {
        console.log("Token refresh failed, signing out user");
        setUser(null);
        setSession(null);
        setLoading(false);
        return;
      }

      // Handle sign out events
      if (event === "SIGNED_OUT") {
        console.log("User signed out");
        setUser(null);
        setSession(null);
        setLoading(false);
        return;
      }

      setSession(session);
      setLoading(false);
    });

    // Check for existing session with error handling
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        console.log("Initial session check:", session, "Error:", error);

        if (error) {
          console.error("Session check error:", error);
          // If there's an error getting the session (like invalid refresh token), clear everything
          if (
            error.message?.includes("refresh_token_not_found") ||
            error.message?.includes("Invalid Refresh Token")
          ) {
            console.log("Invalid refresh token detected, clearing session");
            setUser(null);
            setSession(null);
          }
        } else {
          setSession(session);
        }

        setLoading(false);
      })
      .catch((error) => {
        console.error("Unexpected error during session check:", error);
        // Clear session on any unexpected errors
        setUser(null);
        setSession(null);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchUserProfile(session.user.id);
    } else {
      setUser(null);
    }
  }, [session]);

  const login = async (email: string, password: string) => {
    console.log("Attempting login for:", email);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);

        // Provide more user-friendly error messages
        if (
          error.message?.includes("Failed to fetch") ||
          error.name === "AuthRetryableFetchError"
        ) {
          throw new Error(
            "Unable to connect to the server. Please check your internet connection and try again.",
          );
        }

        if (error.message?.includes("Invalid login credentials")) {
          throw new Error(
            "Invalid email or password. Please check your credentials and try again.",
          );
        }

        // For other errors, provide a generic message
        throw new Error(error.message || "Login failed. Please try again.");
      }

      console.log("Login successful");
    } catch (error: any) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const signup = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => {
    console.log("Attempting signup for:", email);
    const redirectUrl = `${window.location.origin}/dashboard`;

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) {
        console.error("Signup error:", error);

        // Provide more user-friendly error messages
        if (
          error.message?.includes("Failed to fetch") ||
          error.name === "AuthRetryableFetchError"
        ) {
          throw new Error(
            "Unable to connect to the server. Please check your internet connection and try again.",
          );
        }

        if (error.message?.includes("already registered")) {
          throw new Error(
            "An account with this email already exists. Please try signing in instead.",
          );
        }

        if (error.message?.includes("Password should be")) {
          throw new Error(
            "Password is too weak. Please use at least 6 characters with a mix of letters and numbers.",
          );
        }

        // For other errors, provide a generic message
        throw new Error(error.message || "Signup failed. Please try again.");
      }

      console.log("Signup successful");

      // Create an initial balance record for the new user
      if (data.user) {
        const { error: balanceError } = await supabase
          .from("balances")
          .insert({ user_id: data.user.id });
        if (balanceError) {
          console.error("Error creating initial balance:", balanceError);
        }
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Always clear local state first
      setUser(null);
      setSession(null);

      // Try to sign out from Supabase, but don't fail if there's no session
      const { error } = await supabase.auth.signOut();

      if (error) {
        // If it's an auth session missing error, that's fine - we already cleared local state
        if (
          error.message?.includes("Auth session missing") ||
          error.name === "AuthSessionMissingError"
        ) {
          console.log(
            "No active session to sign out from, local state cleared",
          );
          return;
        }

        // For other errors, log them but don't throw to avoid breaking the UX
        console.error("Error signing out:", error);
      }
    } catch (error: any) {
      // Catch any other errors and handle auth session missing gracefully
      if (
        error.message?.includes("Auth session missing") ||
        error.name === "AuthSessionMissingError"
      ) {
        console.log(
          "No active session to sign out from, local state already cleared",
        );
        return;
      }

      // For unexpected errors, log but don't throw to maintain good UX
      console.error("Unexpected error during logout:", error);
    }
  };

  const signOut = logout; // Alias for backward compatibility

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!user) return false;

    const roleHierarchy = {
      user: 1,
      data_entry: 2,
      reports_viewer: 3,
      super_admin: 4,
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole: user?.role || null,
        login,
        signup,
        logout,
        signOut,
        loading,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
