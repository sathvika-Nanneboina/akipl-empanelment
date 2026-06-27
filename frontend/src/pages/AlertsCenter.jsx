import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Check, Trash2, MailCheck, BellOff, CheckCircle2, 
  AlertTriangle, AlertOctagon, Info, Sparkles, Settings
} from 'lucide-react';
import { api } from '../utils/api';

export default function AlertsCenter() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, unread, warning
  const [loading, setLoading] = useState(true);

  // Email Toggle configuration states
  const [emailSettings, setEmailSettings] = useState({
    newApplication: true,
    idleAlert: true,
    expiringLicense: true,
    lowScoreWarning: false,
    documentMissing: true
  });

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const list = await api.getNotifications();
      setNotifications(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      loadNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteNotification(id);
      loadNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const markAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.isRead);
      await Promise.all(unread.map(n => api.markNotificationRead(n.id)));
      loadNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-blue-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'error': return <AlertOctagon className="w-5 h-5 text-rose-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const toggleEmailSetting = (key) => {
    setEmailSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Filter list
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'warning') return n.type === 'warning' || n.type === 'error';
    return true;
  });

  // Group notifications into Today / Earlier
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayNotifs = filteredNotifications.filter(n => new Date(n.createdAt) >= today);
  const earlierNotifs = filteredNotifications.filter(n => new Date(n.createdAt) < today);

  return (
    <div className="space-y-6 page-enter text-left">
      
      {/* Top Header */}
      <div className="flex justify-between items-center bg-white p-5 border border-slate-200 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">Alerts & Notification Center</h2>
          <p className="text-xs text-slate-400">Manage real-time compliance system triggers and email subscriptions</p>
        </div>
        {notifications.filter(n => !n.isRead).length > 0 && (
          <button
            onClick={markAllRead}
            className="px-4 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <MailCheck className="w-4 h-4" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Grid: Alerts list vs Configuration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Alerts list */}
        <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          
          {/* Filters Tab bar */}
          <div className="flex border-b border-slate-100 pb-3 text-xs font-bold text-slate-400 gap-2">
            {[
              { id: 'all', label: 'All Alerts' },
              { id: 'unread', label: 'Unread' },
              { id: 'warning', label: 'Warnings & Errors' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filter === tab.id ? 'bg-accent text-white' : 'hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* List content */}
          {loading ? (
            <div className="py-12 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 italic">
              No notifications matching current filters
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* TODAY SECTION */}
              {todayNotifs.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Today</span>
                  <div className="space-y-2">
                    {todayNotifs.map(n => (
                      <div 
                        key={n.id} 
                        className={`p-4 rounded-xl border border-slate-150 flex items-start justify-between gap-4 transition-all relative ${
                          !n.isRead ? 'bg-accent/5 border-accent/10' : 'bg-white'
                        }`}
                      >
                        <div className="flex gap-3 text-xs font-medium">
                          <div className="mt-0.5 shrink-0">{getNotifIcon(n.type)}</div>
                          <div>
                            <p className={`text-slate-800 ${!n.isRead ? 'font-bold' : ''}`}>{n.title}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                            <span className="text-[9px] text-slate-400 block mt-1">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex gap-1.5 shrink-0">
                          {!n.isRead && (
                            <button
                              onClick={() => handleMarkRead(n.id)}
                              className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                              title="Mark read"
                            >
                              <Check className="w-4.5 h-4.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(n.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Delete alert"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EARLIER SECTION */}
              {earlierNotifs.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Earlier</span>
                  <div className="space-y-2">
                    {earlierNotifs.map(n => (
                      <div 
                        key={n.id} 
                        className={`p-4 rounded-xl border border-slate-150 flex items-start justify-between gap-4 transition-all relative ${
                          !n.isRead ? 'bg-accent/5 border-accent/10' : 'bg-white'
                        }`}
                      >
                        <div className="flex gap-3 text-xs font-medium">
                          <div className="mt-0.5 shrink-0">{getNotifIcon(n.type)}</div>
                          <div>
                            <p className={`text-slate-800 ${!n.isRead ? 'font-bold' : ''}`}>{n.title}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                            <span className="text-[9px] text-slate-400 block mt-1">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex gap-1.5 shrink-0">
                          {!n.isRead && (
                            <button
                              onClick={() => handleMarkRead(n.id)}
                              className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                              title="Mark read"
                            >
                              <Check className="w-4.5 h-4.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(n.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Delete alert"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Right Side: Configuration panel */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800">Email Digest Settings</h3>
            <Settings className="w-4.5 h-4.5 text-slate-400" />
          </div>

          <div className="space-y-3.5 text-xs text-slate-600 font-medium">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">MOCK INTEGRATION ALERT TOGGLES</p>
            
            {[
              { key: 'newApplication', label: 'New Application Submitted', desc: 'Alert when contractors finalize qualification forms' },
              { key: 'idleAlert', label: 'Application Idle >7 days', desc: 'Warning when review status remains unmodified' },
              { key: 'expiringLicense', label: 'Empanelment Expiry Warning', desc: 'Alert 60/30 days prior to registration expiry' },
              { key: 'lowScoreWarning', label: 'Evaluations Below Threshold', desc: 'Warn if weighted average is less than 60/100' },
              { key: 'documentMissing', label: 'Missing Documents Warning', desc: 'Reminders for outstanding bank or tax receipts' }
            ].map(item => (
              <label key={item.key} className="flex gap-3 items-start cursor-pointer select-none py-1">
                <input
                  type="checkbox"
                  checked={emailSettings[item.key]}
                  onChange={() => toggleEmailSetting(item.key)}
                  className="w-4 h-4 accent-accent mt-0.5 shrink-0 cursor-pointer"
                />
                <div className="space-y-0.5 text-left">
                  <p className="text-[11px] font-bold text-slate-800 leading-tight">{item.label}</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => alert('Digest preferences updated!')}
              className="w-full py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-bold shadow shadow-accent/15"
            >
              Save Email Preferences
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
