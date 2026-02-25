/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import logo from '../assets/trackit.svg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const { requestPasswordResetOtp, isLoading, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    // Normalize email (trim and lowercase)
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      toast.error('Please enter a valid email address', {
        id: 'forgot-password',
      });
      return;
    }

    toast.loading('Checking email and sending OTP...', {
      id: 'forgot-password',
    });

    try {
      await requestPasswordResetOtp(normalizedEmail);
      toast.success('OTP sent to your email successfully!', {
        id: 'forgot-password',
      });
      navigate('/verify-forgot-password', {
        state: { email: normalizedEmail },
        replace: true,
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send OTP', {
        id: 'forgot-password',
      });
    }
  };

  return (
    <div className="min-h-screen min-w-screen flex flex-col items-center justify-center bg-background">
      <div className="login-container h-fit w-[320px]">
        <img src={logo} alt="TrackIt Logo" className="w-12 mb-5 mx-auto" />
        <h2 className="text-2xl font-bold mb-0.5 text-center">
          Forgot Password?
        </h2>
        <p className="description text-center font-semibold text-muted-foreground mb-6">
          Enter registered email to receive an OTP.
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
          <Button
            type="submit"
            className="w-full font-semibold"
            disabled={isLoading}
            variant={'secondary'}
          >
            {isLoading ? 'Sending OTP...' : 'Send OTP'}
          </Button>
        </form>
        <p className="mt-4 font-semibold text-center text-sm text-muted-foreground">
          Remember your password?{' '}
          <Link to="/login" className="text-primary underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
