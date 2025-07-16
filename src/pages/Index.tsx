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
  Sparkles,
} from "lucide-react";

const Index = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const { login, signup, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Mouse tracking for interactive effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

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
      color: "from-blue-600 to-indigo-600",
      delay: "0ms",
    },
    {
      icon: Zap,
      title: "Energy Tracking",
      description:
        "Monitor charging sessions and energy consumption with detailed analytics",
      color: "from-yellow-500 to-orange-600",
      delay: "200ms",
    },
    {
      icon: Shield,
      title: "Role-Based Access",
      description:
        "Secure access control with different permission levels for team members",
      color: "from-green-500 to-emerald-600",
      delay: "400ms",
    },
  ];

  const FloatingParticle = ({ delay }: { delay: number }) => (
    <div
      className={`absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-30 animate-pulse`}
      style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${delay}ms`,
        animationDuration: "3s",
      }}
    />
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,rgba(59,130,246,0.1),rgba(147,51,234,0.1),rgba(59,130,246,0.1))]" />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <FloatingParticle key={i} delay={i * 200} />
        ))}
      </div>

      {/* Interactive Cursor Effect */}
      <div
        className="fixed w-96 h-96 pointer-events-none z-10 opacity-20"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)",
          left: mousePosition.x - 192,
          top: mousePosition.y - 192,
          transition: "all 0.3s ease-out",
        }}
      />

      <div className="relative z-20 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16 animate-in fade-in slide-in-from-top duration-1000">
            <div className="inline-flex items-center gap-4 mb-8 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl shadow-2xl">
                  <Building2 className="h-10 w-10 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Energy Palace
                </h1>
                <Sparkles className="h-8 w-8 text-yellow-400 animate-pulse" />
                <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                  Nexus Point
                </h1>
              </div>
            </div>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Next-generation business management platform for energy
              operations, financial tracking, and advanced data analytics
            </p>
            <div className="flex justify-center mt-6">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 text-yellow-400 fill-current"
                  />
                ))}
                <span className="ml-2 text-gray-300">
                  Trusted by 10,000+ businesses
                </span>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Enhanced Auth Form */}
            <div className="animate-in fade-in slide-in-from-left duration-1000 delay-300">
              <Card
                className="shadow-2xl border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-all duration-500 group"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />
                <CardHeader className="space-y-6 relative z-10">
                  <CardTitle className="text-3xl font-bold text-center text-white flex items-center justify-center gap-2">
                    Access Your Dashboard
                    <ArrowRight
                      className={`h-6 w-6 transition-transform duration-300 ${isHovered ? "translate-x-1" : ""}`}
                    />
                  </CardTitle>
                  <CardDescription className="text-center text-gray-300 text-lg">
                    Sign in to your personalized control center or create a new
                    account
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative z-10">
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="space-y-6"
                  >
                    <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-sm border border-white/20">
                      <TabsTrigger
                        value="login"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white text-gray-300"
                      >
                        Sign In
                      </TabsTrigger>
                      <TabsTrigger
                        value="signup"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white text-gray-300"
                      >
                        Sign Up
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="login" className="space-y-6">
                      <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-3">
                          <Label
                            htmlFor="login-email"
                            className="text-gray-200 font-medium"
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
                            className="h-14 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label
                            htmlFor="login-password"
                            className="text-gray-200 font-medium"
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
                              className="h-14 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500 pr-12 transition-all duration-300"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
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
                          className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-blue-500/25 group"
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
                              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </div>
                          )}
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="signup" className="space-y-6">
                      <form onSubmit={handleSignup} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <Label
                              htmlFor="firstName"
                              className="text-gray-200 font-medium"
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
                              className="h-14 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500 transition-all duration-300"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label
                              htmlFor="lastName"
                              className="text-gray-200 font-medium"
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
                              className="h-14 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500 transition-all duration-300"
                            />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Label
                            htmlFor="signup-email"
                            className="text-gray-200 font-medium"
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
                            className="h-14 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500 transition-all duration-300"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label
                            htmlFor="signup-password"
                            className="text-gray-200 font-medium"
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
                              className="h-14 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500 pr-12 transition-all duration-300"
                              minLength={6}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
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
                          className="w-full h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-green-500/25 group"
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
                              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </div>
                          )}
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Features */}
            <div className="space-y-10 animate-in fade-in slide-in-from-right duration-1000 delay-500">
              <div className="text-center lg:text-left">
                <h2 className="text-4xl font-bold text-white mb-6 flex items-center gap-3">
                  Powerful Business Intelligence
                  <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" />
                </h2>
                <p className="text-xl text-gray-300 leading-relaxed">
                  Transform your operations with our cutting-edge suite of
                  intelligent business tools
                </p>
              </div>

              <div className="space-y-8">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="group flex items-start gap-6 p-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-500 transform hover:scale-[1.02] hover:shadow-2xl cursor-pointer"
                    style={{ animationDelay: feature.delay }}
                  >
                    <div
                      className={`relative p-4 bg-gradient-to-r ${feature.color} rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <feature.icon className="h-8 w-8 text-white relative z-10" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-xl text-white mb-3 group-hover:text-blue-300 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-gray-300 leading-relaxed group-hover:text-gray-200 transition-colors">
                        {feature.description}
                      </p>
                    </div>
                    <ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-white group-hover:translate-x-2 transition-all duration-300" />
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
