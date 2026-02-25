/* eslint-disable @typescript-eslint/no-explicit-any */
// Login page
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import logo from '../assets/trackit.svg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, clearError } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    // loading toast
    toast.loading('Logging in...', { id: 'login' });

    try {
      await login(email, password);
      toast.success('Login Successful', { id: 'login' });
      navigate(from, { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login Failed', {
        id: 'login',
      });
    }
  };
  return (
    <div className="min-h-screen min-w-screen flex flex-col items-center justify-center bg-background">
      <div className="login-container h-fit w-[320px]">
        <img src={logo} alt="TrackIt Logo" className="w-12 mb-5 mx-auto" />
        <h2 className="text-2xl font-bold mb-0.5 text-center">Welcome Back!</h2>
        <p className="description text-center font-semibold text-muted-foreground mb-6">
          {/* short description */}
          Login to your trackit account
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="mb-2 block">
              Email
            </Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border-2 ring-0"
              disabled={isLoading}
              placeholder="Enter your email"
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="password" className="mb-2 block">
              Password
            </Label>
            <Input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border-2 ring-0"
              disabled={isLoading}
              placeholder="Enter your password"
              autoComplete="off"
            />
          </div>
          <Button
            type="submit"
            className="w-full font-semibold"
            disabled={isLoading}
            variant={'secondary'}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
        <p className="mt-3 font-semibold text-center text-sm">
          <Link to="/forgot-password" className="text-primary underline hover:text-primary/80">
            Forgot Password?
          </Link>
        </p>
        <p className="mt-4 font-semibold text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
