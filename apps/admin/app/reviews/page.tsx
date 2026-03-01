'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Trash2, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../lib/api';
import { Sidebar } from '../../components/Sidebar';

export default function ReviewsPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reviews', page],
    queryFn: async () => (await adminApi.get('/admin/reviews', { params: { page, limit: 20 } })).data,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/admin/reviews/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] }); toast.success('Review deleted'); },
    onError: () => toast.error('Failed to delete review'),
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Reviews</h1>
        <p className="text-slate-500 text-sm mb-6">{data?.total ?? 0} total reviews</p>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center text-slate-400 py-12">Loading…</div>
          ) : !data?.reviews?.length ? (
            <div className="text-center py-20">
              <MessageSquare size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">No reviews yet</p>
              <p className="text-slate-400 text-sm mt-1">Reviews will appear here when users submit them.</p>
            </div>
          ) : (
            data?.reviews?.map((review: any) => (
              <div key={review.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600">
                        {review.user?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-900">{review.user?.name || 'Anonymous'}</p>
                        <p className="text-xs text-slate-400">{review.user?.email}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mb-1">
                      <span className="font-medium">Place ID:</span> {review.placeId}
                    </p>
                    <p className="text-xs text-slate-500 mb-2">
                      <span className="font-medium">Restaurant:</span> {review.placeName}
                    </p>
                    <div className="flex items-center gap-1 mb-2">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} size={14} className="fill-orange-400 text-orange-400" />
                      ))}
                    </div>
                    {review.comment && (
                      <p className="text-sm text-slate-600">{review.comment}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-2">
                      {new Date(review.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Delete this review?')) deleteMutation.mutate(review.id);
                    }}
                    className="text-red-400 hover:text-red-600 p-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

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
