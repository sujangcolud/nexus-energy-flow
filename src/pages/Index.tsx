import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Building2,
  Zap,
  Shield,
  Star,
  ChevronRight,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

const Index = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { login, signup, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      console.log("User is logged in, redirecting to dashboard");
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  // Don't render the login form if user is already authenticated
  if (user && !authLoading) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("Starting login process");
      await login(email, password);
      toast.success("Welcome back!");
      console.log("Login successful, should redirect soon");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("Starting signup process");
      await signup(email, password, firstName, lastName);
      toast.success(
        "Account created! Please check your email to verify your account.",
      );
      setActiveTab("login");
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Building2,
      title: "Business Management",
      description:
        "Comprehensive tools for managing orders, expenses, and financial data",
      color: "bg-primary",
    },
    {
      icon: Zap,
      title: "Energy Tracking",
      description:
        "Monitor charging sessions and energy consumption with detailed analytics",
      color: "bg-accent",
    },
    {
      icon: Shield,
      title: "Role-Based Access",
      description:
        "Secure access control with different permission levels for team members",
      color: "bg-success",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary rounded-lg shadow-lg">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
                Energy Palace Nexus
              </h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Professional business management platform for energy operations
              and financial tracking
            </p>
            <div className="flex justify-center mt-4">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 text-yellow-500 fill-current"
                  />
                ))}
                <span className="ml-2 text-muted-foreground text-sm">
                  Trusted by businesses worldwide
                </span>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start max-w-6xl mx-auto">
            {/* Auth Form */}
            <div className="order-2 lg:order-1">
              <Card
                className="shadow-lg border border-border bg-white hover:shadow-xl transition-shadow duration-300"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <CardHeader className="space-y-4">
                  <CardTitle className="text-2xl font-semibold text-center text-foreground flex items-center justify-center gap-2">
                    Access Your Dashboard
                    <ArrowRight
                      className={`h-5 w-5 transition-transform duration-300 text-muted-foreground ${isHovered ? "translate-x-1" : ""}`}
                    />
                  </CardTitle>
                  <CardDescription className="text-center text-muted-foreground">
                    Sign in to your account or create a new one
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="space-y-6"
                  >
                    <TabsList className="grid w-full grid-cols-2 bg-muted">
                      <TabsTrigger
                        value="login"
                        className="data-[state=active]:bg-white data-[state=active]:text-foreground text-muted-foreground"
                      >
                        Sign In
                      </TabsTrigger>
                      <TabsTrigger
                        value="signup"
                        className="data-[state=active]:bg-white data-[state=active]:text-foreground text-muted-foreground"
                      >
                        Sign Up
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="login" className="space-y-6">
                      <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-3">
                          <Label
                            htmlFor="login-email"
                            className="text-slate-700 font-medium"
                          >
                            Email Address
                          </Label>
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="h-12 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label
                            htmlFor="login-password"
                            className="text-slate-700 font-medium"
                          >
                            Password
                          </Label>
                          <div className="relative">
                            <Input
                              id="login-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              className="h-12 border-slate-300 focus:border-slate-500 focus:ring-slate-500 pr-12"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                            >
                              {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </div>
                        <Button
                          type="submit"
                          className="w-full h-12 bg-primary hover:bg-primary-dark text-white font-medium transition-colors"
                          disabled={loading}
                        >
                          {loading ? (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                              Signing In...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              Sign In
                              <ChevronRight className="h-5 w-5" />
                            </div>
                          )}
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="signup" className="space-y-6">
                      <form onSubmit={handleSignup} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <Label
                              htmlFor="firstName"
                              className="text-slate-700 font-medium"
                            >
                              First Name
                            </Label>
                            <Input
                              id="firstName"
                              type="text"
                              placeholder="First name"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              required
                              className="h-12 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label
                              htmlFor="lastName"
                              className="text-slate-700 font-medium"
                            >
                              Last Name
                            </Label>
                            <Input
                              id="lastName"
                              type="text"
                              placeholder="Last name"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              required
                              className="h-12 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                            />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Label
                            htmlFor="signup-email"
                            className="text-slate-700 font-medium"
                          >
                            Email Address
                          </Label>
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="h-12 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label
                            htmlFor="signup-password"
                            className="text-slate-700 font-medium"
                          >
                            Password
                          </Label>
                          <div className="relative">
                            <Input
                              id="signup-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Create a strong password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              className="h-12 border-slate-300 focus:border-slate-500 focus:ring-slate-500 pr-12"
                              minLength={6}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                            >
                              {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </div>
                        <Button
                          type="submit"
                          className="w-full h-12 bg-primary hover:bg-primary-dark text-white font-medium transition-colors"
                          disabled={loading}
                        >
                          {loading ? (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                              Creating Account...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              Create Account
                              <ChevronRight className="h-5 w-5" />
                            </div>
                          )}
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Features */}
            <div className="space-y-8 order-1 lg:order-2">
              <div className="text-center lg:text-left">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Business Intelligence Platform
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Streamline your operations with our comprehensive suite of
                  business tools
                </p>
              </div>

              <div className="space-y-6">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-6 bg-white rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow duration-300"
                  >
                    <div
                      className={`p-3 ${feature.color} rounded-lg shadow-sm`}
                    >
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-foreground mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
