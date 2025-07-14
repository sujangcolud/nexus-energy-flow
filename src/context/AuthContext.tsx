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

      // If we have a profile, create the app user
      if (profile) {
        const appUser: AppUser = {
          id: userId,
          email: profile.email || "",
          name:
            `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
            "User",
          role: (userRole as UserRole) || "user",
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
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // Create a fallback user object
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
      setSession(session);

      if (session?.user) {
        // Fetch user profile after a short delay to avoid potential race conditions
        setTimeout(() => {
          fetchUserProfile(session.user.id);
        }, 100);
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session check:", session);
      setSession(session);
      if (session?.user) {
        setTimeout(() => {
          fetchUserProfile(session.user.id);
        }, 100);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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

    const { error } = await supabase.auth.signUp({
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
      throw error;
    }
    console.log("Signup successful");
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
