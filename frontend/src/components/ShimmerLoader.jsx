import React from 'react';

export default function ShimmerLoader({ type = "table" }) {
  if (type === "table") {
    return (
      <div className="w-full space-y-4">
        {/* Table Header */}
        <div className="h-10 w-full skeleton-shimmer opacity-40 rounded-lg" />
        {/* Table Rows */}
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-4 items-center py-2 border-b border-slate-100">
            <div className="h-6 w-1/12 skeleton-shimmer" />
            <div className="h-6 w-4/12 skeleton-shimmer" />
            <div className="h-6 w-2/12 skeleton-shimmer" />
            <div className="h-6 w-1/12 skeleton-shimmer" />
            <div className="h-6 w-2/12 skeleton-shimmer" />
            <div className="h-6 w-2/12 skeleton-shimmer" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "cards") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-100 space-y-4 shadow-sm">
            <div className="flex justify-between items-center">
              <div className="h-4 w-1/3 skeleton-shimmer" />
              <div className="h-8 w-8 skeleton-shimmer rounded-lg" />
            </div>
            <div className="h-7 w-1/2 skeleton-shimmer" />
            <div className="space-y-2 pt-2">
              <div className="h-3 w-full skeleton-shimmer" />
              <div className="h-3 w-4/5 skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "dashboard") {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white border border-slate-100 rounded-xl p-4 skeleton-shimmer" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-white border border-slate-100 rounded-xl p-4 skeleton-shimmer" />
          <div className="h-80 bg-white border border-slate-100 rounded-xl p-4 skeleton-shimmer" />
        </div>
      </div>
    );
  }

  return <div className="h-24 w-full skeleton-shimmer" />;
}
