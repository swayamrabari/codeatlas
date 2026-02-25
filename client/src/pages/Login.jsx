import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import LogoIcon from '../assets/logo';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authAPI.login(email, password);
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      const msg =
        err.response?.data?.error || 'Login failed. Please try again.';

      if (err.response?.data?.needsVerification) {
        navigate(
          `/verify-email?email=${encodeURIComponent(err.response.data.email)}`,
        );
        return;
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <LogoIcon className="h-8 w-auto" style={{ fill: 'white' }} />
        </div>

        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-base text-muted-foreground font-semibold">
            Login to your account to continue.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="rounded-md bg-red-500/10 px-3 py-2.5 border-[1.5px] font-semibold border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="block text-sm font-medium text-white"
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              className={'font-semibold'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="none"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="block text-sm font-medium text-white"
            >
              Password
            </Label>
            <Input
              id="password"
              type="password"
              className={'font-semibold'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            variant={
              // disable variant when loading to prevent multiple clicks
              loading ? 'disabled' : 'default'
            }
            className="w-full flex items-center justify-center gap-2 font-semibold mt-5"
          >
            {loading && <Spinner className="h-4 w-4" />}
            <span>Login</span>
          </Button>

          <p className="text-base text-muted-foreground font-semibold text-center mt-4">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-primary font-medium hover:underline"
            >
              Sign Up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
