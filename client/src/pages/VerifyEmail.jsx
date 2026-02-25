import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import LogoIcon from '../assets/logo';

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
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) navigate('/register', { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      setCode(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
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
      navigate('/');
    } catch (err) {
      const msg =
        err.response?.data?.error || 'Verification failed. Please try again.';
      setError(msg);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
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
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
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
          <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="h-14 w-11 rounded-lg bg-zinc-900 border border-zinc-800 text-center text-xl font-bold text-white outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-colors caret-transparent"
                autoComplete="one-time-code"
              />
            ))}
          </div>

          <Button
            type="submit"
            variant={loading || code.join('').length !== 6 ? 'disabled' : 'default'}
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
