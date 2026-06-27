import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, AreaChart, Area, ComposedChart, Line
} from 'recharts';
import { 
  Calendar, FileDown, Mail, Check, RefreshCw, BarChart3, 
  MapPin, Clock, DownloadCloud
} from 'lucide-react';
import { api } from '../utils/api';
import ShimmerLoader from '../components/ShimmerLoader';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [funnel, setFunnel] = useState([]);
  const [trends, setTrends] = useState([]);
  const [scores, setScores] = useState({ categorySummary: [], scoreDistribution: [] });

  // Filter Presets
  const [dateRange, setDateRange] = useState('30d'); // 7d, 30d, 90d, 1y, custom
  
  // Scheduled Report state
  const [scheduleFreq, setScheduleFreq] = useState('Weekly');
  const [scheduleEmail, setScheduleEmail] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [sumRes, trendRes, funnelRes, scoreRes] = await Promise.all([
        api.getAnalyticsSummary(),
        api.getAnalyticsTrends(),
        api.getAnalyticsFunnel(),
        api.getAnalyticsScores()
      ]);

      setSummary(sumRes);
      setTrends(trendRes);
      setFunnel(funnelRes);
      setScores(scoreRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    window.open(api.getExportUrl(), '_blank');
  };

  const handleScheduleSubmit = (e) => {
    e.preventDefault();
    if (!scheduleEmail) return;
    setScheduleSuccess(true);
    setTimeout(() => {
      setScheduleSuccess(false);
      setScheduleEmail('');
    }, 2500);
  };

  if (loading) {
    return <ShimmerLoader type="dashboard" />;
  }

  // State Heatmap simple table summary data
  const stateSummaryData = [
    { state: 'Andhra Pradesh', approved: 8, pending: 3, total: 11 },
    { state: 'Telangana', approved: 6, pending: 4, total: 10 },
    { state: 'Karnataka', approved: 4, pending: 2, total: 6 },
    { state: 'Maharashtra', approved: 3, pending: 2, total: 5 },
    { state: 'Tamil Nadu', approved: 2, pending: 1, total: 3 },
    { state: 'Delhi', approved: 0, pending: 2, total: 2 }
  ];

  // Average evaluation processing times by staff members
  const staffSpeedData = [
    { name: 'Rohan Sharma', avgDays: 4.2, cases: 14 },
    { name: 'Priya Patel', avgDays: 5.1, cases: 10 },
    { name: 'Aditya Kanaparthi', avgDays: 3.5, cases: 3 }
  ];

  return (
    <div className="space-y-6 page-enter text-left">
      
      {/* Top filter and export header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 border border-slate-200 rounded-2xl shadow-sm">
        <div className="space-y-0.5">
          <h2 className="text-xl font-extrabold text-slate-800">Operational Analytics & Reports</h2>
          <p className="text-xs text-slate-400">Review evaluation metrics, status funnels, and geographic heatmaps</p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-bold font-mono">
          {/* Preset buttons */}
          {['7d', '30d', '90d', '1y'].map((preset) => (
            <button
              key={preset}
              onClick={() => setDateRange(preset)}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                dateRange === preset 
                  ? 'bg-accent border-accent-dark text-white' 
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {preset.toUpperCase()}
            </button>
          ))}
          
          <button
            onClick={handleExportCSV}
            className="px-4 py-1.5 bg-accent hover:bg-accent-dark text-white rounded-lg font-sans font-bold flex items-center gap-1.5 shadow shadow-accent/15"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Funnels & Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Applications Conversion Funnel (Composed Area Chart) */}
        <div className="bg-slate-50 p-5 border border-slate-200 rounded-2xl shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Pre-qualification Funnel</h4>
              <p className="text-[11px] text-slate-400">Step-by-step conversion from drafts created to approved empanelment</p>
            </div>
            <BarChart3 className="w-4.5 h-4.5 text-slate-400" />
          </div>
          <div className="h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={funnel} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFunnel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F172A" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0F172A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="stage" stroke="#94a3b8" tickLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none' }} />
                <Area name="Applications Count" type="monotone" dataKey="count" stroke="#0F172A" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFunnel)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Score Distribution Histogram */}
        <div className="bg-slate-50 p-5 border border-slate-200 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Score Distribution Histogram</h4>
              <p className="text-[11px] text-slate-400">Count of evaluations grouped by overall rating bracket</p>
            </div>
          </div>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scores.scoreDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="range" stroke="#94a3b8" tickLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none' }} />
                <Bar name="Evaluations" dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 2: Location heatmaps and Staff KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* State Geographic Spread Heatmap (Table form) */}
        <div className="bg-slate-50 p-5 border border-slate-200 rounded-2xl shadow-sm text-xs font-medium text-slate-600 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-800">State-wise Heatmap</h4>
              <p className="text-[11px] text-slate-400">Applications count spread by state locations</p>
            </div>
            <MapPin className="w-4 h-4 text-slate-400" />
          </div>
          
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 text-left">State</th>
                  <th className="px-4 py-2 text-center w-16">Approved</th>
                  <th className="px-4 py-2 text-center w-16">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {stateSummaryData.map(st => (
                  <tr key={st.state}>
                    <td className="px-4 py-2 font-bold">{st.state}</td>
                    <td className="px-4 py-2 text-center text-blue-600">{st.approved}</td>
                    <td className="px-4 py-2 text-center">{st.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Staff Evaluation speeds */}
        <div className="bg-slate-50 p-5 border border-slate-200 rounded-2xl shadow-sm text-xs font-medium text-slate-600 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Staff processing Speed</h4>
              <p className="text-[11px] text-slate-400">Average evaluation processing days per member</p>
            </div>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 text-left">Staff Name</th>
                  <th className="px-4 py-2 text-center w-24">Avg Days</th>
                  <th className="px-4 py-2 text-center w-20">Evaluated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {staffSpeedData.map(staff => (
                  <tr key={staff.name}>
                    <td className="px-4 py-2.5 font-bold">{staff.name}</td>
                    <td className="px-4 py-2.5 text-center font-mono font-bold text-accent">{staff.avgDays} Days</td>
                    <td className="px-4 py-2.5 text-center">{staff.cases} files</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Report Scheduler config */}
        <div className="bg-slate-50 p-5 border border-slate-200 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Schedule Reports</h4>
              <p className="text-[11px] text-slate-400">Configure recurring digests directly to email</p>
            </div>
            <Mail className="w-4 h-4 text-slate-400" />
          </div>

          {scheduleSuccess ? (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs p-4 rounded-xl flex gap-2.5">
              <Check className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Digest Scheduled!</p>
                <p className="mt-0.5">Recurring emails will be sent at selected intervals.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleScheduleSubmit} className="space-y-3.5 text-xs font-bold text-slate-500">
              <div className="space-y-1 text-left">
                <label>Target Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. director@akipl.com"
                  value={scheduleEmail}
                  onChange={(e) => setScheduleEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-700 focus:outline-none focus:border-primary-light"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {['Daily', 'Weekly', 'Monthly'].map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setScheduleFreq(freq)}
                    className={`py-2 border rounded-xl text-center font-bold text-xs ${
                      scheduleFreq === freq 
                        ? 'bg-accent border-accent-dark text-white' 
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl font-bold transition-all shadow-md shadow-accent/15"
              >
                Schedule Report Digest
              </button>
            </form>
          )}
        </div>

      </div>

    </div>
  );
}
