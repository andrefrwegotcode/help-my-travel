'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Database, RefreshCw, Trash2 } from 'lucide-react';
import { adminApi } from '../../lib/api';
import { Sidebar } from '../../components/Sidebar';

const SOURCE_COLORS: Record<string, string> = {
  WEBSITE: 'bg-green-100 text-green-700',
  GOOGLE: 'bg-blue-100 text-blue-700',
  OTHER: 'bg-gray-100 text-gray-600',
};

export default function MenuCachePage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'menu-cache', page],
    queryFn: async () => (await adminApi.get('/admin/menu-cache', { params: { page, limit: 20 } })).data,
  });

  const deleteMutation = useMutation({
    mutationFn: (placeId: string) => adminApi.delete(`/menu/cache/${placeId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'menu-cache'] }),
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Menu Cache</h1>
        <p className="text-slate-500 text-sm mb-6">{data?.total ?? 0} cached menu entries (auto-expire after 24h)</p>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-4 text-slate-600 font-semibold">Place ID</th>
                <th className="text-left px-6 py-4 text-slate-600 font-semibold">Language</th>
                <th className="text-left px-6 py-4 text-slate-600 font-semibold">Source</th>
                <th className="text-left px-6 py-4 text-slate-600 font-semibold">Fetched</th>
                <th className="text-left px-6 py-4 text-slate-600 font-semibold">Expires</th>
                <th className="text-left px-6 py-4 text-slate-600 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">Loading…</td></tr>
              ) : data?.caches?.map((cache: any) => {
                const expired = new Date(cache.expiresAt) < new Date();
                return (
                  <tr key={cache.id} className={`border-b border-slate-50 ${expired ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                        {cache.placeId.slice(0, 30)}…
                      </code>
                    </td>
                    <td className="px-6 py-4 uppercase font-bold text-xs text-slate-600">{cache.language}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${SOURCE_COLORS[cache.source] || ''}`}>
                        {cache.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(cache.fetchedAt).toLocaleString()}
                    </td>
                    <td className={`px-6 py-4 text-xs font-medium ${expired ? 'text-red-500' : 'text-green-600'}`}>
                      {expired ? 'Expired' : new Date(cache.expiresAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => deleteMutation.mutate(cache.placeId)}
                        className="text-red-400 hover:text-red-600 p-1"
                        title="Invalidate cache"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
