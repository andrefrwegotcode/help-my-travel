'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image, Trash2 } from 'lucide-react';
import { adminApi } from '../../lib/api';
import { Sidebar } from '../../components/Sidebar';

export default function PhotosPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'photos', page],
    queryFn: async () => (await adminApi.get('/admin/photos', { params: { page, limit: 20 } })).data,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/admin/photos/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'photos'] }),
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Photos</h1>
        <p className="text-slate-500 text-sm mb-6">{data?.total ?? 0} total photos</p>

        {isLoading ? (
          <div className="text-center text-slate-400 py-12">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.photos?.map((photo: any) => (
              <div key={photo.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="relative h-48 bg-slate-100">
                  {photo.url ? (
                    <img src={photo.url} alt={photo.caption || 'Photo'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image size={40} className="text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{photo.placeName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{photo.user?.name || 'Anonymous'}</p>
                      {photo.caption && (
                        <p className="text-xs text-slate-400 mt-1 truncate">{photo.caption}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(photo.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Delete this photo?')) deleteMutation.mutate(photo.id);
                      }}
                      className="text-red-400 hover:text-red-600 p-1 ml-2 flex-shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {data && data.pages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 text-sm border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50">
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-slate-500">Page {page} / {data.pages}</span>
            <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 text-sm border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50">
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
