
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Building2, Zap, Shield } from 'lucide-react';

const Index = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  if (user) {
    navigate('/dashboard');
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const demoCredentials = [
    { role: 'Super Admin', email: 'admin@energypalace.com', password: 'admin123' },
    { role: 'Manager', email: 'manager@energypalace.com', password: 'manager123' },
    { role: 'User', email: 'user@energypalace.com', password: 'user123' }
  ];

  const features = [
    {
      icon: Building2,
      title: "Business Management",
      description: "Comprehensive tools for managing orders, expenses, and financial data"
    },
    {
      icon: Zap,
      title: "Energy Tracking",
      description: "Monitor charging sessions and energy consumption with detailed analytics"
    },
    {
      icon: Shield,
      title: "Role-Based Access",
      description: "Secure access control with different permission levels for team members"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Energy Palace Nexus Point
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comprehensive business management platform for energy operations, financial tracking, and data analytics
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Login Form */}
          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="space-y-4">
              <CardTitle className="text-2xl font-bold text-center text-gray-800">
                Sign In to Your Account
              </CardTitle>
              <CardDescription className="text-center text-gray-600">
                Access your business management dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                  disabled={loading}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>

              {/* Demo Credentials */}
              <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-gray-800 mb-3">Demo Credentials:</h3>
                <div className="space-y-2 text-sm">
                  {demoCredentials.map((cred, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">{cred.role}:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEmail(cred.email);
                          setPassword(cred.password);
                        }}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {cred.email}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="space-y-8">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Powerful Business Management
              </h2>
              <p className="text-lg text-gray-600">
                Streamline your operations with our comprehensive suite of business tools
              </p>
            </div>
            
            <div className="space-y-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-6 bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300"
                >
                  <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
