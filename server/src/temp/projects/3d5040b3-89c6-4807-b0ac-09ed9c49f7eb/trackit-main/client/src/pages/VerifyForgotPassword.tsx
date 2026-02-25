/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import logo from '../assets/trackit.svg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function VerifyForgotPassword() {
  const [otp, setOtp] = useState('');
  const { verifyPasswordResetOtp, isLoading, error, clearError } =
    useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email as string | undefined;

  // Security check: redirect if no email in state
  useEffect(() => {
    if (!email) {
      toast.error('No email found. Please request a password reset first.');
      navigate('/forgot-password', { replace: true });
    }
  }, [email, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!email) {
      toast.error('No email found, please try again.', { id: 'verify-otp' });
      navigate('/forgot-password', { replace: true });
      return;
    }

    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP', { id: 'verify-otp' });
      return;
    }

    toast.loading('Verifying OTP...', { id: 'verify-otp' });

    try {
      await verifyPasswordResetOtp(email, otp);
      toast.success('OTP verified successfully!', { id: 'verify-otp' });
      // Navigate to reset password page with email in state
      setTimeout(() => {
        navigate('/reset-password', { state: { email }, replace: true });
      }, 1000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'OTP verification failed', {
        id: 'verify-otp',
      });
    }
  };

  // Don't render if no email (will redirect)
  if (!email) {
    return null;
  }

  return (
    <div className="min-h-screen min-w-screen flex flex-col items-center justify-center bg-background">
      <div className="verify-container h-fit w-[320px]">
        <img src={logo} alt="TrackIt Logo" className="w-12 mb-5 mx-auto" />
        <h2 className="text-2xl font-bold mb-0.5 text-center">Verify OTP</h2>
        <p className="description text-center font-semibold text-muted-foreground mb-2">
          Enter the OTP sent to your email
        </p>
        <p className="description text-center text-sm text-muted-foreground mb-6">
          {email}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="otp" className="mb-2 block">
              OTP Code
            </Label>
            <Input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => {
                // Only allow numeric input
                const value = e.target.value.replace(/\D/g, '');
                setOtp(value);
              }}
              required
              className="w-full border-2 ring-0"
              disabled={isLoading}
              placeholder="Enter your OTP"
              autoComplete="off"
              maxLength={6}
              inputMode="numeric"
            />
          </div>
          {error && (
            <p className="text-expense w-full py-3 bg-expense/10 rounded-md font-semibold text-center text-sm">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full font-semibold"
            disabled={isLoading || otp.length !== 6}
            variant={'secondary'}
          >
            {isLoading ? 'Verifying...' : 'Verify OTP'}
          </Button>
        </form>
        <div className="mt-4 space-y-2">
          <p className="font-semibold text-center text-sm text-muted-foreground">
            <Link to="/forgot-password" className="text-primary underline">
              Resend OTP
            </Link>
          </p>
          <p className="font-semibold text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary underline">
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
