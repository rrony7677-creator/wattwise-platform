'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import { DemoAccount } from '@/types';
import { formatRoleLabel } from '@/lib/formatters';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@apex.wattwise.io');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [loadingDemos, setLoadingDemos] = useState(true);
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('ALL');

  useEffect(() => {
    let mounted = true;
    async function loadDemos() {
      try {
        const res = await apiFetch<DemoAccount[]>('/auth/demo-accounts');
        if (mounted) {
          setDemoAccounts(res.data || []);
        }
      } catch {
        // Fallback demo accounts if backend is not yet reachable
      } finally {
        if (mounted) setLoadingDemos(false);
      }
    }
    void loadDemos();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword(acc.password || 'Password123!');
    setError('');
    setIsSubmitting(true);
    try {
      await login(acc.email, acc.password || 'Password123!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const orgCodes = Array.from(new Set(demoAccounts.map((d) => d.organizationCode)));
  const filteredDemos =
    selectedOrgFilter === 'ALL'
      ? demoAccounts
      : demoAccounts.filter((d) => d.organizationCode === selectedOrgFilter);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-12">
        {/* Left Column: Sign In Form */}
        <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:col-span-5 lg:border-r lg:border-slate-800/80">
          <div className="mx-auto w-full max-w-md">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">
                  Watt<span className="text-emerald-400">Wise</span>
                </h1>
                <p className="text-xs text-slate-400">
                  Smart Energy Consumption Intelligence Platform
                </p>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-bold text-white">Sign in to your account</h2>
              <p className="mt-1 text-xs text-slate-400">
                Monitor buildings, smart meters, time-series usage, and automated alerts.
              </p>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Work Email Address
                </label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@apex.wattwise.io"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 pr-4 pl-10 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">Password</label>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 pr-4 pl-10 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-cyan-500 disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Signing in...' : 'Sign In to Dashboard'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-400">
              Need to onboard a new organization?{' '}
              <Link
                href="/register"
                className="font-semibold text-emerald-400 hover:text-emerald-300"
              >
                Register Organization & Admin
              </Link>
            </p>
          </div>
        </div>

        {/* Right Column: One-Click Multi-Org & Multi-Role Demo Evaluator */}
        <div className="flex flex-col justify-center bg-slate-900/50 px-6 py-12 sm:px-12 lg:col-span-7">
          <div className="mx-auto w-full max-w-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  Instant Role & Multi-Tenant Evaluator
                </span>
                <h3 className="mt-2 text-lg font-bold text-white">
                  One-Click Demo Role Switcher
                </h3>
                <p className="text-xs text-slate-400">
                  Click any seeded account below to test role-based permissions across the 3
                  seeded organizations (Password: <code className="text-emerald-400">Password123!</code>).
                </p>
              </div>
            </div>

            {/* Organization Filter Tabs */}
            {orgCodes.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedOrgFilter('ALL')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedOrgFilter === 'ALL'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  All Organizations ({demoAccounts.length})
                </button>
                {orgCodes.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setSelectedOrgFilter(code)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      selectedOrgFilter === code
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            )}

            {loadingDemos ? (
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-28 animate-pulse rounded-xl border border-slate-800 bg-slate-900"
                  />
                ))}
              </div>
            ) : (
              <div className="mt-5 grid max-h-[540px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                {filteredDemos.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void handleQuickDemoLogin(acc)}
                    className="group flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-4 text-left transition-all hover:border-emerald-500/60 hover:bg-slate-800/80"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          <Building2 className="h-3 w-3" />
                          {acc.organizationCode}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-400">
                          <ShieldCheck className="h-3 w-3" />
                          {formatRoleLabel(acc.role)}
                        </span>
                      </div>
                      <p className="mt-2.5 text-sm font-bold text-white group-hover:text-emerald-400">
                        {acc.name}
                      </p>
                      <p className="text-[11px] text-slate-400">{acc.organizationName}</p>
                      <p className="mt-1.5 line-clamp-2 text-[11px] text-slate-500">
                        {acc.scopeDescription}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px] text-slate-400">
                      <span className="truncate font-mono">{acc.email}</span>
                      <span className="font-semibold text-emerald-400 group-hover:translate-x-0.5">
                        Sign in →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
