/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import logo from '../assets/trackit.svg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { resetPassword, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email as string | undefined;

  // Security check: redirect if no email in state (OTP must be verified first)
  useEffect(() => {
    if (!email) {
      toast.error('No email found. Please verify OTP first.');
      navigate('/forgot-password', { replace: true });
    }
  }, [email, navigate]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!password || password.trim() === '') {
      toast.error('Please enter a new password');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (!email) {
      toast.error('No email found, please try again.', {
        id: 'reset-password',
      });
      navigate('/forgot-password', { replace: true });
      return;
    }

    toast.loading('Resetting password...', { id: 'reset-password' });

    try {
      await resetPassword(email, password);
      toast.success('Password reset successfully!', {
        id: 'reset-password',
      });
      // Clear state and navigate to login
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Password reset failed', {
        id: 'reset-password',
      });
    }
  };

  // Don't render if no email (will redirect)
  if (!email) {
    return null;
  }

  return (
    <div className="min-h-screen min-w-screen flex flex-col items-center justify-center bg-background">
      <div className="login-container h-fit w-[320px]">
        <img src={logo} alt="TrackIt Logo" className="w-12 mb-5 mx-auto" />
        <h2 className="text-2xl font-bold mb-0.5 text-center">
          Reset Password
        </h2>
        <p className="description text-center font-semibold text-muted-foreground mb-2">
          Enter your new password
        </p>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password" className="mb-2 block">
              New Password
            </Label>
            <Input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border-2 ring-0"
              disabled={isLoading}
              placeholder="Enter new password"
              autoComplete="new-password"
              minLength={6}
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword" className="mb-2 block">
              Confirm Password
            </Label>
            <Input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full border-2 ring-0"
              disabled={isLoading}
              placeholder="Confirm new password"
              autoComplete="new-password"
              minLength={6}
            />
          </div>
          {password && confirmPassword && password !== confirmPassword && (
            <p className="text-expense text-sm text-center">
              Passwords don't match
            </p>
          )}
          {error && (
            <p className="text-expense w-full py-3 bg-expense/10 rounded-md font-semibold text-center text-sm">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full font-semibold"
            disabled={
              isLoading ||
              !password ||
              !confirmPassword ||
              password !== confirmPassword
            }
            variant={'secondary'}
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
        <p className="mt-4 font-semibold text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-primary underline">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
