import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import LogoIcon from '../assets/logo';
import { Input } from '@/components/ui/input';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!email) navigate('/register', { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (value) => {
    const normalized = String(value || '')
      .replace(/\D/g, '')
      .slice(0, 6);
    setCode(normalized.split(''));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullCode = code.join('');

    if (fullCode.length !== 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await authAPI.verifyEmail(email, fullCode);
      login(data.token, data.user);
      navigate(data?.user?.isAdmin ? '/admin' : '/dashboard');
    } catch (err) {
      const msg =
        err.response?.data?.error || 'Verification failed. Please try again.';
      setError(msg);
      setCode([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendLoading(true);
    setError('');
    setSuccess('');

    try {
      await authAPI.resendCode(email);
      setSuccess('A new code has been sent to your email.');
      setResendCooldown(60);
      setCode([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code.');
    } finally {
      setResendLoading(false);
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
          <h1 className="text-2xl font-bold text-white">Check your email</h1>
          <p className="text-base text-muted-foreground font-semibold">
            We sent a 6-digit code to{' '}
            <span className="text-white font-medium">{email}</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
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

          {/* OTP Inputs */}
          <Input
            value={code.join('')}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Enter 6-digit code"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            className="text-center font-semibold"
          />

          <Button
            type="submit"
            variant={
              loading || code.join('').length !== 6 ? 'disabled' : 'default'
            }
            className="w-full flex items-center justify-center gap-2 font-semibold"
          >
            {loading && <Spinner className="h-4 w-4" />}
            <span>{loading ? 'Verifying...' : 'Verify email'}</span>
          </Button>
        </form>

        {/* Resend */}
        <p className="text-base text-muted-foreground font-semibold text-center mt-4">
          Didn't receive the code?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || resendLoading}
            className="text-primary font-medium hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {resendLoading
              ? 'Sending...'
              : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : 'Resend code'}
          </button>
        </p>
      </div>
    </div>
  );
}
