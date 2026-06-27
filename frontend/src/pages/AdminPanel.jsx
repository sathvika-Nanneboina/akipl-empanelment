import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Sliders, ShieldCheck, ClipboardList, Trash2, Plus, 
  Search, ShieldAlert, Sparkles, Database, ToggleLeft, ToggleRight, Check
} from 'lucide-react';
import { api } from '../utils/api';
import ShimmerLoader from '../components/ShimmerLoader';

export default function AdminPanel() {
  const [activeSubTab, setActiveSubTab] = useState('users'); // users, config, blacklist, audit
  const [loading, setLoading] = useState(true);

  // User management states
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'STAFF' });
  const [userSuccess, setUserSuccess] = useState(false);

  // Scoring config states
  const [config, setConfig] = useState({ weightTechnical: 40, weightFinancial: 35, weightReferences: 25, minApprovalScore: 60, categories: [] });
  const [newCategory, setNewCategory] = useState('');

  // Blacklist state
  const [allContractors, setAllContractors] = useState([]);
  const [blacklistNotes, setBlacklistNotes] = useState('');
  const [searchBlacklist, setSearchBlacklist] = useState('');

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchAudit, setSearchAudit] = useState('');

  useEffect(() => {
    loadSubTabData();
  }, [activeSubTab]);

  const loadSubTabData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'users') {
        const data = await api.getAdminUsers();
        setUsers(data);
      } else if (activeSubTab === 'config') {
        const data = await api.getScoringConfig();
        setConfig(data);
      } else if (activeSubTab === 'blacklist') {
        const res = await api.getApplications({ limit: 100 });
        setAllContractors(res.data);
      } else if (activeSubTab === 'audit') {
        const data = await api.getAdminAuditLogs();
        setAuditLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // USER ACTIONS
  // ==========================================
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.createAdminUser(newUser);
      setUserSuccess(true);
      setNewUser({ name: '', email: '', password: '', role: 'STAFF' });
      loadSubTabData();
      setTimeout(() => setUserSuccess(false), 2000);
    } catch (err) {
      alert(err.message || 'Failed to create user');
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await api.toggleUserActive(id);
      loadSubTabData();
    } catch (e) {
      alert('Cannot deactivate yourself or failed database action.');
    }
  };

  // ==========================================
  // CONFIG ACTIONS
  // ==========================================
  const handleWeightChange = (field, value) => {
    const val = parseInt(value) || 0;
    setConfig(prev => {
      const next = { ...prev, [field]: val };
      return next;
    });
  };

  const handleSaveWeights = async (e) => {
    e.preventDefault();
    const sum = config.weightTechnical + config.weightFinancial + config.weightReferences;
    if (sum !== 100) {
      alert(`Scoring weights must sum to exactly 100%. Current sum: ${sum}%`);
      return;
    }
    try {
      await api.updateScoringConfig(config);
      alert('Scoring configurations updated!');
    } catch (e) {
      alert('Failed to update config');
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    try {
      const updatedCats = await api.updateCategory(newCategory.trim(), 'add');
      setConfig(prev => ({ ...prev, categories: updatedCats }));
      setNewCategory('');
      loadSubTabData();
    } catch (e) {
      alert('Failed to add category');
    }
  };

  const handleRemoveCategory = async (catName) => {
    try {
      const updatedCats = await api.updateCategory(catName, 'remove');
      setConfig(prev => ({ ...prev, categories: updatedCats }));
      loadSubTabData();
    } catch (e) {
      alert('Failed to remove category');
    }
  };

  // ==========================================
  // BLACKLIST ACTIONS
  // ==========================================
  const handleBlacklistAction = async (id, action) => {
    if (action === 'blacklist' && !blacklistNotes.trim()) {
      alert('A reason is required to blacklist a contractor.');
      return;
    }
    try {
      await api.blacklistVendor(id, action, blacklistNotes);
      setBlacklistNotes('');
      loadSubTabData();
      alert(`Contractor successfully ${action}ed.`);
    } catch (e) {
      alert('Action failed');
    }
  };

  // Filter Contractors
  const filteredContractors = allContractors.filter(c => 
    c.companyName.toLowerCase().includes(searchBlacklist.toLowerCase()) ||
    c.applicationId.toLowerCase().includes(searchBlacklist.toLowerCase())
  );

  // Filter Audit Logs
  const filteredAudit = auditLogs.filter(log => 
    log.action.toLowerCase().includes(searchAudit.toLowerCase()) ||
    log.user?.name?.toLowerCase().includes(searchAudit.toLowerCase()) ||
    log.entityId?.toLowerCase().includes(searchAudit.toLowerCase())
  );

  return (
    <div className="space-y-6 page-enter text-left">
      
      {/* Top Header */}
      <div className="flex justify-between items-center bg-slate-50 p-5 border border-slate-200 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">Admin Control Console</h2>
          <p className="text-xs text-slate-400">Configure global parameters, manage reviewers, blacklist, and review audit trails</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-bold text-slate-400 gap-2">
        {[
          { id: 'users', label: 'User Control', icon: Users },
          { id: 'config', label: 'Evaluation Settings', icon: Sliders },
          { id: 'blacklist', label: 'Blacklist Control', icon: ShieldAlert },
          { id: 'audit', label: 'Global Audit Trail', icon: Database }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-4 py-2 border-b-2 flex items-center gap-1.5 transition-all ${
                activeSubTab === tab.id 
                  ? 'border-accent text-slate-900 font-extrabold' 
                  : 'border-transparent hover:text-slate-700'
              }`}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Subtab Contents */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[400px]">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* SUBTAB 1: USER MANAGEMENT */}
            {activeSubTab === 'users' && (
              <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* User Creation Form */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 max-w-sm h-fit">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Create Reviewer Account</h3>
                  
                  {userSuccess && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs p-3 rounded-xl flex gap-1.5">
                      <Check className="w-4.5 h-4.5 text-blue-500 mt-0.5 shrink-0 stroke-[3]" />
                      <span>User account created successfully!</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateUser} className="space-y-4 text-xs font-bold text-slate-500">
                    <div className="space-y-1 text-left">
                      <label>Full Name</label>
                      <input
                        type="text" required placeholder="e.g. Priyan Sharma"
                        value={newUser.name}
                        onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-700 bg-white"
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <label>Email Address</label>
                      <input
                        type="email" required placeholder="name@akipl.com"
                        value={newUser.email}
                        onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-700 bg-white"
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <label>Password</label>
                      <input
                        type="password" required placeholder="••••••••"
                        value={newUser.password}
                        onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-700 bg-white"
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <label>System Role</label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-700 bg-white"
                      >
                        <option>STAFF</option>
                        <option>ADMIN</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl font-bold transition-all shadow shadow-accent/20"
                    >
                      Create Account
                    </button>
                  </form>
                </div>

                {/* Users list table */}
                <div className="lg:col-span-2 space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Registered Accounts</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2">Name</th>
                          <th className="px-4 py-2">Email</th>
                          <th className="px-4 py-2 text-center">Role</th>
                          <th className="px-4 py-2 text-center w-24">Status</th>
                          <th className="px-4 py-2 text-center w-20">Toggle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {users.map(u => (
                          <tr key={u.id}>
                            <td className="px-4 py-2.5 font-bold text-slate-800">{u.name}</td>
                            <td className="px-4 py-2.5 font-mono text-[11px]">{u.email}</td>
                            <td className="px-4 py-2.5 text-center font-bold text-[10px] text-slate-500 uppercase">{u.role}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                u.isActive ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}>{u.isActive ? 'Active' : 'Suspended'}</span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <button
                                onClick={() => handleToggleActive(u.id)}
                                className="text-slate-400 hover:text-slate-700"
                                title="Change status"
                              >
                                {u.isActive ? <ToggleRight className="w-6 h-6 text-blue-500" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SUBTAB 2: CONFIG / SETTINGS */}
            {activeSubTab === 'config' && (
              <motion.div key="config" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-bold text-slate-500">
                {/* Scoring configuration weights sliders */}
                <form onSubmit={handleSaveWeights} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">Relative Scoring Weightings</h3>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    Set relative weight sliders calculating overall qualification standing scores. The sum of weights must total exactly 100%.
                  </p>

                  <div className="space-y-4 pt-2">
                    {/* Technical Weight */}
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Technical capacity weighting</span>
                        <span className="text-slate-800 font-bold">{config.weightTechnical}%</span>
                      </div>
                      <input
                        type="range" min="0" max="100" value={config.weightTechnical}
                        onChange={(e) => handleWeightChange('weightTechnical', e.target.value)}
                        className="w-full accent-accent"
                      />
                    </div>

                    {/* Financial Weight */}
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Financial standing weighting</span>
                        <span className="text-slate-800 font-bold">{config.weightFinancial}%</span>
                      </div>
                      <input
                        type="range" min="0" max="100" value={config.weightFinancial}
                        onChange={(e) => handleWeightChange('weightFinancial', e.target.value)}
                        className="w-full accent-accent"
                      />
                    </div>

                    {/* Reference Weight */}
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Past Reference contract weighting</span>
                        <span className="text-slate-800 font-bold">{config.weightReferences}%</span>
                      </div>
                      <input
                        type="range" min="0" max="100" value={config.weightReferences}
                        onChange={(e) => handleWeightChange('weightReferences', e.target.value)}
                        className="w-full accent-accent"
                      />
                    </div>

                    {/* Total sum indicator */}
                    <div className="flex justify-between items-center bg-accent text-white p-3 rounded-lg text-[11px] font-bold font-mono">
                      <span>TOTAL SUM PERCENT:</span>
                      <span className={config.weightTechnical + config.weightFinancial + config.weightReferences === 100 ? 'text-blue-400 font-black' : 'text-rose-400'}>
                        {config.weightTechnical + config.weightFinancial + config.weightReferences}%
                      </span>
                    </div>

                    {/* Minimum Score */}
                    <div className="space-y-1 pt-2">
                      <label className="text-[11px]">Empanelment qualification threshold (0-100 score)</label>
                      <input
                        type="number" min="1" max="100"
                        value={config.minApprovalScore}
                        onChange={(e) => setConfig(prev => ({ ...prev, minApprovalScore: parseInt(e.target.value) || 60 }))}
                        className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 font-medium text-slate-700 bg-white focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-accent hover:bg-accent-dark text-white rounded-xl font-bold transition-all shadow"
                    >
                      Save Parameters
                    </button>
                  </div>
                </form>

                {/* Category Master panel */}
                <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 h-fit">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Primary Categories Master</h3>
                  
                  <form onSubmit={handleAddCategory} className="flex gap-2">
                    <input
                      type="text" required placeholder="e.g. Landscaping"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 font-medium text-slate-700 text-xs focus:outline-none bg-white"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-accent text-white text-xs font-bold rounded-lg hover:bg-accent-dark flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </form>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {config.categories?.map((cat) => (
                      <div key={cat} className="flex justify-between items-center p-2 bg-white rounded-lg border border-slate-250 font-bold text-slate-700 text-xs">
                        <span>{cat}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(cat)}
                          className="text-slate-400 hover:text-rose-500 transition-colors"
                          title="Remove Category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* SUBTAB 3: BLACKLIST CONTROL */}
            {activeSubTab === 'blacklist' && (
              <motion.div key="blacklist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-xs font-bold text-slate-500">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Blacklist / Suspended Vendors Control</h3>
                  
                  {/* Search */}
                  <div className="relative w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search company, ID..."
                      value={searchBlacklist}
                      onChange={(e) => setSearchBlacklist(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none font-medium text-xs"
                    />
                  </div>
                </div>

                {/* Reason notes area */}
                <div className="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Reason description (Mandatory to add to blacklist list)</label>
                  <textarea
                    rows={2}
                    value={blacklistNotes}
                    onChange={(e) => setBlacklistNotes(e.target.value)}
                    placeholder="Specify compliance violations, delay penalties, etc..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-250 bg-white font-medium text-slate-700 focus:outline-none"
                  />
                </div>

                {/* Grid List table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2">Application ID</th>
                        <th className="px-4 py-2">Company Name</th>
                        <th className="px-4 py-2 text-center w-28">Status</th>
                        <th className="px-4 py-2 text-center w-36">Action Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredContractors.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-slate-400 italic">No contractor registrations found</td>
                        </tr>
                      ) : (
                        filteredContractors.map(c => {
                          const isBlacklisted = c.status === 'Rejected' && c.financialDetails?.blacklistStatus === 'Yes';
                          return (
                            <tr key={c.id}>
                              <td className="px-4 py-2.5 font-mono font-bold">{c.applicationId}</td>
                              <td className="px-4 py-2.5 font-bold text-slate-800">{c.companyName}</td>
                              <td className="px-4 py-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap ${
                                  isBlacklisted ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>{isBlacklisted ? 'BLACKLISTED' : c.status}</span>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {isBlacklisted ? (
                                  <button
                                    onClick={() => handleBlacklistAction(c.id, 'whitelist')}
                                    className="px-3 py-1 bg-blue-500 text-white font-bold hover:bg-blue-600 rounded text-[10px]"
                                  >
                                    Re-instate / Whitelist
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleBlacklistAction(c.id, 'blacklist')}
                                    className="px-3 py-1 bg-rose-500 text-white font-bold hover:bg-rose-600 rounded text-[10px]"
                                  >
                                    Add Blacklist
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* SUBTAB 4: AUDIT TRAIL LOGS */}
            {activeSubTab === 'audit' && (
              <motion.div key="audit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-xs font-bold text-slate-500">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">System Audit Logs</h3>
                  
                  {/* Search */}
                  <div className="relative w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search action, user, ID..."
                      value={searchAudit}
                      onChange={(e) => setSearchAudit(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none font-medium text-xs"
                    />
                  </div>
                </div>

                {/* Audit logs list table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5">User</th>
                        <th className="px-4 py-2.5">Action Type</th>
                        <th className="px-4 py-2.5">Entity</th>
                        <th className="px-4 py-2.5">Changes</th>
                        <th className="px-4 py-2.5 text-center">IP Address</th>
                        <th className="px-4 py-2.5 text-center w-40">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredAudit.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-slate-400 italic">No audit records found</td>
                        </tr>
                      ) : (
                        filteredAudit.map(log => (
                          <tr key={log.id}>
                            <td className="px-4 py-2.5">
                              <p className="font-bold text-slate-800">{log.user?.name || 'System'}</p>
                              <span className="text-[9px] text-slate-400 block font-medium">{log.user?.role || 'SYSTEM'}</span>
                            </td>
                            <td className="px-4 py-2.5 font-bold font-mono text-[10px] text-accent">{log.action}</td>
                            <td className="px-4 py-2.5">
                              <span className="font-mono text-[10px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-slate-500">{log.entityId || log.entityType}</span>
                            </td>
                            <td className="px-4 py-2.5 truncate max-w-xs" title={`Old: ${log.oldValue} -> New: ${log.newValue}`}>
                              {log.oldValue ? (
                                <p className="text-[10px] text-slate-400 leading-tight">
                                  <span className="line-through">{log.oldValue}</span>{' '}
                                  <span className="text-slate-700 font-bold">→ {log.newValue}</span>
                                </p>
                              ) : (
                                <span className="text-slate-800 text-[10px]">{log.newValue || 'N/A'}</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center font-mono text-[10px]">{log.ipAddress || '127.0.0.1'}</td>
                            <td className="px-4 py-2.5 text-center text-slate-400 text-[10px]">
                              {new Date(log.createdAt).toLocaleDateString()}{' '}
                              {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>

    </div>
  );
}
