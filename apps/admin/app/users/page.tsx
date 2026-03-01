'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus, Trash2, Shield, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../lib/api';
import { Sidebar } from '../../components/Sidebar';

export default function UsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'USER' as 'USER' | 'ADMIN' });
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validateForm() {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    else if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
    if (!form.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Invalid email address';
    if (!form.password) errors.password = 'Password is required';
    else if (form.password.length < 6) errors.password = 'Password must be at least 6 characters';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, search],
    queryFn: async () => (await adminApi.get('/admin/users', { params: { page, limit: 20, search: search || undefined } })).data,
  });

  const createUser = useMutation({
    mutationFn: (dto: typeof form) => adminApi.post('/admin/users', dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); setShowModal(false); setForm({ name: '', email: '', password: '', role: 'USER' }); setFormError(''); setFieldErrors({}); toast.success('User created successfully'); },
    onError: (e: any) => { setFormError(e?.response?.data?.message || 'Failed to create user'); toast.error('Failed to create user'); },
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/admin/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success('User deleted'); },
    onError: () => toast.error('Failed to delete user'),
  });

  const toggleRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'USER' | 'ADMIN' }) =>
      adminApi.patch(`/admin/users/${id}/role`, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success('Role updated'); },
    onError: () => toast.error('Failed to update role'),
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Users</h1>
            <p className="text-slate-500 text-sm mt-1">{data?.total ?? 0} total users</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            <UserPlus size={16} />
            Create User
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-4 text-slate-600 font-semibold">User</th>
                <th className="text-left px-6 py-4 text-slate-600 font-semibold">Language</th>
                <th className="text-left px-6 py-4 text-slate-600 font-semibold">Role</th>
                <th className="text-left px-6 py-4 text-slate-600 font-semibold">Reviews</th>
                <th className="text-left px-6 py-4 text-slate-600 font-semibold">Photos</th>
                <th className="text-left px-6 py-4 text-slate-600 font-semibold">Joined</th>
                <th className="text-left px-6 py-4 text-slate-600 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">Loading…</td></tr>
              ) : data?.users?.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">No users found</td></tr>
              ) : (
                data?.users?.map((user: any) => (
                  <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
                          {user.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{user.name || '(no name)'}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 uppercase text-xs font-bold">{user.language}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{user._count?.reviews ?? 0}</td>
                    <td className="px-6 py-4 text-slate-600">{user._count?.photos ?? 0}</td>
                    <td className="px-6 py-4 text-slate-400 text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          title={user.role === 'ADMIN' ? 'Remove admin' : 'Make admin'}
                          onClick={() => toggleRole.mutate({ id: user.id, role: user.role === 'ADMIN' ? 'USER' : 'ADMIN' })}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.role === 'ADMIN'
                              ? 'text-purple-600 hover:bg-purple-50'
                              : 'text-slate-400 hover:bg-slate-100'
                          }`}
                        >
                          {user.role === 'ADMIN' ? <ShieldOff size={15} /> : <Shield size={15} />}
                        </button>
                        <button
                          title="Delete user"
                          onClick={() => { if (confirm(`Delete ${user.email}?`)) deleteUser.mutate(user.id); }}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {data && data.pages > 1 && (
            <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100">
              <p className="text-xs text-slate-400">Page {page} of {data.pages}</p>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Previous</button>
                <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next</button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Create User</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Name</label>
                <input
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${fieldErrors.name ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' }); }}
                />
                {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Email</label>
                <input
                  type="email"
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${fieldErrors.email ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                  placeholder="user@example.com"
                  value={form.email}
                  onChange={(e) => { setForm({ ...form, email: e.target.value }); if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' }); }}
                />
                {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Password</label>
                <input
                  type="password"
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${fieldErrors.password ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' }); }}
                />
                {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Role</label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as 'USER' | 'ADMIN' })}
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                  {formError}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); setFormError(''); setFieldErrors({}); }}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={createUser.isPending}
                onClick={() => { if (validateForm()) createUser.mutate(form); }}
                className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              >
                {createUser.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
