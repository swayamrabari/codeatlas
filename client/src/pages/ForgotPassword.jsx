import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import LogoIcon from '../assets/logo';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const data = await authAPI.forgotPassword(email);
      setSuccess(
        data?.message ||
          'If this email is registered, a password reset code has been sent.',
      );
      navigate(`/reset-password?email=${encodeURIComponent(email)}`, {
        replace: true,
      });
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Unable to send reset code right now. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <LogoIcon className="h-8 w-auto" style={{ fill: 'white' }} />
        </div>

        <div className="text-center mb-5">
          <h1 className="text-2xl font-bold text-white">Forgot password?</h1>
          <p className="text-base text-muted-foreground font-semibold">
            Enter your email to receive a 6-digit reset code.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="rounded-md bg-red-500/10 px-3 py-2.5 border-[1.5px] font-semibold border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-md bg-emerald-500/10 px-3 py-2.5 border-[1.5px] font-semibold border-emerald-500/20 text-sm text-emerald-400">
              {success}
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
              className="font-semibold"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <Button
            type="submit"
            variant={loading ? 'disabled' : 'default'}
            className="w-full flex items-center justify-center gap-2 font-semibold mt-5"
          >
            {loading && <Spinner className="h-4 w-4" />}
            <span>{loading ? 'Sending...' : 'Send reset code'}</span>
          </Button>

          <p className="text-base text-muted-foreground font-semibold text-center mt-4">
            Remember your password?{' '}
            <Link
              to="/login"
              className="text-primary font-medium hover:underline"
            >
              Back to login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
