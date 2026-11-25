'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Organization, User, UserRole } from '@/types';
import { apiFetch, getStoredToken, setStoredToken } from './api';

interface RegisterInput {
  organizationName: string;
  organizationCode?: string;
  industry: string;
  address: string;
  baseTariffPerKwh: number;
  peakTariffPerKwh: number;
  carbonFactorKgPerKwh: number;
  name: string;
  email: string;
  password: string;
  jobTitle?: string;
}

interface AuthContextValue {
  user: User | null;
  organization: Organization | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  isAdmin: boolean;
  isFacilityManager: boolean;
  isDepartmentManager: boolean;
  isViewer: boolean;
  canManageHierarchy: boolean;
  canConfigureMeters: boolean;
  canCreateRecords: boolean;
  canManageAlerts: boolean;
  canManageUsers: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setOrganization(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiFetch<{ user: User; organization: Organization }>('/auth/me');
      setUser(res.data.user);
      setOrganization(res.data.organization);
    } catch {
      setStoredToken(null);
      setUser(null);
      setOrganization(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const login = async (email: string, password: string) => {
    const res = await apiFetch<{
      token: string;
      user: User;
      organization: Organization;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    setStoredToken(res.data.token);
    setUser(res.data.user);
    setOrganization(res.data.organization);
    router.push('/dashboard');
  };

  const register = async (input: RegisterInput) => {
    const res = await apiFetch<{
      token: string;
      user: User;
      organization: Organization;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    setStoredToken(res.data.token);
    setUser(res.data.user);
    setOrganization(res.data.organization);
    router.push('/dashboard');
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
    setOrganization(null);
    router.push('/login');
  };

  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  const role = user?.role;
  const isAdmin = role === 'org_admin';
  const isFacilityManager = role === 'facility_manager';
  const isDepartmentManager = role === 'department_manager';
  const isViewer = role === 'viewer';

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        refreshProfile,
        hasRole,
        isAdmin,
        isFacilityManager,
        isDepartmentManager,
        isViewer,
        canManageHierarchy: isAdmin,
        canConfigureMeters: isAdmin || isFacilityManager,
        canCreateRecords: isAdmin || isFacilityManager,
        canManageAlerts: isAdmin || isFacilityManager,
        canManageUsers: isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
