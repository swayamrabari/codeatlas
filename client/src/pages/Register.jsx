import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import LogoIcon from '../assets/logo';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const isEmailValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  // Debounce email validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (email && !isEmailValid(email)) {
        setEmailError('Please enter a valid email address');
      } else {
        setEmailError('');
      }
    }, 800); // 800ms delay

    return () => clearTimeout(timer);
  }, [email]);

  const getPasswordStrength = () => {
    if (!password) return { label: '', color: '', width: '0%' };
    if (password.length < 6)
      return { label: 'Too short', color: 'bg-red-500', width: '20%' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1)
      return { label: 'Weak', color: 'bg-orange-500', width: '40%' };
    if (score === 2)
      return { label: 'Fair', color: 'bg-yellow-500', width: '60%' };
    if (score === 3)
      return { label: 'Good', color: 'bg-emerald-500', width: '80%' };
    return { label: 'Strong', color: 'bg-emerald-400', width: '100%' };
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isEmailValid(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      await authAPI.register(name, email, password);
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      const msg =
        err.response?.data?.error || 'Registration failed. Please try again.';
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
          <h1 className="text-2xl font-bold text-white">Create an account</h1>
          <p className="text-base text-muted-foreground font-semibold">
            Sign up to get started with CodeAtlas.
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
              htmlFor="name"
              className="block text-sm font-medium text-white"
            >
              Username
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              className="font-semibold"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

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
              className="font-semibold"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            {emailError && (
              <p className="text-xs text-destructive font-semibold">
                {emailError}
              </p>
            )}
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
              placeholder="Min 8 characters"
              className="font-semibold"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            {password && (
              <div className="space-y-1.5 pt-0.5">
                <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                    style={{ width: strength.width }}
                  />
                </div>
                <p className="text-xs text-muted-foreground font-semibold">
                  Password strength:{' '}
                  <span className="font-medium text-foreground">
                    {strength.label}
                  </span>
                </p>
              </div>
            )}
          </div>

          <Button
            type="submit"
            variant={loading ? 'disabled' : 'default'}
            className="w-full flex items-center justify-center gap-2 font-semibold mt-5"
          >
            {loading && <Spinner className="h-4 w-4" />}
            <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
          </Button>

          <p className="text-base text-muted-foreground font-semibold text-center mt-4">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-primary font-medium hover:underline"
            >
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
