'use client';

import React, { useEffect, useState } from 'react';
import { Building2, Check, Moon, Save, Sun, User as UserIcon } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { formatRoleLabel } from '@/lib/formatters';
import { SectionCard, StatusBadge } from '@/components/ui';

export default function ProfileSettingsPage() {
  const { user, organization, isAdmin, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();

  const [profileForm, setProfileForm] = useState({
    name: '',
    jobTitle: '',
    phone: '',
    newPassword: '',
  });
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  const [orgForm, setOrgForm] = useState({
    name: '',
    industry: 'Commercial',
    address: '',
    contactEmail: '',
    contactPhone: '',
    baseTariffPerKwh: 0.14,
    peakTariffPerKwh: 0.22,
    carbonFactorKgPerKwh: 0.42,
  });
  const [orgSaved, setOrgSaved] = useState(false);
  const [orgSubmitting, setOrgSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        jobTitle: user.jobTitle || '',
        phone: user.phone || '',
        newPassword: '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (organization) {
      setOrgForm({
        name: organization.name || '',
        industry: organization.industry || 'Commercial',
        address: organization.address || '',
        contactEmail: organization.contactEmail || '',
        contactPhone: organization.contactPhone || '',
        baseTariffPerKwh: organization.baseTariffPerKwh ?? 0.14,
        peakTariffPerKwh: organization.peakTariffPerKwh ?? 0.22,
        carbonFactorKgPerKwh: organization.carbonFactorKgPerKwh ?? 0.42,
      });
    }
  }, [organization]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSubmitting(true);
    setProfileSaved(false);
    try {
      await apiFetch('/users/profile/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: profileForm.name,
          jobTitle: profileForm.jobTitle,
          phone: profileForm.phone,
          ...(profileForm.newPassword ? { newPassword: profileForm.newPassword } : {}),
        }),
      });
      setProfileForm((prev) => ({ ...prev, newPassword: '' }));
      await refreshProfile();
      setProfileSaved(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setOrgSubmitting(true);
    setOrgSaved(false);
    try {
      await apiFetch('/organizations/current', {
        method: 'PATCH',
        body: JSON.stringify(orgForm),
      });
      await refreshProfile();
      setOrgSaved(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update organization settings.');
    } finally {
      setOrgSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Profile Settings & Organization Preferences
        </h1>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Manage your personal account credentials, theme appearance, and organization electricity
          tariff rates.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Personal Profile Card */}
        <SectionCard
          title="Personal Account & Appearance"
          subtitle="Update your profile information, password, and Dark/Light mode preference"
        >
          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{user?.email}</p>
                <p className="text-[11px] text-slate-400">Authenticated Account Email</p>
              </div>
              {user && <StatusBadge status={formatRoleLabel(user.role)} variant="info" />}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, name: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Job Title
                </label>
                <input
                  type="text"
                  value={profileForm.jobTitle}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, jobTitle: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, phone: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  New Password (optional)
                </label>
                <input
                  type="password"
                  minLength={6}
                  value={profileForm.newPassword}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, newPassword: e.target.value })
                  }
                  placeholder="Leave blank to keep current"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Bonus Challenge: Dark Mode Preference */}
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Interface Theme (Bonus: Dark Mode)
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    theme === 'dark'
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-500'
                      : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" />
                  Industrial Dark Mode
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    theme === 'light'
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-600'
                      : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />
                  Daylight Mode
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {profileSaved ? (
                <span className="inline-flex items-center gap-1 text-emerald-500">
                  <Check className="h-4 w-4" /> Profile saved!
                </span>
              ) : (
                <span />
              )}
              <button
                type="submit"
                disabled={profileSubmitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {profileSubmitting ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </SectionCard>

        {/* Organization Information & Tariff Settings Card */}
        <SectionCard
          title="Organization Information & Electricity Tariffs"
          subtitle={
            isAdmin
              ? 'Editable by Organization Admin — controls cost ($) and carbon (kg CO2e) calculations'
              : 'Read-only view for non-admin roles'
          }
        >
          <form onSubmit={handleSaveOrganization} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Organization Name
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={orgForm.name}
                  onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Industry Sector
                </label>
                <select
                  disabled={!isAdmin}
                  value={orgForm.industry}
                  onChange={(e) =>
                    setOrgForm({
                      ...orgForm,
                      industry: e.target.value as typeof orgForm.industry,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Commercial">Commercial</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="University">University</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Technology">Technology</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Headquarters Address
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={orgForm.address}
                  onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Base Off-Peak Tariff ($/kWh)
                </label>
                <input
                  type="number"
                  step="0.01"
                  disabled={!isAdmin}
                  value={orgForm.baseTariffPerKwh}
                  onChange={(e) =>
                    setOrgForm({ ...orgForm, baseTariffPerKwh: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Peak Hours Tariff ($/kWh, 14:00–20:00)
                </label>
                <input
                  type="number"
                  step="0.01"
                  disabled={!isAdmin}
                  value={orgForm.peakTariffPerKwh}
                  onChange={(e) =>
                    setOrgForm({ ...orgForm, peakTariffPerKwh: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Carbon Grid Emission Factor (kg CO₂e per kWh)
                </label>
                <input
                  type="number"
                  step="0.01"
                  disabled={!isAdmin}
                  value={orgForm.carbonFactorKgPerKwh}
                  onChange={(e) =>
                    setOrgForm({
                      ...orgForm,
                      carbonFactorKgPerKwh: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center justify-between pt-2">
                {orgSaved ? (
                  <span className="inline-flex items-center gap-1 text-emerald-500">
                    <Check className="h-4 w-4" /> Organization settings updated!
                  </span>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  disabled={orgSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {orgSubmitting ? 'Updating...' : 'Update Organization Info'}
                </button>
              </div>
            )}
          </form>
        </SectionCard>
      </div>
    </div>
  );
}
