import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { Eye, EyeOff } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 1000));
    navigate({ to: '/dashboard' });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-background items-center justify-center p-12 border-r">
        <div className="flex flex-col items-center space-y-6">
          <Logo size="xl" showText={false} />
          <div className="text-center space-y-2">
            <h1 className="text-5xl font-bold tracking-tight">KIDKAZZ</h1>
            <p className="text-sm text-muted-foreground uppercase tracking-widest font-medium">
              Best Price Excellent Service
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center space-y-4 mb-8">
            <Logo size="lg" showText={false} />
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold">KIDKAZZ</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                Best Price Excellent Service
              </p>
            </div>
          </div>

          {/* Header */}
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Welcome to Kidkazz</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to access the account area
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="sr-only">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="sr-only">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Continue Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11"
            >
              {isLoading ? 'Signing in...' : 'Continue with Email'}
            </Button>

            {/* Forgot Password Link */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Forgot password?{' '}
                <Button variant="link" className="px-0 h-auto font-normal text-primary" asChild>
                  <a href="#">Reset</a>
                </Button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
