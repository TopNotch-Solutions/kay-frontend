import { useState } from 'react';
import { auth } from '../styles/authClasses';

/**
 * Blocking modal after first login with a temporary password.
 */
export default function ForcePasswordResetModal({ open, onSubmit, submitting }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!password || !confirm) {
      setError('Enter and confirm your new password.');
      return;
    }
    if (password !== confirm) {
      setError('Password and confirm password do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    try {
      await onSubmit({ new_password: password, confirm_password: confirm });
    } catch (err) {
      setError(err.message || 'Could not update password.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm"
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="force-password-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="force-password-title" className="text-lg font-bold text-slate-900">
          Set a new password
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          This is your first sign-in. Choose a new password to continue.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="force-new-password" className={auth.label}>
              New password
            </label>
            <input
              id="force-new-password"
              type="password"
              className={auth.input}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div>
            <label htmlFor="force-confirm-password" className={auth.label}>
              Confirm password
            </label>
            <input
              id="force-confirm-password"
              type="password"
              className={auth.input}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {error ? (
            <p role="alert" className={auth.error}>
              {error}
            </p>
          ) : null}
          <button type="submit" className={auth.submit} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save password and continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
