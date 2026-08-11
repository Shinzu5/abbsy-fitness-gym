"use client";

import { FormEvent, useEffect, useState } from "react";
import Alert from "@/components/Alert";
import { useAuth } from "@/components/AuthProvider";
import ThemeToggle from "@/components/ThemeToggle";

const REMEMBER_KEY = "abbsy-remember-username";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setUsername(saved);
        setRemember(true);
      }
    } catch {
      // ignore
    }
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      setSubmitting(true);
      await login(username, password);
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, username.trim());
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        // ignore
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid username or password"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg" aria-hidden="true" />
      <div className="login-topbar">
        <ThemeToggle />
      </div>

      <div className="login-stack">
        <div className="login-hero-brand">
          <div className="login-athlete" aria-hidden="true">
            <svg viewBox="0 0 160 140" className="login-athlete-svg">
              <defs>
                <linearGradient id="abbsyGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f5e6a8" />
                  <stop offset="40%" stopColor="#d4af37" />
                  <stop offset="100%" stopColor="#8a6a12" />
                </linearGradient>
              </defs>
              <circle cx="80" cy="22" r="14" fill="url(#abbsyGold)" />
              <path
                fill="url(#abbsyGold)"
                d="M52 42c8-6 20-8 28-8s20 2 28 8l8 10-12 4-6-6c-4-3-10-4-18-4s-14 1-18 4l-6 6-12-4z"
              />
              <path
                fill="url(#abbsyGold)"
                d="M44 54h18l8 34h-14zm54 0h18l-12 34h-14z"
              />
              <path
                fill="url(#abbsyGold)"
                d="M66 56h28v38c0 8-6 14-14 14s-14-6-14-14z"
              />
              <rect x="18" y="48" width="124" height="8" rx="3" fill="url(#abbsyGold)" />
              <rect x="8" y="42" width="14" height="20" rx="3" fill="url(#abbsyGold)" />
              <rect x="138" y="42" width="14" height="20" rx="3" fill="url(#abbsyGold)" />
              <path
                fill="url(#abbsyGold)"
                d="M70 108h20l6 22H64zm-18 0 10-14h12l-8 14zm56 0-10-14H86l8 14z"
              />
            </svg>
          </div>
          <h1 className="login-hero-title">ABBSY</h1>
          <div className="login-hero-line">
            <span />
            <p>FITNESS GYM</p>
            <span />
          </div>
        </div>

        <div className="login-card">
          <div className="login-card-header">
            <p className="login-welcome-soft">Welcome to</p>
            <h2 className="login-card-title">ABBSY FITNESS GYM</h2>
            <div className="login-hero-line login-hero-line-sm">
              <span />
              <p>STRONGER TOGETHER</p>
              <span />
            </div>
          </div>

          <Alert type="error" message={error} />

          <form className="login-form" onSubmit={onSubmit}>
            <label className="login-field">
              <span className="login-label">User Name</span>
              <div className="login-input-wrap">
                <span className="login-input-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path
                      fill="currentColor"
                      d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5z"
                    />
                  </svg>
                </span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                  required
                />
              </div>
            </label>

            <label className="login-field">
              <span className="login-label">Password</span>
              <div className="login-input-wrap">
                <span className="login-input-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path
                      fill="currentColor"
                      d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2zm-7-2a2 2 0 0 1 4 0v2h-4zm7 12H7v-8h10z"
                    />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-eye"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    {showPassword ? (
                      <path
                        fill="currentColor"
                        d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 5-5 5 5 0 0 1-5 5zm0-8a3 3 0 1 0 3 3 3 3 0 0 0-3-3z"
                      />
                    ) : (
                      <path
                        fill="currentColor"
                        d="M2 4.3 3.3 3l18 18-1.3 1.3-3.1-3.1A12.6 12.6 0 0 1 12 19c-7 0-10-7-10-7a18.4 18.4 0 0 1 5.2-5.5zm7.1 7.1A3 3 0 0 0 12 15a3 3 0 0 0 2.9-2.3zM12 5c7 0 10 7 10 7a18.7 18.7 0 0 1-3.7 4.3l-2.1-2.1A5 5 0 0 0 9.8 7.8L7.6 5.6A12.3 12.3 0 0 1 12 5z"
                      />
                    )}
                  </svg>
                </button>
              </div>
            </label>

            <label className="login-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Remember Me</span>
            </label>

            <button type="submit" className="login-submit" disabled={submitting}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M10 17v-3H3v-4h7V7l5 5zm9-13H11v2h8v14h-8v2h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"
                />
              </svg>
              {submitting ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="login-motto">DISCIPLINE • CONSISTENCY • RESULTS</p>
        </div>
      </div>
    </div>
  );
}
