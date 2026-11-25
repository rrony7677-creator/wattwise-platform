'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, Lock, Mail, User, Zap } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    organizationName: '',
    organizationCode: '',
    industry: 'Commercial',
    address: '',
    baseTariffPerKwh: 0.14,
    peakTariffPerKwh: 0.22,
    carbonFactorKgPerKwh: 0.42,
    name: '',
    email: '',
    password: '',
    jobTitle: 'Organization Administrator',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await register(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white">
                Register Organization on Watt<span className="text-emerald-400">Wise</span>
              </h1>
              <p className="text-xs text-slate-400">
                Create a multi-building energy intelligence workspace & Organization Admin account
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
          >
            Back to Login →
          </Link>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Organization Details */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-400 uppercase">
              <Building2 className="h-4 w-4" />
              1. Organization Profile & Tariff Configuration
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.organizationName}
                  onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                  placeholder="Solaria Industrial Group"
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Organization Code (Optional)
                </label>
                <input
                  type="text"
                  value={form.organizationCode}
                  onChange={(e) =>
                    setForm({ ...form, organizationCode: e.target.value.toUpperCase() })
                  }
                  placeholder="SOLARIA-01"
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white uppercase focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Industry *</label>
                <select
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="Commercial">Commercial Buildings</option>
                  <option value="Manufacturing">Manufacturing & Factories</option>
                  <option value="University">University & Academic Campus</option>
                  <option value="Healthcare">Healthcare & Hospital Network</option>
                  <option value="Technology">Data Centers & Technology</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Headquarters Address *
                </label>
                <input
                  type="text"
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="500 Clean Tech Way, Austin, TX"
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400">
                    Base Tariff ($/kWh)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={form.baseTariffPerKwh}
                    onChange={(e) =>
                      setForm({ ...form, baseTariffPerKwh: Number(e.target.value) })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400">
                    Peak Tariff ($/kWh)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={form.peakTariffPerKwh}
                    onChange={(e) =>
                      setForm({ ...form, peakTariffPerKwh: Number(e.target.value) })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400">
                    Carbon (kg CO₂/kWh)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={form.carbonFactorKgPerKwh}
                    onChange={(e) =>
                      setForm({ ...form, carbonFactorKgPerKwh: Number(e.target.value) })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Administrator Account */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-cyan-400 uppercase">
              <User className="h-4 w-4" />
              2. Organization Admin Credentials
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-300">Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Alex Rivera"
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Job Title</label>
                <input
                  type="text"
                  value={form.jobTitle}
                  onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                  placeholder="VP of Sustainability"
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Work Email *</label>
                <div className="relative mt-1">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="alex@solaria.io"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2 pr-3 pl-9 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Password (min 6 chars) *
                </label>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2 pr-3 pl-9 text-sm text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-cyan-500 disabled:opacity-50"
          >
            <span>
              {isSubmitting
                ? 'Creating Organization & Admin...'
                : 'Complete Registration & Launch Dashboard'}
            </span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
