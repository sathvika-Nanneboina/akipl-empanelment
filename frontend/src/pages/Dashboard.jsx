import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { 
  Users, CheckCircle2, AlertCircle, Clock, FileDown, 
  TrendingUp, Sparkles, Building, ChevronRight, PlayCircle
} from 'lucide-react';
import { api } from '../utils/api';
import KPIWidget from '../components/KPIWidget';
import ShimmerLoader from '../components/ShimmerLoader';

const COLORS = ['#0F172A', '#2563EB', '#64748B', '#F59E0B', '#EF4444', '#6366F1'];

export default function Dashboard({ setCurrentTab }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [scores, setScores] = useState({ categorySummary: [], scoreDistribution: [] });
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [sumRes, trendRes, scoreRes, logsRes] = await Promise.all([
        api.getAnalyticsSummary(),
        api.getAnalyticsTrends(),
        api.getAnalyticsScores(),
        api.getAdminAuditLogs()
      ]);
      
      setSummary(sumRes);
      setTrends(trendRes);
      setScores(scoreRes);
      setRecentActivities(logsRes.slice(0, 5)); // Take latest 5 logs
    } catch (e) {
      console.error('Failed to load dashboard statistics', e);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    window.open(api.getExportUrl(), '_blank');
  };

  const handleCreateNew = async () => {
    try {
      const draft = await api.createDraft('New Contractor Ltd');
      localStorage.setItem('selectedApplicationId', draft.id);
      setCurrentTab('wizard');
    } catch (e) {
      alert('Failed to initialize draft application');
    }
  };

  if (loading) {
    return <ShimmerLoader type="dashboard" />;
  }

  // Prep data for Donut Chart (Status distribution)
  const statusPieData = [
    { name: 'Empanelled', value: summary?.approvedVendors || 0 },
    { name: 'Under Evaluation', value: summary?.pendingReview || 0 },
    { name: 'Rejected', value: summary?.rejected || 0 }
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6 page-enter">
      
      {/* Top Welcome Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary-dark via-primary to-primary-light p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
        {/* Background glow overlay */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient(circle, rgba(13, 148, 136, 0.15) 0%, transparent 100%) pointer-events-none" />
        
        <div className="space-y-1.5 text-left relative z-10">
          <div className="flex items-center gap-2 text-accent-light">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider font-mono">AVINASH KANAPARTHI INFRA PRIVATE LIMITED</span>
          </div>
          <h2 className="text-2xl font-extrabold font-outfit text-white tracking-tight">Contractor Empanelment Dashboard</h2>
          <p className="text-slate-300 text-xs max-w-xl leading-relaxed">
            Monitor incoming applications, evaluate Technical/Financial standings, manage approvals, and audit historical trail updates in real-time.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 relative z-10 shrink-0">
          <button 
            onClick={handleCreateNew}
            className="px-4 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-accent/20 flex items-center gap-2"
          >
            <span>+ New Application</span>
          </button>
          <button 
            onClick={handleExport}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            <span>Export Registry</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPIWidget 
          title="Total Applications" 
          value={summary?.totalApplications || 0} 
          icon={Building} 
          colorClass="bg-blue-50 text-blue-600 border border-blue-100" 
        />
        <KPIWidget 
          title="Empanelled Vendors" 
          value={summary?.approvedVendors || 0} 
          icon={CheckCircle2} 
          colorClass="bg-blue-50 text-blue-600 border border-blue-100" 
        />
        <KPIWidget 
          title="Pending Evaluation" 
          value={summary?.pendingReview || 0} 
          icon={AlertCircle} 
          colorClass="bg-amber-50 text-amber-600 border border-amber-100" 
        />
        <KPIWidget 
          title="Avg Processing Days" 
          value={summary?.avgProcessingDays || 0} 
          icon={Clock} 
          suffix=" Days"
          colorClass="bg-slate-100 text-slate-700 border border-slate-200" 
        />
      </div>

      {/* Main Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Applications Trend (Bar Chart) */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 text-left space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Monthly Submissions Trend</h4>
              <p className="text-[11px] text-slate-400">Total contractor forms submitted in the last 12 months</p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }} 
                  labelStyle={{ fontWeight: 'bold', color: '#0F172A' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar name="Submissions" dataKey="submissions" fill="#0F172A" radius={[4, 4, 0, 0]} />
                <Bar name="Approvals" dataKey="approvals" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution (Pie Chart) */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm text-left space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Application Distribution</h4>
              <p className="text-[11px] text-slate-400">Ratios of status outcomes</p>
            </div>
          </div>
          <div className="h-60 w-full relative flex items-center justify-center">
            {statusPieData.length === 0 ? (
              <p className="text-slate-400 text-xs">No entries available</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-800">{summary?.totalApplications || 0}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                </div>
              </>
            )}
          </div>
          
          {/* Custom Pie Legend */}
          {statusPieData.length > 0 && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
              {statusPieData.map((item, idx) => (
                <div key={item.name} className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-[10px] font-bold text-slate-500">{item.name}</span>
                  </div>
                  <span className="text-xs font-extrabold text-slate-800 mt-0.5">{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Row 2: Category Breakdown and Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Category Breakdown (Horizontal Bar Chart) */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 text-left space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Top Contractor Categories</h4>
              <p className="text-[11px] text-slate-400">Categorized by primary registration fields</p>
            </div>
          </div>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={scores.categorySummary.slice(0, 5)}
                margin={{ top: 10, right: 10, left: 30, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" tickLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" tickLine={false} width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                />
                <Bar name="Vendors Count" dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Audit Activities */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm text-left flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Recent Activity</h4>
              <p className="text-[11px] text-slate-400">System updates and audit logs</p>
            </div>
            <button 
              onClick={() => setCurrentTab('admin')} 
              className="text-[11px] text-accent font-bold hover:underline flex items-center gap-0.5"
            >
              <span>Audit logs</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 space-y-3.5 overflow-y-auto pr-1">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No recent activity logged</p>
            ) : (
              recentActivities.map((log) => (
                <div key={log.id} className="flex gap-3 text-xs leading-relaxed">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200 font-bold uppercase">
                    {log.user?.name?.slice(0, 2) || 'SYS'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 text-[11px]">
                      <span className="font-bold text-slate-900">{log.user?.name || 'System'}</span>{' '}
                      {log.action.replace('_', ' ').toLowerCase()}:{' '}
                      <span className="font-bold text-accent font-mono text-[10px] bg-slate-50 px-1 py-0.5 rounded">{log.newValue || log.entityId}</span>
                    </p>
                    <span className="text-[9px] text-slate-400 block mt-1">
                      {new Date(log.createdAt).toLocaleDateString()} at {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
