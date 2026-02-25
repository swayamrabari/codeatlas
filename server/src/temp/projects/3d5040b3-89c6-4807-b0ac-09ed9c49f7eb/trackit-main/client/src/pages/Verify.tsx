/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import logo from '../assets/trackit.svg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Verify() {
  const [otp, setOtp] = useState('');
  const { verifyOtp, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      navigate('/register');
    }
  }, [email, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    toast.loading('Verifying...', { id: 'verify' });

    if (!email) {
      toast.error('No email found, please register again.', { id: 'verify' });
      navigate('/register');
      return;
    }

    try {
      await verifyOtp(email, otp);
      toast.success('Email verified successfully!', { id: 'verify' });
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Verification Failed');
    }
  };

  return (
    <div className="min-h-screen min-w-screen flex flex-col items-center justify-center bg-background">
      <div className="verify-container h-fit w-[320px]">
        <img src={logo} alt="TrackIt Logo" className="w-12 mb-5 mx-auto" />
        <h2 className="text-2xl font-bold mb-0.5 text-center">
          Verify your Email
        </h2>
        <p className="description text-center font-semibold text-muted-foreground mb-6">
          Enter the OTP sent to your email
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="otp" className="mb-2 block">
              OTP
            </Label>
            <Input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              className="w-full border-2 ring-0"
              disabled={isLoading}
              placeholder="Enter your OTP"
              autoComplete="off"
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
            disabled={isLoading}
            variant={'secondary'}
            data-testid="verify-button"
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </Button>
        </form>
        <p className="mt-4 font-semibold text-center text-sm text-muted-foreground">
          Didn't receive an OTP?{' '}
          <Link to="/register" className="text-primary underline">
            Register again
          </Link>
        </p>
      </div>
    </div>
  );
}
