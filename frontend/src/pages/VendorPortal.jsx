import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, Clock, XCircle, AlertTriangle, FileDown, 
  HelpCircle, RefreshCcw, BellRing, Award, FileCheck
} from 'lucide-react';
import { api } from '../utils/api';
import ShimmerLoader from '../components/ShimmerLoader';

const TIMELINE_STEPS = [
  { id: 'Draft', label: 'Application Draft' },
  { id: 'Submitted', label: 'Forms Submitted' },
  { id: 'Under Review', label: 'Under Review' },
  { id: 'Technical Evaluation', label: 'Technical Review' },
  { id: 'Financial Check', label: 'Financial Audits' },
  { id: 'Approved', label: 'Empanelled' }
];

export default function VendorPortal({ setCurrentTab }) {
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [renewalLoading, setRenewalLoading] = useState(false);

  useEffect(() => {
    loadContractorData();
  }, []);

  const loadContractorData = async () => {
    setLoading(true);
    try {
      const user = api.getCurrentUser();
      
      // Fetch all applications and find the ones matching this contractor company
      const appRes = await api.getApplications({ limit: 100 });
      const myApps = appRes.data.filter(a => a.companyName === user.name);

      if (myApps.length > 0) {
        const statusRank = {
          'Draft': 0,
          'Submitted': 1,
          'Under Review': 2,
          'Technical Evaluation': 3,
          'Financial Check': 4,
          'Resubmit Required': 5,
          'Rejected': 6,
          'Approved': 7
        };
        const myApp = myApps.sort((a, b) => {
          const rankA = statusRank[a.status] || 0;
          const rankB = statusRank[b.status] || 0;
          if (rankB !== rankA) return rankB - rankA;
          return b.applicationId.localeCompare(a.applicationId);
        })[0];

        const detail = await api.getApplicationById(myApp.id);
        setApplication(detail);
        localStorage.setItem('selectedApplicationId', detail.id);

        // Fetch evaluations
        const evals = await api.getEvaluations(detail.id);
        setEvaluations(evals);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReEmpanel = async () => {
    if (!application) return;
    setRenewalLoading(true);
    try {
      const clone = await api.reEmpanel(application.id);
      localStorage.setItem('selectedApplicationId', clone.id);
      setCurrentTab('wizard');
    } catch (e) {
      alert(e.message || 'Failed to start renewal process');
    } finally {
      setRenewalLoading(false);
    }
  };

  if (loading) {
    return <ShimmerLoader type="dashboard" />;
  }

  if (!application) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6 page-enter">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
          <HelpCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-800">No Application Found</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You haven't initiated an empanelment application yet. Start your pre-qualification form to join the vendor list.
          </p>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('selectedApplicationId');
            setCurrentTab('wizard');
          }}
          className="px-5 py-2.5 bg-accent hover:bg-accent-dark text-white font-bold rounded-xl text-xs shadow"
        >
          Create Pre-qualification Draft
        </button>
      </div>
    );
  }

  // Find step index in timeline
  let activeStepIdx = TIMELINE_STEPS.findIndex(s => s.id === application.status);
  if (application.status === 'Rejected' || application.status === 'Resubmit Required') {
    // Show under review/evaluation index as reference point
    activeStepIdx = 3;
  }
  const isApproved = application.status === 'Approved';
  const isRejected = application.status === 'Rejected';
  const isResubmit = application.status === 'Resubmit Required';
  const latestEval = evaluations[0] || null;

  return (
    <div className="space-y-6 page-enter max-w-4xl mx-auto text-left">
      
      {/* Top Header Panel */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">VENDOR PRE-QUALIFICATION</span>
          <h2 className="text-xl font-extrabold text-slate-800 font-outfit mt-0.5">{application.companyName}</h2>
          <p className="text-xs text-slate-400 mt-0.5">Application ID: <span className="font-mono font-bold text-slate-600">{application.applicationId}</span></p>
        </div>

        <div className="flex gap-2">
          {isApproved && (
            <>
              {/* Print empanelment card mock */}
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-accent hover:bg-accent-light text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow"
              >
                <FileDown className="w-4 h-4" />
                <span>Certificate</span>
              </button>

              <button
                onClick={handleReEmpanel}
                disabled={renewalLoading}
                className="px-4 py-2 bg-accent hover:bg-accent-dark disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow"
              >
                <RefreshCcw className="w-4 h-4" />
                <span>Apply Renewal</span>
              </button>
            </>
          )}

          {(isResubmit || application.status === 'Draft') && (
            <button
              onClick={() => {
                localStorage.setItem('selectedApplicationId', application.id);
                setCurrentTab('wizard');
              }}
              className="px-5 py-2 bg-accent hover:bg-accent-light text-white font-bold rounded-xl text-xs shadow"
            >
              Resume Pre-qualification Form
            </button>
          )}
        </div>
      </div>

      {/* Main Status Tracker Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Timeline tracker */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-2 space-y-6">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Empanelment Timeline</h3>
          
          <div className="space-y-5 relative pl-4 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
            {TIMELINE_STEPS.map((step, idx) => {
              const completed = idx < activeStepIdx;
              const current = idx === activeStepIdx;
              const future = idx > activeStepIdx;
              
              let badgeColor = "bg-slate-100 text-slate-400 border-slate-200";
              let icon = <Clock className="w-4 h-4 text-slate-400" />;
              
              if (completed) {
                badgeColor = "bg-blue-50 text-blue-600 border-blue-200";
                icon = <CheckCircle2 className="w-4 h-4 text-blue-500" />;
              } else if (current) {
                if (isRejected) {
                  badgeColor = "bg-rose-50 text-rose-600 border-rose-200 animate-pulse-ring";
                  icon = <XCircle className="w-4 h-4 text-rose-500" />;
                } else if (isResubmit) {
                  badgeColor = "bg-amber-50 text-amber-600 border-amber-200";
                  icon = <AlertTriangle className="w-4 h-4 text-amber-500 animate-bounce" />;
                } else {
                  badgeColor = "bg-accent text-white border-accent-dark";
                  icon = <span className="w-2 h-2 rounded-full bg-white animate-ping" />;
                }
              }

              return (
                <div key={step.id} className="flex gap-4 items-start text-xs leading-relaxed relative">
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 z-10 bg-white ${badgeColor}`}>
                    {icon}
                  </div>
                  <div className="pt-1 text-left">
                    <p className={`font-bold ${current ? 'text-slate-900' : 'text-slate-500'}`}>{step.label}</p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {current 
                        ? `Current Stage: ${isRejected ? 'Rejected' : isResubmit ? 'Resubmit Needed' : 'Pending Evaluation'}`
                        : completed 
                          ? 'Passed Verification' 
                          : 'Awaiting prior steps approval'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status card summaries */}
        <div className="space-y-6">
          
          {/* Main decision Alert */}
          <div className={`p-5 rounded-2xl border shadow-sm space-y-3 ${
            isApproved 
              ? 'bg-blue-50 border-blue-200 text-blue-800' 
              : isRejected 
                ? 'bg-rose-50 border-rose-200 text-rose-800' 
                : isResubmit 
                  ? 'bg-amber-50 border-amber-200 text-amber-800' 
                  : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <h4 className="text-xs font-extrabold uppercase tracking-wider block">APPLICATION DECISION</h4>
            <div className="flex gap-2.5 items-center">
              <span className="text-2xl font-bold font-outfit">
                {application.status}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed opacity-90 font-medium">
              {isApproved 
                ? 'Empanelment is active for 2 years. Download certificate and review instructions.' 
                : isRejected 
                  ? `Pre-qualification rejected. Reason: ${latestEval?.notes || 'Does not meet qualifying thresholds.'}` 
                  : isResubmit 
                    ? `Additional information requested. Click edit to update details: ${latestEval?.notes}` 
                    : 'The evaluation committee is currently reviewing your technical capacities.'}
            </p>
          </div>

          {/* Doc Checklist Status */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">Document Compliance</h3>
            <div className="space-y-2 text-[11px] font-bold text-slate-600">
              {['Registration', 'GST', 'PAN', 'BalanceSheet', 'BankSolvency'].map((dType) => {
                const doc = application.documents.find(d => d.docType === dType);
                return (
                  <div key={dType} className="flex justify-between items-center py-1">
                    <span className="text-slate-500 font-semibold">{dType} Certificate</span>
                    {doc ? (
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-blue-500" />
                        Received
                      </span>
                    ) : (
                      <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        Missing
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* Empanelment Card Printable (Hidden in UI, Visible on Print) */}
      {isApproved && (
        <div className="hidden print-only max-w-2xl mx-auto border-4 border-double border-primary-light p-8 rounded-xl bg-white text-center space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-black font-outfit uppercase tracking-wider text-slate-900">AVINASH KANAPARTHI INFRA PRIVATE LIMITED</h1>
            <p className="text-[10px] font-bold text-slate-400 tracking-widest">REGISTRY OF CERTIFIED VENDORS</p>
          </div>
          
          <div className="py-8 border-y-2 border-slate-900 space-y-4">
            <p className="text-sm font-medium text-slate-600">This is to certify that the contractor</p>
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">{application.companyName}</h2>
            <p className="text-xs text-slate-500">has successfully cleared all pre-qualification milestones and is empanelled under work categories:</p>
            <div className="flex gap-2 justify-center py-2">
              {application.technicalDetails && JSON.parse(application.technicalDetails.categories || '[]').map(c => (
                <span key={c} className="border border-primary-light text-slate-800 px-3 py-1 rounded text-xs font-bold">{c}</span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-semibold pt-4">
            <div className="text-left space-y-1">
              <p className="text-slate-400 uppercase text-[9px]">Empanelment ID</p>
              <p className="font-mono text-slate-800">{application.applicationId}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-slate-400 uppercase text-[9px]">Certificate Validity</p>
              <p className="text-slate-800">
                {new Date(latestEval?.evaluatedAt || Date.now()).toLocaleDateString()} to{' '}
                {new Date(new Date(latestEval?.evaluatedAt || Date.now()).setFullYear(new Date(latestEval?.evaluatedAt || Date.now()).getFullYear() + 2)).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
