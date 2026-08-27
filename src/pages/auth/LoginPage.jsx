import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  authRoleSlug,
  homePathForRole,
  isRoleAllowedForPath,
  roleAccessHint,
} from '../../utils/homePathForRole';
import { clearSession } from '../../api/authSession';
import { getApiBase, apiRequest } from '../../api/client';
import AuthPageShell from './components/AuthPageShell';
import ForcePasswordResetModal from './components/ForcePasswordResetModal';
import { auth } from './styles/authClasses';

const BG_IMAGES = ['/1.jpg', '/2.jpg', '/3.jpg', '/4.jpg'];
const BG_INTERVAL_MS = 60_000;
const KOPANO_VERTEX_URL = 'https://kopanovertex.com/';

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function SignInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const [pendingUser, setPendingUser] = useState(null);
  const [forcePasswordOpen, setForcePasswordOpen] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const returnTo = (() => {
    const params = new URLSearchParams(location.search);
    const fromQuery = params.get('from');
    if (fromQuery) {
      try {
        return decodeURIComponent(fromQuery);
      } catch {
        return fromQuery;
      }
    }
    return location.state?.from;
  })();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('expired') === '1') {
      setLoginError('Your session has expired. Please sign in again.');
      return;
    }
    if (params.get('forbidden') === '1') {
      const role = location.state?.attemptedRole;
      const path = location.state?.attemptedPath;
      if (role) {
        setLoginError(`You do not have access to ${path || 'that page'}. ${roleAccessHint(role)}`);
      } else {
        setLoginError('You do not have access to that page. Sign in with the correct role.');
      }
    }
    const stored = (() => {
      try {
        return JSON.parse(localStorage.getItem('user') || 'null');
      } catch {
        return null;
      }
    })();
    if ((location.state?.forcePassword || stored?.must_change_password) && localStorage.getItem('accessToken')) {
      setPendingUser(stored);
      setForcePasswordOpen(true);
    }
  }, [location.search, location.state]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setBgIndex((i) => (i + 1) % BG_IMAGES.length);
    }, BG_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  function finishLogin(user) {
    const roleSlug = authRoleSlug(user);
    const defaultHome = homePathForRole(roleSlug);
    if (!defaultHome || !isRoleAllowedForPath(defaultHome, user)) {
      clearSession();
      setForcePasswordOpen(false);
      setPendingUser(null);
      setLoginError(roleSlug ? roleAccessHint(roleSlug) : roleAccessHint(''));
      return;
    }
    const forbidden = new URLSearchParams(location.search).get('forbidden') === '1';
    const useReturnTo =
      !forbidden && returnTo && returnTo.startsWith('/') && isRoleAllowedForPath(returnTo, user);
    navigate(useReturnTo ? returnTo : defaultHome, { replace: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoginError('');
    setSubmitting(true);
    const API_BASE = getApiBase();

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => ({}));

      if (res.ok && json.success && json.data?.user && json.data?.accessToken) {
        const { user, accessToken, refreshToken } = json.data;
        localStorage.setItem('accessToken', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));

        if (user.must_change_password) {
          setPendingUser(user);
          setForcePasswordOpen(true);
          return;
        }

        finishLogin(user);
        return;
      }

      setLoginError(json.message || 'Invalid credentials');
    } catch {
      setLoginError(
        'Cannot reach the server. Start the backend (port 5000), then sign in with your hospital account.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetPassword({ new_password, confirm_password }) {
    setPasswordSubmitting(true);
    try {
      await apiRequest('/api/v1/auth/set-password', {
        method: 'POST',
        body: JSON.stringify({ new_password, confirm_password }),
      });
      const nextUser = {
        ...(pendingUser || JSON.parse(localStorage.getItem('user') || '{}')),
        must_change_password: false,
      };
      localStorage.setItem('user', JSON.stringify(nextUser));
      setForcePasswordOpen(false);
      setPendingUser(null);
      finishLogin(nextUser);
    } finally {
      setPasswordSubmitting(false);
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
        <section className={auth.card} aria-labelledby="login-form-title">
          <h1 id="login-form-title" className={auth.cardTitle}>
            Welcome Back
          </h1>
          <p className={auth.cardSubtitle}>
            Sign in to manage your appointments and health records securely.
          </p>

          <form className={auth.form} onSubmit={handleSubmit} noValidate>
            <div className={auth.field}>
              <label htmlFor="login-email" className={auth.label}>
                Email Address
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                className={auth.input}
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className={auth.field}>
              <label htmlFor="login-password" className={auth.label}>
                Password
              </label>
              <div className={auth.passwordWrap}>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`${auth.input} pr-11`}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className={auth.passwordToggle}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className={auth.link}>
                Forgot password?
              </Link>
            </div>

            {loginError ? (
              <p role="alert" className={auth.error}>
                {loginError}
              </p>
            ) : null}

            <button type="submit" className={auth.submit} disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign In'}
              {!submitting ? <SignInIcon /> : null}
            </button>
          </form>

          <p className={auth.footer}>
            A digital dental solution by{' '}
            <a
              href={KOPANO_VERTEX_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={auth.footerLink}
            >
              Kopano-Vertex
            </a>
          </p>
        </section>
      </div>

      <ForcePasswordResetModal
        open={forcePasswordOpen}
        submitting={passwordSubmitting}
        onSubmit={handleSetPassword}
      />
    </AuthPageShell>
  );
}
