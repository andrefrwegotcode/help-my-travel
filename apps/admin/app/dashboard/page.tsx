'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, Star, Image, Database } from 'lucide-react';
import { adminApi } from '../../lib/api';
import { Sidebar } from '../../components/Sidebar';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// Mock weekly data for chart (in real app would come from API)
const weeklyData = [
  { day: 'Mon', users: 4, reviews: 12, menus: 8 },
  { day: 'Tue', users: 7, reviews: 19, menus: 14 },
  { day: 'Wed', users: 3, reviews: 8, menus: 6 },
  { day: 'Thu', users: 12, reviews: 25, menus: 20 },
  { day: 'Fri', users: 9, reviews: 31, menus: 18 },
  { day: 'Sat', users: 15, reviews: 42, menus: 28 },
  { day: 'Sun', users: 11, reviews: 38, menus: 22 },
];

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => (await adminApi.get('/admin/stats')).data,
  });

  const cards = [
    {
      title: 'Total Users',
      value: stats?.users?.total ?? '—',
      sub: `+${stats?.users?.newToday ?? 0} today`,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Reviews',
      value: stats?.reviews?.total ?? '—',
      sub: `Avg rating: ${stats?.reviews?.avgRating ?? '—'}`,
      icon: Star,
      color: 'bg-orange-500',
    },
    {
      title: 'Photos',
      value: stats?.photos?.total ?? '—',
      sub: 'User-submitted photos',
      icon: Image,
      color: 'bg-purple-500',
    },
    {
      title: 'Menu Cache',
      value: stats?.menuCache?.total ?? '—',
      sub: 'Cached menu entries',
      icon: Database,
      color: 'bg-green-500',
    },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-500 mb-8">Welcome to the Help My Travel admin panel.</p>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {cards.map((card) => (
            <div key={card.title} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium">{card.title}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">
                    {isLoading ? '…' : card.value}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
                </div>
                <div className={`${card.color} p-3 rounded-xl`}>
                  <card.icon size={20} className="text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Activity This Week</h2>
            <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-1 rounded-full font-medium">Demo data</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="reviewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94A3B8' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="users" stroke="#3B82F6" fill="url(#usersGrad)" strokeWidth={2} name="New Users" />
              <Area type="monotone" dataKey="reviews" stroke="#FF6B35" fill="url(#reviewsGrad)" strokeWidth={2} name="Reviews" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
}
