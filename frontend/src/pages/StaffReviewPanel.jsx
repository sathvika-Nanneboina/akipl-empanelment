import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, ChevronDown, ChevronUp, Sliders, AlertCircle, 
  CheckSquare, XSquare, MessageSquare, ClipboardCheck, ArrowRight, 
  History, ShieldAlert, Download, Flag, Eye
} from 'lucide-react';
import { api } from '../utils/api';
import ShimmerLoader from '../components/ShimmerLoader';

export default function StaffReviewPanel() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  
  // Search & Filters state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Detail / Evaluation drawer
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [applicationDetail, setApplicationDetail] = useState(null);
  const [detailTab, setDetailTab] = useState('profile'); // profile, technical, references, financial, documents, audit
  const [detailLoading, setDetailLoading] = useState(false);

  // Sliders for scoring
  const [techRating, setTechRating] = useState(70);
  const [finRating, setFinRating] = useState(70);
  const [refRating, setRefRating] = useState(70);
  const [evalNotes, setEvalNotes] = useState('');
  const [decision, setDecision] = useState('Approved');
  const [evalSaving, setEvalSaving] = useState(false);

  // Settings for weights (fetched from backend)
  const [weights, setWeights] = useState({ weightTechnical: 40, weightFinancial: 35, weightReferences: 25, minApprovalScore: 60 });

  // Audit trail for selected app
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    loadApplications();
  }, [search, status, category, minScore, maxScore, page]);

  useEffect(() => {
    // Check if an application is selected via notification click
    const notifSelectId = localStorage.getItem('selectedApplicationId');
    if (notifSelectId && currentTabIsEmpty()) {
      localStorage.removeItem('selectedApplicationId');
      handleOpenDetails(notifSelectId);
    }
    loadConfig();
  }, []);

  const currentTabIsEmpty = () => {
    return !selectedAppId;
  };

  const loadConfig = async () => {
    try {
      const config = await api.getScoringConfig();
      setWeights(config);
    } catch (e) {}
  };

  const loadApplications = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        ...(search && { search }),
        ...(status && { status }),
        ...(category && { category }),
        ...(minScore && { minScore }),
        ...(maxScore && { maxScore })
      };
      const res = await api.getApplications(params);
      setApplications(res.data);
      setPagination(res.pagination);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (id) => {
    setSelectedAppId(id);
    setDetailLoading(true);
    setDetailTab('profile');
    try {
      const details = await api.getApplicationById(id);
      setApplicationDetail(details);
      
      // Load suggestions or previous evaluations
      if (details.evaluations && details.evaluations.length > 0) {
        const latest = details.evaluations[0];
        setTechRating(latest.technicalScore);
        setFinRating(latest.financialScore);
        setRefRating(latest.referenceScore);
        setEvalNotes(latest.notes || '');
        setDecision(latest.status === 'Approved' ? 'Approved' : 'Rejected');
      } else {
        // Pre-fill with system suggestions
        const suggest = details.suggestedScores || { technical: 70, financial: 70, references: 70 };
        setTechRating(suggest.technical);
        setFinRating(suggest.financial);
        setRefRating(suggest.references);
        setEvalNotes('');
        setDecision('Approved');
      }

      // Load audit trail
      const logs = await api.getAuditTrail(id);
      setAuditLogs(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedAppId(null);
    setApplicationDetail(null);
  };

  // Weighted score live calculation
  const wTech = weights.weightTechnical / 100;
  const wFin = weights.weightFinancial / 100;
  const wRef = weights.weightReferences / 100;
  const overallCalculatedScore = parseFloat((techRating * wTech + finRating * wFin + refRating * wRef).toFixed(2));

  const handleSaveEvaluation = async (e) => {
    e.preventDefault();
    if (!applicationDetail) return;
    
    // Enforcement rule: Min score of 60 for approval
    if (decision === 'Approved' && overallCalculatedScore < weights.minApprovalScore) {
      alert(`Weighted overall score (${overallCalculatedScore}) is below the required approval threshold of ${weights.minApprovalScore}/100.`);
      return;
    }

    if (decision === 'Rejected' && !evalNotes.trim()) {
      alert('A reason is required to reject an application.');
      return;
    }

    setEvalSaving(true);
    try {
      const evalData = {
        technicalScore: techRating,
        financialScore: finRating,
        referenceScore: refRating,
        notes: evalNotes,
        decision // Approved or Rejected
      };

      await api.submitEvaluation(applicationDetail.id, evalData);
      
      // Reload application detail & grid lists
      handleOpenDetails(applicationDetail.id);
      loadApplications();
      alert('Evaluation submitted successfully!');
    } catch (err) {
      alert(err.message || 'Evaluation submission failed.');
    } finally {
      setEvalSaving(false);
    }
  };

  const handleFlagReEvaluation = async () => {
    try {
      await api.patchApplicationStatus(applicationDetail.id, 'Under Review', 'Flagged for re-evaluation.');
      handleOpenDetails(applicationDetail.id);
      loadApplications();
      alert('Application status set back to Under Review.');
    } catch (e) {
      alert('Failed to update status');
    }
  };

  return (
    <div className="space-y-6 page-enter text-left">
      
      {/* Header Panel */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">Staff Evaluation Console</h2>
          <p className="text-xs text-slate-400">Evaluate, rate, and manage vendor pre-qualification applications</p>
        </div>
      </div>

      {/* Main Grid: Applications Table / Filters */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Table & Search Filters */}
        <div className="xl:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col space-y-4 p-5">
          
          {/* Search Inputs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, ID, city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-primary-light"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 justify-center hover:bg-slate-100"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Advanced filter panels */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 overflow-hidden"
              >
                <div className="space-y-1">
                  <label>Status</label>
                  <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">All Statuses</option>
                    <option>Submitted</option>
                    <option>Under Review</option>
                    <option>Technical Evaluation</option>
                    <option>Financial Check</option>
                    <option>Approved</option>
                    <option>Rejected</option>
                    <option>Resubmit Required</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label>Category</label>
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">All Categories</option>
                    <option>Civil Works</option>
                    <option>Electrical Systems</option>
                    <option>Plumbing & Piping</option>
                    <option>HVAC & Mechanical</option>
                    <option>Structural Steel</option>
                    <option>Roads & Paving</option>
                    <option>Interior & Fit-out</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label>Min Score</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={minScore}
                    onChange={(e) => setMinScore(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label>Max Score</label>
                  <input
                    type="number"
                    placeholder="100"
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Applications list Table */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto text-xs">
            {loading ? (
              <ShimmerLoader type="table" />
            ) : applications.length === 0 ? (
              <div className="p-12 text-center text-slate-400 italic">
                No matching applications found
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left">Application ID</th>
                    <th className="px-4 py-3 text-left">Company Name</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-center">Auto Score</th>
                    <th className="px-4 py-3 text-center">Overall Score</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {applications.map((app) => {
                    const isSelected = selectedAppId === app.id;
                    
                    let statusBadge = "bg-slate-100 text-slate-600";
                    if (app.status === 'Approved') statusBadge = "bg-blue-50 text-blue-700 border border-blue-100";
                    else if (app.status === 'Rejected') statusBadge = "bg-rose-50 text-rose-700 border border-rose-100";
                    else if (app.status === 'Resubmit Required') statusBadge = "bg-amber-50 text-amber-700 border border-amber-100";
                    else if (app.status === 'Under Review') statusBadge = "bg-orange-50 text-orange-700 border border-orange-100 animate-pulse-ring";
                    
                    return (
                      <tr 
                        key={app.id} 
                        onClick={() => handleOpenDetails(app.id)}
                        className={`hover:bg-slate-50 cursor-pointer transition-colors ${isSelected ? 'bg-accent/5' : ''}`}
                      >
                        <td className="px-4 py-3 font-mono font-bold">{app.applicationId}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{app.companyName}</td>
                        <td className="px-4 py-3">{app.category}</td>
                        <td className="px-4 py-3 text-center text-slate-400 font-bold">{app.suggestedScore || 'N/A'}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800">{app.finalScore || 'Pending'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${statusBadge}`}>{app.status}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800"
                            title="Evaluate Application"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          <div className="flex justify-between items-center pt-2">
            <span className="text-[10px] text-slate-400 font-bold">Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 bg-slate-100 disabled:opacity-50 text-slate-700 rounded-lg font-bold"
              >
                Prev
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 bg-slate-100 disabled:opacity-50 text-slate-700 rounded-lg font-bold"
              >
                Next
              </button>
            </div>
          </div>

        </div>

        {/* Right Side: Tabbed Details View & Scoring Panel */}
        <div className="xl:col-span-1 space-y-6">
          <AnimatePresence mode="wait">
            {!selectedAppId ? (
              <motion.div
                key="empty"
                className="bg-slate-50 rounded-2xl border border-slate-200 p-8 text-center text-slate-400 italic min-h-[300px] flex flex-col justify-center items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Sliders className="w-10 h-10 mb-2 text-slate-300" />
                <p className="text-xs">Select an application from the table list to initiate evaluation ratings and audit histories.</p>
              </motion.div>
            ) : detailLoading ? (
              <motion.div
                key="loading"
                className="bg-slate-50 rounded-2xl border border-slate-200 p-8 min-h-[300px] flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
              </motion.div>
            ) : (
              <motion.div
                key="details"
                className="bg-slate-50 border border-slate-200 rounded-2xl shadow-sm p-5 space-y-5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800 truncate max-w-[200px]" title={applicationDetail?.companyName}>
                      {applicationDetail?.companyName}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">{applicationDetail?.applicationId}</p>
                  </div>
                  <button onClick={handleCloseDetails} className="text-xs font-bold text-slate-400 hover:text-slate-600">
                    Close ×
                  </button>
                </div>

                {/* Sub Tab buttons */}
                <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-2 text-[10px] font-bold text-slate-400">
                  {[
                    { id: 'profile', label: 'Profile' },
                    { id: 'technical', label: 'Tech' },
                    { id: 'references', label: 'Refs' },
                    { id: 'financial', label: 'Fin' },
                    { id: 'documents', label: 'Docs' },
                    { id: 'audit', label: 'Audit' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setDetailTab(tab.id)}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        detailTab === tab.id ? 'bg-accent text-white' : 'hover:bg-slate-100 hover:text-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab content area */}
                <div className="max-h-72 overflow-y-auto text-xs text-slate-600 space-y-3 pr-1 font-medium text-left">
                  
                  {detailTab === 'profile' && (
                    <div className="space-y-2">
                      <p><span className="font-bold text-slate-800">Incorporation Date:</span> {applicationDetail?.incorporationDate || 'N/A'}</p>
                      <p><span className="font-bold text-slate-800">Registration ID:</span> {applicationDetail?.regNo}</p>
                      <p><span className="font-bold text-slate-800">PAN:</span> {applicationDetail?.pan}</p>
                      <p><span className="font-bold text-slate-800">GST ID:</span> {applicationDetail?.gst}</p>
                      <p><span className="font-bold text-slate-800">Address:</span> {applicationDetail?.address}, {applicationDetail?.city}, {applicationDetail?.state} - {applicationDetail?.pincode}</p>
                      <p><span className="font-bold text-slate-800">Website:</span> <a href={`https://${applicationDetail?.website}`} target="_blank" className="text-accent underline">{applicationDetail?.website}</a></p>
                      <p><span className="font-bold text-slate-800 font-poppins block mt-1.5">Profile Description:</span> {applicationDetail?.description}</p>
                    </div>
                  )}

                  {detailTab === 'technical' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <p><span className="font-bold text-slate-800">Max Capacity:</span> {applicationDetail?.technicalDetails?.maxCapacity} Projects</p>
                        <p><span className="font-bold text-slate-800">Active count:</span> {applicationDetail?.technicalDetails?.currentProjects}</p>
                        <p><span className="font-bold text-slate-800">Team Size:</span> {applicationDetail?.technicalDetails?.teamStrength} Staffs</p>
                        <p><span className="font-bold text-slate-800">Safety Index:</span> {applicationDetail?.technicalDetails?.safetyScore}/100</p>
                      </div>
                      <p><span className="font-bold text-slate-800">ISO Certifications:</span> {
                        JSON.parse(applicationDetail?.technicalDetails?.certifications || '[]').join(', ') || 'None listed'
                      }</p>
                      <div>
                        <span className="font-bold text-slate-800 block mb-1">Equipment Catalog:</span>
                        <div className="border border-slate-200 rounded-lg overflow-hidden text-[11px] font-medium">
                          <table className="w-full">
                            <thead className="bg-slate-50 text-slate-400">
                              <tr>
                                <th className="px-2.5 py-1 text-left">Equipment</th>
                                <th className="px-2.5 py-1 text-center w-12">Qty</th>
                                <th className="px-2.5 py-1 text-center w-16">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {JSON.parse(applicationDetail?.technicalDetails?.equipment || '[]').map((eq, i) => (
                                <tr key={i}>
                                  <td className="px-2.5 py-1.5">{eq.name}</td>
                                  <td className="px-2.5 py-1.5 text-center">{eq.qty}</td>
                                  <td className="px-2.5 py-1.5 text-center">{eq.condition}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {detailTab === 'references' && (
                    <div className="space-y-3">
                      {applicationDetail?.projectReferences.length === 0 ? (
                        <p className="italic text-slate-400">No project references submitted</p>
                      ) : (
                        applicationDetail?.projectReferences.map((ref, idx) => (
                          <div key={ref.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                            <p className="font-bold text-slate-800">#{idx + 1}: {ref.projectName}</p>
                            <p><span className="font-bold text-slate-800">Client:</span> {ref.clientName} | <span className="font-bold text-slate-800">Value:</span> ₹{ref.contractValue.toLocaleString()}</p>
                            <p><span className="font-bold text-slate-800">Completion:</span> {ref.status} | <span className="font-bold text-slate-800">Contact:</span> {ref.clientContact}</p>
                            {ref.description && <p className="text-[10px] text-slate-400 block">{ref.description}</p>}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {detailTab === 'financial' && (
                    <div className="space-y-2">
                      <p><span className="font-bold text-slate-800">FY 2024 Turnover:</span> ₹{applicationDetail?.financialDetails?.turnoverY1.toLocaleString()}</p>
                      <p><span className="font-bold text-slate-800">FY 2023 Turnover:</span> ₹{applicationDetail?.financialDetails?.turnoverY2.toLocaleString()}</p>
                      <p><span className="font-bold text-slate-800">FY 2022 Turnover:</span> ₹{applicationDetail?.financialDetails?.turnoverY3.toLocaleString()}</p>
                      <p><span className="font-bold text-slate-800">Net Worth:</span> ₹{applicationDetail?.financialDetails?.netWorth.toLocaleString()}</p>
                      <p><span className="font-bold text-slate-800">Liabilities:</span> ₹{applicationDetail?.financialDetails?.liabilities.toLocaleString()}</p>
                      <p><span className="font-bold text-slate-800">Banker:</span> {applicationDetail?.financialDetails?.bankName} ({applicationDetail?.financialDetails?.bankAccountType})</p>
                      <p><span className="font-bold text-slate-800 font-mono">Credit rating:</span> {applicationDetail?.financialDetails?.creditRating}</p>
                      <p><span className="font-bold text-slate-800 font-mono">EMD Capability:</span> ₹{applicationDetail?.financialDetails?.emdCapability.toLocaleString()}</p>
                      <p><span className="font-bold text-slate-800">Clean history / BlacklistStatus:</span> {applicationDetail?.financialDetails?.blacklistStatus}</p>
                      {applicationDetail?.financialDetails?.blacklistStatus === 'Yes' && (
                        <p className="text-rose-600 bg-rose-50 p-2 rounded border border-rose-100 font-semibold mt-1">
                          Blacklist reason: {applicationDetail?.financialDetails?.blacklistReason}
                        </p>
                      )}
                    </div>
                  )}

                  {detailTab === 'documents' && (
                    <div className="space-y-2">
                      {applicationDetail?.documents.length === 0 ? (
                        <p className="italic text-slate-400">No documents uploaded</p>
                      ) : (
                        applicationDetail?.documents.map((doc) => (
                          <div key={doc.id} className="flex justify-between items-center p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-800">{doc.docType}</p>
                              <p className="text-[10px] text-slate-400 truncate">{doc.fileName}</p>
                            </div>
                            <a
                              href={`http://localhost:5000${doc.fileUrl}`}
                              target="_blank"
                              download
                              className="p-1 rounded text-slate-400 hover:text-slate-800 shrink-0 ml-3"
                              title="Download Doc"
                            >
                              <Download className="w-4.5 h-4.5" />
                            </a>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {detailTab === 'audit' && (
                    <div className="space-y-2 pt-1 pr-1">
                      {auditLogs.length === 0 ? (
                        <p className="italic text-slate-400">No audit logs for this application</p>
                      ) : (
                        auditLogs.map((log) => (
                          <div key={log.id} className="border-b border-slate-100 pb-1.5 last:border-0 text-[11px]">
                            <p className="text-slate-800">
                              <span className="font-bold text-slate-900">{log.user?.name || 'System'}</span>:{' '}
                              {log.action.replace('_', ' ').toLowerCase()}:{' '}
                              <span className="font-mono bg-slate-50 px-1 py-0.5 text-accent rounded">{log.newValue || log.entityId}</span>
                            </p>
                            <span className="text-[9px] text-slate-400">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                </div>

                {/* Scoring Panel Form */}
                <form onSubmit={handleSaveEvaluation} className="pt-4 border-t border-slate-100 space-y-4 text-xs font-bold text-slate-500">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-800">Committee Scoring Panel</h4>
                    <span className="text-[11px] font-mono text-slate-400">Qualify threshold: {weights.minApprovalScore}/100</span>
                  </div>

                  {/* Sliders */}
                  <div className="space-y-3.5">
                    
                    {/* Technical Rating */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span>Rate Technical Capacity (40% Weight)</span>
                        <span className="text-slate-800 font-bold">{techRating}/100</span>
                      </div>
                      <input
                        type="range" min="0" max="100" value={techRating}
                        onChange={(e) => setTechRating(parseInt(e.target.value))}
                        className="w-full accent-accent bg-slate-100 h-1 rounded cursor-pointer"
                      />
                    </div>

                    {/* Financial Rating */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span>Rate Financial standing (35% Weight)</span>
                        <span className="text-slate-800 font-bold">{finRating}/100</span>
                      </div>
                      <input
                        type="range" min="0" max="100" value={finRating}
                        onChange={(e) => setFinRating(parseInt(e.target.value))}
                        className="w-full accent-accent bg-slate-100 h-1 cursor-pointer"
                      />
                    </div>

                    {/* Reference Rating */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span>Rate References history (25% Weight)</span>
                        <span className="text-slate-800 font-bold">{refRating}/100</span>
                      </div>
                      <input
                        type="range" min="0" max="100" value={refRating}
                        onChange={(e) => setRefRating(parseInt(e.target.value))}
                        className="w-full accent-accent bg-slate-100 h-1 cursor-pointer"
                      />
                    </div>

                  </div>

                  {/* Overall Calculated Display */}
                  <div className="bg-accent text-white rounded-xl p-3.5 flex justify-between items-center text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">WEIGHTED OVERALL SCORE</p>
                      <p className="text-lg font-black mt-0.5">{overallCalculatedScore} <span className="text-[10px] font-bold text-slate-400">/100</span></p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      overallCalculatedScore >= weights.minApprovalScore ? 'bg-blue-500 text-white' : 'bg-rose-500 text-white'
                    }`}>{overallCalculatedScore >= weights.minApprovalScore ? 'Qualifies' : 'Below min score'}</span>
                  </div>

                  {/* Rich-like Comment Area */}
                  <div className="space-y-1">
                    <label>Committee Comments / Evaluation Notes</label>
                    <textarea
                      rows={2.5}
                      required={decision === 'Rejected'}
                      value={evalNotes}
                      onChange={(e) => setEvalNotes(e.target.value)}
                      placeholder="Add remarks about safety score, Solvency rating or Turnover limits..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-primary-light focus:outline-none font-medium text-slate-700 bg-transparent"
                    />
                  </div>

                  {/* Decision selector */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setDecision('Approved')}
                      className={`py-2 border rounded-xl flex items-center justify-center gap-1 font-bold ${
                        decision === 'Approved' ? 'bg-blue-50 border-blue-500 text-blue-800' : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <CheckSquare className="w-4.5 h-4.5" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecision('Rejected')}
                      className={`py-2 border rounded-xl flex items-center justify-center gap-1 font-bold ${
                        decision === 'Rejected' ? 'bg-rose-50 border-rose-500 text-rose-800' : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <XSquare className="w-4.5 h-4.5" />
                      Reject
                    </button>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleFlagReEvaluation}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <Flag className="w-4 h-4 text-slate-400" />
                      Re-review
                    </button>
                    
                    <button
                      type="submit"
                      disabled={evalSaving}
                      className="flex-1 py-2.5 bg-accent hover:bg-accent-dark disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-accent/10 flex items-center justify-center gap-1.5"
                    >
                      {evalSaving ? 'Submitting...' : 'Submit Score'}
                    </button>
                  </div>

                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
