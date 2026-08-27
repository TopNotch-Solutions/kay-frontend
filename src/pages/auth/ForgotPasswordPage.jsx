import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getApiBase } from '../../api/client';
import AuthPageShell from './components/AuthPageShell';
import { auth } from './styles/authClasses';

const BG_IMAGES = ['/1.jpg', '/2.jpg', '/3.jpg', '/4.jpg'];
const BG_INTERVAL_MS = 60_000;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [bgIndex, setBgIndex] = useState(0);
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setBgIndex((i) => (i + 1) % BG_IMAGES.length);
    }, BG_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  async function requestOtp(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      const res = await fetch(`${getApiBase()}/api/v1/auth/forgot-password/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Could not send OTP.');
      }
      setOtpSent(true);
      setInfo(json.message || 'OTP sent to your cellphone.');
    } catch (err) {
      setError(err.message || 'Could not send OTP.');
    } finally {
      setSubmitting(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Password and confirm password do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${getApiBase()}/api/v1/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          otp,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Could not reset password.');
      }
      setInfo(json.message || 'Password updated. You can sign in now.');
      window.setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err) {
      setError(err.message || 'Could not reset password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageShell>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {BG_IMAGES.map((src, i) => (
          <div
            key={src}
            className={auth.bgLayer}
            style={{
              backgroundImage: `url(${src})`,
              opacity: i === bgIndex ? 1 : 0,
              filter: 'blur(2px)',
              transform: 'scale(1.03)',
            }}
          />
        ))}
        <div className={auth.bgScrim} />
      </div>

      <div className={auth.stage}>
        <section className={auth.card} aria-labelledby="forgot-password-title">
          <h1 id="forgot-password-title" className={auth.cardTitle}>
            Forgot password
          </h1>
          <p className={auth.cardSubtitle}>
            Enter your cellphone number to receive an OTP. You have 3 chances per day.
          </p>

          {!otpSent ? (
            <form className={auth.form} onSubmit={requestOtp}>
              <div className={auth.field}>
                <label htmlFor="forgot-phone" className={auth.label}>
                  Cellphone number
                </label>
                <input
                  id="forgot-phone"
                  type="tel"
                  className={auth.input}
                  placeholder="e.g. 0812345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoComplete="tel"
                />
              </div>

              {error ? (
                <p role="alert" className={auth.error}>
                  {error}
                </p>
              ) : null}
              {info ? (
                <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
                  {info}
                </p>
              ) : null}

              <button type="submit" className={auth.submit} disabled={submitting}>
                {submitting ? 'Sending OTP…' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form className={auth.form} onSubmit={resetPassword}>
              <div className={auth.field}>
                <label htmlFor="forgot-otp" className={auth.label}>
                  OTP
                </label>
                <input
                  id="forgot-otp"
                  type="text"
                  inputMode="numeric"
                  className={auth.input}
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  autoComplete="one-time-code"
                />
              </div>
              <div className={auth.field}>
                <label htmlFor="forgot-new-password" className={auth.label}>
                  New password
                </label>
                <input
                  id="forgot-new-password"
                  type="password"
                  className={auth.input}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className={auth.field}>
                <label htmlFor="forgot-confirm-password" className={auth.label}>
                  Confirm password
                </label>
                <input
                  id="forgot-confirm-password"
                  type="password"
                  className={auth.input}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              {error ? (
                <p role="alert" className={auth.error}>
                  {error}
                </p>
              ) : null}
              {info ? (
                <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
                  {info}
                </p>
              ) : null}

              <button type="submit" className={auth.submit} disabled={submitting}>
                {submitting ? 'Updating…' : 'Reset password'}
              </button>
              <button
                type="button"
                className="w-full text-sm font-semibold text-teal-700 hover:underline"
                disabled={submitting}
                onClick={() => {
                  setOtpSent(false);
                  setOtp('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setError('');
                  setInfo('');
                }}
              >
                Use a different cellphone number
              </button>
            </form>
          )}

          <p className={auth.footer}>
            <Link to="/login" className={auth.footerLink}>
              Back to login
            </Link>
          </p>
        </section>
      </div>
    </AuthPageShell>
  );
}
