'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Edit3, Plus, Shield, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { Building, Department, PaginationMeta, User, UserRole } from '@/types';
import { formatDateTime, formatRoleLabel } from '@/lib/formatters';
import { RoleGuard } from '@/components/layout/RoleGuard';
import {
  EmptyState,
  ErrorBanner,
  LoadingSkeleton,
  Modal,
  PaginationBar,
  SearchInput,
  SectionCard,
  StatusBadge,
} from '@/components/ui';

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: 'Password123!',
    role: 'facility_manager' as UserRole,
    jobTitle: '',
    phone: '',
    assignedBuildingIds: [] as string[],
    assignedDepartmentIds: [] as string[],
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<Building[]>('/buildings', { params: { limit: 100 } }),
      apiFetch<Department[]>('/departments', { params: { limit: 200 } }),
    ])
      .then(([bRes, dRes]) => {
        setBuildings(bRes.data || []);
        setDepartments(dRes.data || []);
      })
      .catch(() => {});
  }, []);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await apiFetch<User[]>('/users', {
        params: {
          page,
          limit: 20,
          role: roleFilter || undefined,
          q: debouncedSearch || undefined,
        },
      });
      setUsers(res.data || []);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organization users.');
    } finally {
      setIsLoading(false);
    }
  }, [page, roleFilter, debouncedSearch]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const openCreateModal = () => {
    setEditingUser(null);
    setForm({
      name: '',
      email: '',
      password: 'Password123!',
      role: 'facility_manager',
      jobTitle: 'Facility Energy Engineer',
      phone: '',
      assignedBuildingIds: [],
      assignedDepartmentIds: [],
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      jobTitle: u.jobTitle || '',
      phone: u.phone || '',
      assignedBuildingIds: (u.assignedBuildingIds || []).map(String),
      assignedDepartmentIds: (u.assignedDepartmentIds || []).map(String),
      isActive: u.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingUser) {
        await apiFetch(`/users/${editingUser._id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: form.name,
            role: form.role,
            jobTitle: form.jobTitle,
            phone: form.phone,
            assignedBuildingIds: form.assignedBuildingIds,
            assignedDepartmentIds: form.assignedDepartmentIds,
            isActive: form.isActive,
            ...(form.password ? { password: form.password } : {}),
          }),
        });
      } else {
        await apiFetch('/users', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setModalOpen(false);
      await loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save user.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleArrayId = (list: string[], id: string): string[] =>
    list.includes(id) ? list.filter((i) => i !== id) : [...list, id];

  return (
    <RoleGuard allowedRoles={['org_admin']} showBanner>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Organization User & Permission Management
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Manage role assignments (Organization Admin, Facility Manager, Department Manager,
              Viewer) and authorized building/department scopes.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            Invite / Add User
          </button>
        </div>

        <SectionCard>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Search users by name, email, or title..."
              className="w-full sm:w-80"
            />

            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">All Roles</option>
              <option value="org_admin">Organization Admin</option>
              <option value="facility_manager">Facility Manager</option>
              <option value="department_manager">Department Manager</option>
              <option value="viewer">Viewer (Read-Only)</option>
            </select>
          </div>

          {error && <ErrorBanner message={error} onRetry={loadUsers} />}

          {isLoading ? (
            <LoadingSkeleton rows={5} />
          ) : users.length === 0 ? (
            <EmptyState title="No users found" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <th className="pb-2.5 font-semibold">User</th>
                      <th className="pb-2.5 font-semibold">Role</th>
                      <th className="pb-2.5 font-semibold">Job Title</th>
                      <th className="pb-2.5 font-semibold">Authorized Scopes</th>
                      <th className="pb-2.5 font-semibold">Status</th>
                      <th className="pb-2.5 font-semibold">Last Login</th>
                      <th className="pb-2.5 text-right font-semibold">Edit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {users.map((u) => (
                      <tr
                        key={u._id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="py-3">
                          <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
                          <p className="font-mono text-[11px] text-slate-400">{u.email}</p>
                        </td>
                        <td className="py-3">
                          <StatusBadge status={formatRoleLabel(u.role)} variant="info" />
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-300">
                          {u.jobTitle || '—'}
                        </td>
                        <td className="py-3 text-slate-500 dark:text-slate-400">
                          {u.role === 'org_admin' ? (
                            <span className="text-emerald-500">All Organization Resources</span>
                          ) : (
                            <span>
                              {u.assignedBuildingIds?.length || 0} Bldg(s) ·{' '}
                              {u.assignedDepartmentIds?.length || 0} Dept(s)
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          <StatusBadge
                            status={u.isActive ? 'Active' : 'Disabled'}
                            variant={u.isActive ? 'success' : 'danger'}
                          />
                        </td>
                        <td className="py-3 text-slate-500 dark:text-slate-400">
                          {formatDateTime(u.lastLoginAt)}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <PaginationBar meta={meta} onPageChange={setPage} />
            </>
          )}
        </SectionCard>

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingUser ? `Edit User & Permissions: ${editingUser.name}` : 'Create Organization User'}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Role *
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="org_admin">Organization Admin</option>
                  <option value="facility_manager">Facility Manager</option>
                  <option value="department_manager">Department Manager</option>
                  <option value="viewer">Viewer (Read-Only)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Job Title
                </label>
                <input
                  type="text"
                  value={form.jobTitle}
                  onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  {editingUser ? 'Reset Password (optional)' : 'Initial Password *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editingUser ? 'Leave blank to keep existing' : 'Password123!'}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {form.role !== 'org_admin' && (
              <div className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Authorized Building Scopes (Leave empty for all buildings)
                </p>
                <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                  {buildings.map((b) => {
                    const checked = form.assignedBuildingIds.includes(b._id);
                    return (
                      <button
                        key={b._id}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            assignedBuildingIds: toggleArrayId(
                              form.assignedBuildingIds,
                              b._id
                            ),
                          })
                        }
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium ${
                          checked
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-500'
                            : 'border-slate-200 text-slate-500 dark:border-slate-700'
                        }`}
                      >
                        {b.name}
                      </button>
                    );
                  })}
                </div>

                {form.role === 'department_manager' && (
                  <>
                    <p className="pt-2 font-semibold text-slate-800 dark:text-slate-200">
                      Authorized Department Scopes (Department Manager Restriction)
                    </p>
                    <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                      {departments.map((d) => {
                        const checked = form.assignedDepartmentIds.includes(d._id);
                        return (
                          <button
                            key={d._id}
                            type="button"
                            onClick={() =>
                              setForm({
                                ...form,
                                assignedDepartmentIds: toggleArrayId(
                                  form.assignedDepartmentIds,
                                  d._id
                                ),
                              })
                            }
                            className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium ${
                              checked
                                ? 'border-cyan-500 bg-cyan-500/20 text-cyan-500'
                                : 'border-slate-200 text-slate-500 dark:border-slate-700'
                            }`}
                          >
                            {d.code} — {d.name}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </RoleGuard>
  );
}
