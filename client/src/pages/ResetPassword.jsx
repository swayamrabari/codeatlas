import { useEffect, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../services/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import LogoIcon from '../assets/logo';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const emailFromQuery = searchParams.get('email') || '';

  const [email] = useState(emailFromQuery || location.state?.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password', { replace: true });
    }
  }, []);

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
    setCode(normalized);
    setError('');
    if (otpVerified) {
      setOtpVerified(false);
      setPassword('');
      setConfirmPassword('');
      setSuccess('OTP changed. Please verify again.');
    }
  };

  const handleResend = async () => {
    if (!email || resendCooldown > 0) return;

    setResendLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await authAPI.forgotPassword(email);
      setSuccess(data?.message || 'A new reset code has been sent.');
      setResendCooldown(60);
      setCode('');
      setOtpVerified(false);
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend reset code.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const fullCode = code.trim();

    if (fullCode.length !== 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    if (!otpVerified) {
      setOtpVerifying(true);

      try {
        const data = await authAPI.verifyResetCode(email, fullCode);
        if (data?.verified) {
          setOtpVerified(true);
          setSuccess(
            data?.message ||
              'OTP verified successfully. You can now set a new password.',
          );
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to verify reset code.');
      } finally {
        setOtpVerifying(false);
      }

      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const data = await authAPI.resetPassword(email, fullCode, password);
      setSuccess(data?.message || 'Password reset successful.');
      setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password.');
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
          <h1 className="text-2xl font-bold text-white">Reset password</h1>
          <p className="text-base text-muted-foreground font-semibold">
            Verify OTP first, then set your new password.
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
            <Label className="block text-sm font-medium text-white">
              OTP Code
            </Label>
            <Input
              value={code}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Enter 6-digit OTP"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              className="text-center font-semibold"
              readOnly={otpVerified}
            />
          </div>

          {otpVerified && (
            <>
              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="block text-sm font-medium text-white"
                >
                  New password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    className="font-semibold pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={otpVerified}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-white"
                >
                  Confirm password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    className="font-semibold pr-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={otpVerified}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    aria-label={
                      showConfirmPassword
                        ? 'Hide confirm password'
                        : 'Show confirm password'
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          <Button
            type="submit"
            variant={loading || otpVerifying ? 'disabled' : 'default'}
            className="w-full flex items-center justify-center gap-2 font-semibold mt-5"
          >
            {(loading || otpVerifying) && <Spinner className="h-4 w-4" />}
            <span>
              {otpVerified
                ? loading
                  ? 'Resetting...'
                  : 'Reset password'
                : otpVerifying
                  ? 'Verifying OTP...'
                  : 'Verify OTP'}
            </span>
          </Button>

          {otpVerified && (
            <p className="text-sm text-emerald-400 font-semibold text-center mt-2">
              OTP verified. You can now set a new password.
            </p>
          )}

          <p className="text-base text-muted-foreground font-semibold text-center mt-4">
            Didn't receive code?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={!email || resendCooldown > 0 || resendLoading}
              className="text-primary font-medium hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {resendLoading
                ? 'Sending...'
                : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : 'Resend code'}
            </button>
          </p>

          <p className="text-base text-muted-foreground font-semibold text-center mt-2">
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
