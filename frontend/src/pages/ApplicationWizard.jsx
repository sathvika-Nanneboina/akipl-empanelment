import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, HardHat, FileText, CheckCircle2, ChevronRight, ChevronLeft, 
  Trash2, Plus, UploadCloud, Info, AlertCircle, Save, Check, FileCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../utils/api';

const STEPS = [
  { label: 'Company Info', icon: Building2 },
  { label: 'Technical Capacity', icon: HardHat },
  { label: 'Past References', icon: FileCheck },
  { label: 'Financial Standing', icon: FileSpreadsheetIcon },
  { label: 'Documents Upload', icon: UploadCloud },
  { label: 'Review & Submit', icon: CheckCircle2 }
];

function FileSpreadsheetIcon(props) {
  return <FileText {...props} />;
}

const CATEGORIES = [
  'Civil Works', 'Electrical Systems', 'Plumbing & Piping', 
  'HVAC & Mechanical', 'Structural Steel', 'Roads & Paving', 'Interior & Fit-out'
];

const ISO_LIST = ['ISO 9001:2015', 'ISO 14001:2015', 'ISO 45001:2018', 'ISO 27001:2022'];

export default function ApplicationWizard({ setCurrentTab }) {
  const [activeStep, setActiveStep] = useState(0);
  const [appId, setAppId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // 'Saving...', 'Saved', etc.
  
  // ==========================================
  // FORM STATE
  // ==========================================
  const [formData, setFormData] = useState({
    // Step 1: Company Info
    companyName: '',
    regNo: '',
    incorporationDate: '',
    companyType: 'Private Limited',
    pan: '',
    gst: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    website: '',
    description: '',

    // Step 2: Technical Capacity
    categories: [], // multi-select
    equipment: [],  // [{name, qty, condition}]
    maxCapacity: 5,
    currentProjects: 2,
    teamStrength: 10,
    certifications: [], // checkboxes
    safetyScore: 80,

    // Step 3: Past Projects (up to 10)
    projectReferences: [], // [{projectName, clientName, contractValue, startDate, endDate, type, status, clientContact, description}]

    // Step 4: Financial Standing
    turnoverY1: '',
    turnoverY2: '',
    turnoverY3: '',
    netWorth: '',
    liabilities: '',
    bankName: '',
    bankAccountType: 'Current',
    creditRating: 'A',
    emdCapability: '',
    blacklistStatus: 'No',
    blacklistReason: '',

    // Step 5: Document IDs and upload states
    documents: [] // [{id, docType, fileName, fileUrl}]
  });

  const [errors, setErrors] = useState({});
  const [successSubmit, setSuccessSubmit] = useState(false);
  
  // Temporary state variables for entry inputs
  const [searchCategory, setSearchCategory] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [tempEquip, setTempEquip] = useState({ name: '', qty: 1, condition: 'Good' });
  
  // Document upload progresses simulated
  const [uploadingDoc, setUploadingDoc] = useState({}); // { [docType]: percentage }

  // Auto-save ref
  const autoSaveTimerRef = useRef(null);

  // Initialize or fetch draft
  useEffect(() => {
    const initializeWizard = async () => {
      const existingId = localStorage.getItem('selectedApplicationId');
      if (existingId) {
        setAppId(existingId);
        loadDraftDetails(existingId);
        return;
      }

      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'CONTRACTOR') {
          const res = await api.getApplications({ limit: 10 });
          // Find any active draft or resubmit-required application
          const existingApp = res.data.find(a => a.status === 'Draft' || a.status === 'Resubmit Required');
          if (existingApp) {
            setAppId(existingApp.id);
            localStorage.setItem('selectedApplicationId', existingApp.id);
            loadDraftDetails(existingApp.id);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to look up existing contractor applications', err);
      }

      // Otherwise, create a new draft
      createNewDraft();
    };

    initializeWizard();

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, []);

  // Setup auto-save every 30 seconds
  useEffect(() => {
    if (appId && activeStep < 5 && !successSubmit) {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setInterval(() => {
        saveDraft(true);
      }, 30000);
    }
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [appId, formData, activeStep, successSubmit]);

  const loadDraftDetails = async (id) => {
    setLoading(true);
    try {
      const data = await api.getApplicationById(id);
      
      // Parse JSON database arrays
      let parsedCategories = [];
      let parsedEquipment = [];
      let parsedCerts = [];
      
      if (data.technicalDetails) {
        try {
          parsedCategories = JSON.parse(data.technicalDetails.categories || '[]');
          parsedEquipment = JSON.parse(data.technicalDetails.equipment || '[]');
          parsedCerts = JSON.parse(data.technicalDetails.certifications || '[]');
        } catch (e) {
          console.error(e);
        }
      }

      setFormData({
        companyName: data.companyName || '',
        regNo: data.regNo || '',
        incorporationDate: data.incorporationDate || '',
        companyType: data.companyType || 'Private Limited',
        pan: data.pan || '',
        gst: data.gst || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
        website: data.website || '',
        description: data.description || '',

        // Technical
        categories: parsedCategories,
        equipment: parsedEquipment,
        maxCapacity: data.technicalDetails?.maxCapacity ?? 5,
        currentProjects: data.technicalDetails?.currentProjects ?? 2,
        teamStrength: data.technicalDetails?.teamStrength ?? 10,
        certifications: parsedCerts,
        safetyScore: data.technicalDetails?.safetyScore ?? 80,

        // References
        projectReferences: data.projectReferences || [],

        // Financial
        turnoverY1: data.financialDetails?.turnoverY1 || '',
        turnoverY2: data.financialDetails?.turnoverY2 || '',
        turnoverY3: data.financialDetails?.turnoverY3 || '',
        netWorth: data.financialDetails?.netWorth || '',
        liabilities: data.financialDetails?.liabilities || '',
        bankName: data.financialDetails?.bankName || '',
        bankAccountType: data.financialDetails?.bankAccountType || 'Current',
        creditRating: data.financialDetails?.creditRating || 'A',
        emdCapability: data.financialDetails?.emdCapability || '',
        blacklistStatus: data.financialDetails?.blacklistStatus || 'No',
        blacklistReason: data.financialDetails?.blacklistReason || '',

        // Docs
        documents: data.documents || []
      });
    } catch (e) {
      console.error('Failed to load draft details, clearing stale ID and creating new draft:', e);
      localStorage.removeItem('selectedApplicationId');
      setAppId(null);
      createNewDraft();
    } finally {
      setLoading(false);
    }
  };

  const createNewDraft = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const companyName = user.role === 'CONTRACTOR' ? (user.name || 'Draft Company') : 'Draft Company';
      const draft = await api.createDraft(companyName);
      setAppId(draft.id);
      localStorage.setItem('selectedApplicationId', draft.id);
      setFormData(prev => ({
        ...prev,
        companyName: draft.companyName
      }));
    } catch (e) {
      console.error(e);
    }
  };

  const saveDraft = async (silent = false) => {
    if (!appId) return;
    if (!silent) setSaveStatus('Saving Draft...');
    else setSaveStatus('Auto-saving...');

    try {
      // Build body structure for the PUT endpoint
      const body = {
        companyName: formData.companyName,
        regNo: formData.regNo,
        pan: formData.pan,
        gst: formData.gst,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        website: formData.website,
        description: formData.description,
        technicalDetails: {
          categories: formData.categories,
          maxCapacity: formData.maxCapacity,
          currentProjects: formData.currentProjects,
          teamStrength: formData.teamStrength,
          certifications: formData.certifications,
          safetyScore: formData.safetyScore,
          equipment: formData.equipment
        },
        financialDetails: {
          turnoverY1: formData.turnoverY1,
          turnoverY2: formData.turnoverY2,
          turnoverY3: formData.turnoverY3,
          netWorth: formData.netWorth,
          liabilities: formData.liabilities,
          bankName: formData.bankName,
          bankAccountType: formData.bankAccountType,
          creditRating: formData.creditRating,
          emdCapability: formData.emdCapability,
          blacklistStatus: formData.blacklistStatus,
          blacklistReason: formData.blacklistReason
        },
        projectReferences: formData.projectReferences,
        submit: false // Keeps status as Draft
      };

      await api.updateApplication(appId, body);
      setSaveStatus('Draft Saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (e) {
      setSaveStatus('Save Failed');
    }
  };

  // ==========================================
  // STEP VALIDATIONS
  // ==========================================
  const validateStep = (step) => {
    const errs = {};
    if (step === 0) {
      if (!formData.companyName.trim()) errs.companyName = 'Company name is required';
      if (!formData.regNo.trim()) errs.regNo = 'Registration number is required';
      if (!formData.pan.trim()) errs.pan = 'PAN is required';
      if (!formData.gst.trim()) errs.gst = 'GST is required';
      if (!formData.address.trim()) errs.address = 'Address is required';
      if (!formData.city.trim()) errs.city = 'City is required';
      if (!formData.state.trim()) errs.state = 'State is required';
      if (!formData.pincode.trim() || formData.pincode.length !== 6) errs.pincode = 'Valid 6-digit Pincode is required';
    } else if (step === 1) {
      if (formData.categories.length === 0) errs.categories = 'Select at least one Work Category';
      if (formData.maxCapacity <= 0) errs.maxCapacity = 'Max concurrent capacity must be greater than 0';
    } else if (step === 2) {
      if (formData.projectReferences.length === 0) errs.projectReferences = 'Provide at least one past reference project';
    } else if (step === 3) {
      if (!formData.turnoverY1 || !formData.turnoverY2 || !formData.turnoverY3) errs.turnover = 'All 3 years turnovers are required';
      if (!formData.netWorth) errs.netWorth = 'Net Worth is required';
      if (!formData.bankName) errs.bankName = 'Bank Name is required';
    } else if (step === 4) {
      const requiredDocs = ['Registration', 'GST', 'PAN', 'BalanceSheet', 'BankSolvency'];
      const uploadedTypes = formData.documents.map(d => d.docType);
      const missing = requiredDocs.filter(t => !uploadedTypes.includes(t));
      if (missing.length > 0) {
        errs.documents = `Please upload remaining required documents: ${missing.join(', ')}`;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      saveDraft(true);
      setActiveStep(prev => Math.min(prev + 1, STEPS.length - 1));
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
    window.scrollTo(0, 0);
  };

  // Keyboard navigation support
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleNext();
    }
  };

  // ==========================================
  // FIELD HANDLERS
  // ==========================================
  const updateField = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Step 2 handlers: Categories
  const addCategory = (cat) => {
    if (!formData.categories.includes(cat)) {
      updateField('categories', [...formData.categories, cat]);
    }
    setSearchCategory('');
    setShowCategoryDropdown(false);
  };

  const removeCategory = (cat) => {
    updateField('categories', formData.categories.filter(c => c !== cat));
  };

  // Equipment table rows
  const addEquipmentRow = () => {
    if (!tempEquip.name) return;
    updateField('equipment', [...formData.equipment, tempEquip]);
    setTempEquip({ name: '', qty: 1, condition: 'Good' });
  };

  const removeEquipmentRow = (idx) => {
    updateField('equipment', formData.equipment.filter((_, i) => i !== idx));
  };

  // Step 3 handlers: Project References
  const addProject = () => {
    if (formData.projectReferences.length >= 10) return;
    const newProj = {
      projectName: '', clientName: '', contractValue: '',
      startDate: '', endDate: '', type: formData.categories[0] || 'Civil Works',
      status: 'Completed', clientContact: '', description: ''
    };
    updateField('projectReferences', [...formData.projectReferences, newProj]);
  };

  const removeProject = (idx) => {
    updateField('projectReferences', formData.projectReferences.filter((_, i) => i !== idx));
  };

  const updateProjectField = (idx, field, val) => {
    const updated = [...formData.projectReferences];
    updated[idx][field] = val;
    updateField('projectReferences', updated);
  };

  // Step 5: Document Upload simulation
  const handleFileUpload = (docType, file) => {
    if (!file) return;
    
    // Simulate upload progress
    setUploadingDoc(prev => ({ ...prev, [docType]: 10 }));
    let progress = 10;
    const timer = setInterval(async () => {
      progress += 20;
      if (progress >= 100) {
        clearInterval(timer);
        setUploadingDoc(prev => ({ ...prev, [docType]: 100 }));
        
        try {
          const doc = await api.uploadDocument(appId, docType, file);
          updateField('documents', [...formData.documents, doc]);
          
          setTimeout(() => {
            setUploadingDoc(prev => {
              const copy = { ...prev };
              delete copy[docType];
              return copy;
            });
          }, 1000);
        } catch (e) {
          alert('Upload failed: ' + (e.message || 'Unknown error'));
          setUploadingDoc(prev => {
            const copy = { ...prev };
            delete copy[docType];
            return copy;
          });
        }
      } else {
        setUploadingDoc(prev => ({ ...prev, [docType]: progress }));
      }
    }, 150);
  };

  const removeDocument = (docId) => {
    updateField('documents', formData.documents.filter(d => d.id !== docId));
  };

  // ==========================================
  // FINAL SUBMISSION
  // ==========================================
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  const handleSubmit = async () => {
    if (!declarationAccepted) {
      alert('You must accept the terms declaration before submitting.');
      return;
    }

    setLoading(true);
    try {
      const body = {
        companyName: formData.companyName,
        regNo: formData.regNo,
        pan: formData.pan,
        gst: formData.gst,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        website: formData.website,
        description: formData.description,
        technicalDetails: {
          categories: formData.categories,
          maxCapacity: formData.maxCapacity,
          currentProjects: formData.currentProjects,
          teamStrength: formData.teamStrength,
          certifications: formData.certifications,
          safetyScore: formData.safetyScore,
          equipment: formData.equipment
        },
        financialDetails: {
          turnoverY1: formData.turnoverY1,
          turnoverY2: formData.turnoverY2,
          turnoverY3: formData.turnoverY3,
          netWorth: formData.netWorth,
          liabilities: formData.liabilities,
          bankName: formData.bankName,
          bankAccountType: formData.bankAccountType,
          creditRating: formData.creditRating,
          emdCapability: formData.emdCapability,
          blacklistStatus: formData.blacklistStatus,
          blacklistReason: formData.blacklistReason
        },
        projectReferences: formData.projectReferences,
        submit: true // Triggers "Submitted" status state change in backend
      };

      await api.updateApplication(appId, body);
      
      // Fire success confetti!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      setSuccessSubmit(true);
      localStorage.removeItem('selectedApplicationId'); // Clear from draft tracking
    } catch (e) {
      alert(e.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (successSubmit) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6 page-enter">
        <motion.div
          className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-md"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
        >
          <Check className="w-10 h-10 stroke-[3]" />
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-slate-800">Application Submitted!</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Your pre-qualification and empanelment application has been received successfully. Our review panel will evaluate your technical capacity, references, and financial standing.
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-left max-w-sm mx-auto space-y-2 text-xs">
          <p className="text-slate-500 font-bold">NEXT STEPS:</p>
          <ul className="list-disc pl-4 space-y-1.5 text-slate-600 font-medium">
            <li>Application enters <span className="font-bold text-accent">Under Review</span> stage.</li>
            <li>Evaluators verify uploaded CA and GST certificates.</li>
            <li>Audit checks run on past client references.</li>
            <li>Decision notification triggers within 7-10 business days.</li>
          </ul>
        </div>
        <div>
          <button
            onClick={() => {
              const user = JSON.parse(localStorage.getItem('user') || '{}');
              const userRole = (user.role || 'STAFF').toUpperCase();
              setCurrentTab(userRole === 'CONTRACTOR' ? 'timeline' : 'applications');
            }}
            className="px-6 py-2.5 bg-accent text-white font-bold rounded-xl text-xs hover:bg-accent-light shadow-md"
          >
            Track Application Status
          </button>
        </div>
      </div>
    );
  }

  const completionPercent = Math.round(((activeStep + 1) / STEPS.length) * 100);

  return (
    <div onKeyDown={handleKeyDown} className="space-y-6 page-enter max-w-5xl mx-auto">
      
      {/* Top Header & Save Status indicator */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 text-left">Empanelment Application Wizard</h2>
          <p className="text-xs text-slate-400 text-left">Fill in all details to apply for pre-qualification</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
          {saveStatus && (
            <motion.span 
              className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full flex items-center gap-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Save className="w-3.5 h-3.5 text-slate-400 animate-spin" />
              {saveStatus}
            </motion.span>
          )}
        </div>
      </div>

      {/* Top Wizard Indicator Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        {/* Progress Bar Line */}
        <div className="relative h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            className="absolute left-0 top-0 bottom-0 bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${completionPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Step Icons & Labels Grid */}
        <div className="grid grid-cols-6 gap-2">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = activeStep > idx;
            const isActive = activeStep === idx;
            return (
              <button
                key={step.label}
                onClick={() => {
                  if (idx < activeStep || validateStep(activeStep)) {
                    setActiveStep(idx);
                  }
                }}
                className={`flex flex-col items-center gap-1.5 text-center focus:outline-none transition-all ${isActive ? 'scale-105' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                  isCompleted 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : isActive 
                      ? 'bg-accent border-accent-dark text-white' 
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                  {isCompleted ? <Check className="w-4 h-4 text-white stroke-[3]" /> : idx + 1}
                </div>
                <span className={`text-[10px] hidden sm:inline font-bold uppercase tracking-wider ${
                  isActive ? 'text-slate-800' : 'text-slate-400'
                }`}>
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Wizard Form Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-8 text-left relative min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-2xl">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* STEP 1: COMPANY INFO */}
          {activeStep === 0 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">Step 1: Company Profile</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Company Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    placeholder="e.g. Apex Civil Constructors Ltd"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none"
                  />
                  {errors.companyName && <span className="text-[10px] text-rose-500">{errors.companyName}</span>}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Registration Number</label>
                  <input
                    type="text"
                    value={formData.regNo}
                    onChange={(e) => updateField('regNo', e.target.value)}
                    placeholder="e.g. U12345DL2018PTC123456"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none"
                  />
                  {errors.regNo && <span className="text-[10px] text-rose-500">{errors.regNo}</span>}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Date of Incorporation</label>
                  <input
                    type="date"
                    value={formData.incorporationDate}
                    onChange={(e) => updateField('incorporationDate', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Company Type</label>
                  <select
                    value={formData.companyType}
                    onChange={(e) => updateField('companyType', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none bg-transparent"
                  >
                    <option>Private Limited</option>
                    <option>Public Limited</option>
                    <option>Proprietorship</option>
                    <option>Partnership</option>
                    <option>Joint Venture</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">PAN Number</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={formData.pan}
                    onChange={(e) => updateField('pan', e.target.value.toUpperCase())}
                    placeholder="e.g. ABCDE1234F"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none font-mono"
                  />
                  {errors.pan && <span className="text-[10px] text-rose-500">{errors.pan}</span>}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">GST Number</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={formData.gst}
                    onChange={(e) => updateField('gst', e.target.value.toUpperCase())}
                    placeholder="e.g. 07ABCDE1234F1Z5"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none font-mono"
                  />
                  {errors.gst && <span className="text-[10px] text-rose-500">{errors.gst}</span>}
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Registered Office Address</label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="Complete corporate address..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none"
                  />
                  {errors.address && <span className="text-[10px] text-rose-500">{errors.address}</span>}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none"
                  />
                  {errors.city && <span className="text-[10px] text-rose-500">{errors.city}</span>}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none"
                  />
                  {errors.state && <span className="text-[10px] text-rose-500">{errors.state}</span>}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Pincode</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={(e) => updateField('pincode', e.target.value.replace(/\D/g, ''))}
                    placeholder="6-digit PIN code"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none font-mono"
                  />
                  {errors.pincode && <span className="text-[10px] text-rose-500">{errors.pincode}</span>}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Website URL</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => updateField('website', e.target.value)}
                    placeholder="www.apexconstructors.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Company Profile / Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Describe your capabilities, specialization, and historical achievements..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: TECHNICAL CAPACITY */}
          {activeStep === 1 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">Step 2: Technical Capacity</h3>

              {/* Core Category Multi-select */}
              <div className="space-y-2 relative">
                <label className="text-[11px] font-bold text-slate-400 uppercase block">Core Work Categories (Multi-select)</label>
                
                {/* Search Bar / Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchCategory}
                    onChange={(e) => {
                      setSearchCategory(e.target.value);
                      setShowCategoryDropdown(true);
                    }}
                    onFocus={() => setShowCategoryDropdown(true)}
                    placeholder="Search and add categories..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none"
                  />
                </div>

                {/* Dropdown Suggestions */}
                {showCategoryDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowCategoryDropdown(false)} />
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                      {CATEGORIES.filter(c => c.toLowerCase().includes(searchCategory.toLowerCase())).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => addCategory(cat)}
                          className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 text-slate-700"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Selected Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {formData.categories.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No categories selected yet.</span>
                  ) : (
                    formData.categories.map(cat => (
                      <span key={cat} className="inline-flex items-center gap-1 bg-accent text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                        {cat}
                        <button type="button" onClick={() => removeCategory(cat)} className="hover:text-accent-light text-teal-200">×</button>
                      </span>
                    ))
                  )}
                </div>
                {errors.categories && <span className="text-[10px] text-rose-500 block">{errors.categories}</span>}
              </div>

              {/* Sliders & Numerical Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Max Concurrent Projects Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.maxCapacity}
                    onChange={(e) => updateField('maxCapacity', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none"
                  />
                  {errors.maxCapacity && <span className="text-[10px] text-rose-500">{errors.maxCapacity}</span>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Current Active Projects</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.currentProjects}
                    onChange={(e) => updateField('currentProjects', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Peak Team Strength</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.teamStrength}
                    onChange={(e) => updateField('teamStrength', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none"
                  />
                </div>
              </div>

              {/* Capacity Utilization Warning */}
              {formData.maxCapacity > 0 && (formData.currentProjects / formData.maxCapacity) > 0.8 && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex gap-3 text-xs">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  <div>
                    <p className="font-bold">Capacity Overload Alert ({Math.round((formData.currentProjects / formData.maxCapacity) * 100)}%)</p>
                    <p className="mt-0.5">Your utilization exceeds 80%. This indicates significant concurrent projects load and may affect pre-qualification scores.</p>
                  </div>
                </div>
              )}

              {/* Safety Score Slider */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Safety Score (Incident Free execution history)</label>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    formData.safetyScore >= 80 ? 'bg-blue-100 text-blue-800' : formData.safetyScore >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>{formData.safetyScore}/100</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.safetyScore}
                  onChange={(e) => updateField('safetyScore', parseInt(e.target.value))}
                  className="w-full accent-accent bg-slate-200 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* ISO Certifications Checkbox list */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase block">ISO / Safety Certifications Held</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {ISO_LIST.map((cert) => {
                    const isChecked = formData.certifications.includes(cert);
                    return (
                      <label key={cert} className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                        isChecked ? 'bg-accent border-accent-dark text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateField('certifications', [...formData.certifications, cert]);
                            } else {
                              updateField('certifications', formData.certifications.filter(c => c !== cert));
                            }
                          }}
                        />
                        {isChecked ? <Check className="w-3.5 h-3.5 text-accent stroke-[3]" /> : <div className="w-3.5 h-3.5 border border-slate-300 rounded" />}
                        {cert}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Specialized Equipment Table */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Specialized Equipment Inventory</label>
                </div>
                
                {/* Add Equipment Row inputs */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Equipment Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Hydraulic Crane 50T"
                      value={tempEquip.name}
                      onChange={(e) => setTempEquip(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Qty Owned</label>
                    <input
                      type="number"
                      min={1}
                      value={tempEquip.qty}
                      onChange={(e) => setTempEquip(prev => ({ ...prev, qty: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="space-y-1 flex-1">
                      <label className="text-[10px] font-bold text-slate-500">Working Condition</label>
                      <select
                        value={tempEquip.condition}
                        onChange={(e) => setTempEquip(prev => ({ ...prev, condition: e.target.value }))}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none"
                      >
                        <option>Excellent</option>
                        <option>Good</option>
                        <option>Fair</option>
                        <option>Poor</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={addEquipmentRow}
                      className="p-2 bg-accent text-white rounded-lg text-xs font-bold hover:bg-accent-light shadow shadow-slate-950/20"
                    >
                      <Plus className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>

                {/* Equipment List */}
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full">
                    <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2 text-left">Equipment Name</th>
                        <th className="px-4 py-2 text-center w-24">Qty Owned</th>
                        <th className="px-4 py-2 text-center w-36">Condition</th>
                        <th className="px-4 py-2 text-center w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {formData.equipment.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-slate-400 italic">No equipment listed yet.</td>
                        </tr>
                      ) : (
                        formData.equipment.map((eq, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2.5 text-slate-800 font-bold">{eq.name}</td>
                            <td className="px-4 py-2.5 text-center">{eq.qty}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                eq.condition === 'Excellent' ? 'bg-blue-50 text-blue-700' : eq.condition === 'Good' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                              }`}>{eq.condition}</span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeEquipmentRow(idx)}
                                className="text-slate-400 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: PAST PROJECT REFERENCES */}
          {activeStep === 2 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="text-base font-bold text-slate-800">Step 3: Past Project References</h3>
                <button
                  type="button"
                  onClick={addProject}
                  disabled={formData.projectReferences.length >= 10}
                  className="px-3.5 py-1.5 bg-accent hover:bg-accent-dark disabled:bg-slate-200 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-accent/15 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Project ({formData.projectReferences.length}/10)</span>
                </button>
              </div>

              {errors.projectReferences && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs flex gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  <span>{errors.projectReferences}</span>
                </div>
              )}

              {/* Dynamic Project Accordions */}
              <div className="space-y-4">
                {formData.projectReferences.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-slate-400">
                    <p className="font-bold">No projects added yet</p>
                    <p className="text-xs mt-1">Please add at least one past reference project contract (maximum of 10) to qualify.</p>
                    <button
                      type="button"
                      onClick={addProject}
                      className="mt-4 px-4 py-2 bg-accent text-white font-bold rounded-xl text-xs hover:bg-accent-light"
                    >
                      + Add First Project
                    </button>
                  </div>
                ) : (
                  formData.projectReferences.map((ref, idx) => (
                    <motion.div
                      key={idx}
                      className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200 space-y-4 relative"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <button
                        type="button"
                        onClick={() => removeProject(idx)}
                        className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                        title="Delete Reference"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>

                      <div className="text-xs font-bold text-slate-800 bg-slate-200/60 px-2.5 py-1 rounded w-fit">
                        Project Contract #{idx + 1}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Project Name</label>
                          <input
                            type="text"
                            required
                            value={ref.projectName}
                            onChange={(e) => updateProjectField(idx, 'projectName', e.target.value)}
                            placeholder="e.g. Township Infra Package"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Client Name</label>
                          <input
                            type="text"
                            required
                            value={ref.clientName}
                            onChange={(e) => updateProjectField(idx, 'clientName', e.target.value)}
                            placeholder="e.g. Tata Power Ltd"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Contract Value (₹)</label>
                          <input
                            type="number"
                            required
                            value={ref.contractValue}
                            onChange={(e) => updateProjectField(idx, 'contractValue', parseFloat(e.target.value) || '')}
                            placeholder="e.g. 5000000"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Start Date</label>
                          <input
                            type="date"
                            value={ref.startDate}
                            onChange={(e) => updateProjectField(idx, 'startDate', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Completion Date</label>
                          <input
                            type="date"
                            value={ref.endDate}
                            onChange={(e) => updateProjectField(idx, 'endDate', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Work Type / Category</label>
                          <select
                            value={ref.type}
                            onChange={(e) => updateProjectField(idx, 'type', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none"
                          >
                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Completion Status</label>
                          <select
                            value={ref.status}
                            onChange={(e) => updateProjectField(idx, 'status', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none"
                          >
                            <option>Completed</option>
                            <option>In Progress</option>
                          </select>
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Client Contact (Email or Phone for verification)</label>
                          <input
                            type="text"
                            required
                            value={ref.clientContact}
                            onChange={(e) => updateProjectField(idx, 'clientContact', e.target.value)}
                            placeholder="e.g. procurement@tatapower.com"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1 md:col-span-3">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Brief Scope Description</label>
                          <textarea
                            rows={2}
                            value={ref.description}
                            onChange={(e) => updateProjectField(idx, 'description', e.target.value)}
                            placeholder="Describe primary operations performed..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 4: FINANCIAL STANDING */}
          {activeStep === 3 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">Step 4: Financial Audits</h3>

              {errors.turnover && <span className="text-xs text-rose-500 block font-semibold">{errors.turnover}</span>}
              {errors.netWorth && <span className="text-xs text-rose-500 block font-semibold">{errors.netWorth}</span>}
              {errors.bankName && <span className="text-xs text-rose-500 block font-semibold">{errors.bankName}</span>}

              {/* 3 Years Turnovers */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase block">Annual Turnover (₹ - Last 3 Financial Years)</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">FY 2024-25 (Turnover)</label>
                    <input
                      type="number"
                      required
                      value={formData.turnoverY1}
                      onChange={(e) => updateField('turnoverY1', parseFloat(e.target.value) || '')}
                      placeholder="₹ Turnover"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">FY 2023-24 (Turnover)</label>
                    <input
                      type="number"
                      required
                      value={formData.turnoverY2}
                      onChange={(e) => updateField('turnoverY2', parseFloat(e.target.value) || '')}
                      placeholder="₹ Turnover"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">FY 2022-23 (Turnover)</label>
                    <input
                      type="number"
                      required
                      value={formData.turnoverY3}
                      onChange={(e) => updateField('turnoverY3', parseFloat(e.target.value) || '')}
                      placeholder="₹ Turnover"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Net worth and liabilities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Net Worth (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.netWorth}
                    onChange={(e) => updateField('netWorth', parseFloat(e.target.value) || '')}
                    placeholder="Total Assets - Total Liabilities"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Outstanding Liabilities (₹)</label>
                  <input
                    type="number"
                    value={formData.liabilities}
                    onChange={(e) => updateField('liabilities', parseFloat(e.target.value) || '')}
                    placeholder="Total current outstanding debts"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Banker Name</label>
                  <input
                    type="text"
                    required
                    value={formData.bankName}
                    onChange={(e) => updateField('bankName', e.target.value)}
                    placeholder="e.g. State Bank of India"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Bank Account Type</label>
                  <select
                    value={formData.bankAccountType}
                    onChange={(e) => updateField('bankAccountType', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none bg-transparent"
                  >
                    <option>Current</option>
                    <option>Cash Credit</option>
                    <option>Overdraft</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">CRISIL / Credit Rating</label>
                  <select
                    value={formData.creditRating}
                    onChange={(e) => updateField('creditRating', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none bg-transparent font-mono"
                  >
                    <option>AAA</option>
                    <option>AA+</option>
                    <option>AA</option>
                    <option>A+</option>
                    <option>A</option>
                    <option>BBB+</option>
                    <option>BBB</option>
                    <option>BB</option>
                    <option>B</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Earnest Money Deposit (EMD) Capability (₹)</label>
                  <input
                    type="number"
                    value={formData.emdCapability}
                    onChange={(e) => updateField('emdCapability', parseFloat(e.target.value) || '')}
                    placeholder="EMD limit capability..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-primary-light focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Blacklist Status Radio Buttons */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <label className="text-[11px] font-bold text-slate-500 uppercase block">Has your company ever been Blacklisted / Suspended by government bodies?</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="radio"
                      name="blacklist"
                      value="No"
                      checked={formData.blacklistStatus === 'No'}
                      onChange={(e) => updateField('blacklistStatus', 'No')}
                      className="w-4 h-4 accent-accent"
                    />
                    No, clean track record
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="radio"
                      name="blacklist"
                      value="Yes"
                      checked={formData.blacklistStatus === 'Yes'}
                      onChange={(e) => updateField('blacklistStatus', 'Yes')}
                      className="w-4 h-4 accent-accent"
                    />
                    Yes, historically suspended
                  </label>
                </div>

                {formData.blacklistStatus === 'Yes' && (
                  <motion.div 
                    className="space-y-1 pt-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <label className="text-[10px] font-bold text-rose-600 uppercase">Reason for Blacklisting (Mandatory description)</label>
                    <textarea
                      rows={2}
                      required
                      value={formData.blacklistReason}
                      onChange={(e) => updateField('blacklistReason', e.target.value)}
                      placeholder="Specify dates, agencies, and causes..."
                      className="w-full px-3 py-2 rounded-xl border border-rose-200 text-sm focus:border-rose-400 focus:outline-none bg-white font-medium"
                    />
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 5: DOCUMENTS UPLOADS */}
          {activeStep === 4 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">Step 5: Document Checklists</h3>
                <p className="text-xs text-slate-400 mt-1">Upload verified PDF copies of files. Max size 5MB per document.</p>
              </div>

              {errors.documents && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs flex gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  <span>{errors.documents}</span>
                </div>
              )}

              {/* Grid of upload fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[
                  { type: 'Registration', label: 'Company Incorporation / Reg. Certificate' },
                  { type: 'GST', label: 'GST Registration Certificate' },
                  { type: 'PAN', label: 'PAN Card Copy' },
                  { type: 'BalanceSheet', label: 'Audited Balance Sheets (3 years combined)' },
                  { type: 'BankSolvency', label: 'Bank Solvency Certificate' },
                  { type: 'WorkOrder', label: 'Work Order Copies (up to 5 recent projects)' },
                ].map((docItem) => {
                  const existingFile = formData.documents.find(d => d.docType === docItem.type);
                  const isUploading = uploadingDoc[docItem.type] !== undefined;
                  const progress = uploadingDoc[docItem.type] || 0;

                  return (
                    <div key={docItem.type} className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between bg-slate-50/50 space-y-3">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">DOCUMENT TYPE</span>
                        <h4 className="text-xs font-bold text-slate-700 mt-0.5">{docItem.label}</h4>
                      </div>

                      {/* Upload Flow states */}
                      {existingFile ? (
                        <div className="bg-white border border-slate-200 p-3 rounded-lg flex items-center justify-between text-xs font-semibold text-slate-700 shadow-sm">
                          <div className="flex items-center gap-2 truncate">
                            <Check className="w-4 h-4 text-blue-500 shrink-0 stroke-[3]" />
                            <span className="truncate">{existingFile.fileName}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDocument(existingFile.id)}
                            className="text-slate-400 hover:text-rose-500 transition-colors shrink-0 pl-2"
                          >
                            Remove
                          </button>
                        </div>
                      ) : isUploading ? (
                        <div className="bg-white border border-slate-100 p-4 rounded-lg space-y-2 text-center text-xs shadow-sm">
                          <span className="font-bold text-slate-500">Uploading File... {progress}%</span>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-accent transition-all duration-150" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      ) : (
                        <label className="border border-dashed border-slate-300 hover:border-accent bg-white rounded-xl p-6 text-center cursor-pointer transition-colors block">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            className="hidden"
                            onChange={(e) => handleFileUpload(docItem.type, e.target.files[0])}
                          />
                          <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-1.5 group-hover:text-accent" />
                          <span className="text-xs font-bold text-slate-500 block">Click to select files</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">PDF formats only</span>
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 6: REVIEW & SUBMIT */}
          {activeStep === 5 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">Step 6: Review & Final Submission</h3>
                <p className="text-xs text-slate-400 mt-1">Review all your entries below before finalizing. You cannot modify your responses after submission.</p>
              </div>

              {/* Accordion Summary sections */}
              <div className="space-y-4 text-xs font-medium">
                {/* Accordion 1: Company Profile */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2.5 font-bold text-slate-700 border-b border-slate-200 flex justify-between">
                    <span>1. Company Profile Details</span>
                    <button onClick={() => setActiveStep(0)} className="text-accent hover:underline">Edit</button>
                  </div>
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white text-slate-600">
                    <p><span className="font-bold text-slate-800">Name:</span> {formData.companyName}</p>
                    <p><span className="font-bold text-slate-800">Reg No:</span> {formData.regNo}</p>
                    <p><span className="font-bold text-slate-800">Type:</span> {formData.companyType}</p>
                    <p><span className="font-bold text-slate-800">PAN:</span> {formData.pan}</p>
                    <p><span className="font-bold text-slate-800">GST:</span> {formData.gst}</p>
                    <p><span className="font-bold text-slate-800">Location:</span> {formData.city}, {formData.state}</p>
                  </div>
                </div>

                {/* Accordion 2: Technical Capacity */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2.5 font-bold text-slate-700 border-b border-slate-200 flex justify-between">
                    <span>2. Technical Capacity & Equipment</span>
                    <button onClick={() => setActiveStep(1)} className="text-accent hover:underline">Edit</button>
                  </div>
                  <div className="p-4 space-y-3 bg-white text-slate-600">
                    <p><span className="font-bold text-slate-800">Categories:</span> {formData.categories.join(', ')}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <p><span className="font-bold text-slate-800">Max Capacity:</span> {formData.maxCapacity}</p>
                      <p><span className="font-bold text-slate-800">Active Projects:</span> {formData.currentProjects}</p>
                      <p><span className="font-bold text-slate-800">Team Size:</span> {formData.teamStrength}</p>
                    </div>
                    <p><span className="font-bold text-slate-800">Safety Score:</span> {formData.safetyScore}/100</p>
                    <p><span className="font-bold text-slate-800">Equipments:</span> {formData.equipment.length} items listed</p>
                  </div>
                </div>

                {/* Accordion 3: References */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2.5 font-bold text-slate-700 border-b border-slate-200 flex justify-between">
                    <span>3. Project References</span>
                    <button onClick={() => setActiveStep(2)} className="text-accent hover:underline">Edit</button>
                  </div>
                  <div className="p-4 bg-white text-slate-600 space-y-2">
                    {formData.projectReferences.map((p, idx) => (
                      <p key={idx} className="border-b border-slate-100 pb-1 last:border-0">
                        <span className="font-bold text-slate-800">{p.projectName}</span> under {p.clientName} (Value: ₹{p.contractValue.toLocaleString()})
                      </p>
                    ))}
                  </div>
                </div>

                {/* Accordion 4: Financial Audits */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2.5 font-bold text-slate-700 border-b border-slate-200 flex justify-between">
                    <span>4. Financial standing & Audits</span>
                    <button onClick={() => setActiveStep(3)} className="text-accent hover:underline">Edit</button>
                  </div>
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white text-slate-600">
                    <p><span className="font-bold text-slate-800">Turnover Y1:</span> ₹{formData.turnoverY1?.toLocaleString()}</p>
                    <p><span className="font-bold text-slate-800">Net Worth:</span> ₹{formData.netWorth?.toLocaleString()}</p>
                    <p><span className="font-bold text-slate-800">Rating:</span> {formData.creditRating}</p>
                    <p><span className="font-bold text-slate-800">Bank:</span> {formData.bankName}</p>
                    <p><span className="font-bold text-slate-800">Blacklist:</span> {formData.blacklistStatus}</p>
                  </div>
                </div>

                {/* Accordion 5: Documents */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2.5 font-bold text-slate-700 border-b border-slate-200 flex justify-between">
                    <span>5. Uploaded Documents</span>
                    <button onClick={() => setActiveStep(4)} className="text-accent hover:underline">Edit</button>
                  </div>
                  <div className="p-4 bg-white text-slate-600 grid grid-cols-2 gap-2">
                    {formData.documents.map(d => (
                      <p key={d.id} className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-blue-500" />
                        <span className="font-bold">{d.docType}:</span> {d.fileName}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Declarations Accept check */}
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3">
                <div className="flex gap-2.5 items-start">
                  <input
                    type="checkbox"
                    id="declaration"
                    checked={declarationAccepted}
                    onChange={(e) => setDeclarationAccepted(e.target.checked)}
                    className="w-4 h-4 accent-accent mt-0.5 cursor-pointer shrink-0"
                  />
                  <label htmlFor="declaration" className="text-xs font-semibold text-slate-700 leading-relaxed cursor-pointer select-none">
                    I hereby declare that all information furnished in this empanelment form is true, correct, and auditable. I understand that any false declaration will lead to immediate rejection, blacklist penalty, and potential legal actions by AVINASH KANAPARTHI INFRA PRIVATE LIMITED.
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Wizard Navigation Footer */}
        <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleBack}
            disabled={activeStep === 0}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {activeStep === STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !declarationAccepted}
              className="px-6 py-2.5 bg-accent hover:bg-accent-dark disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-accent/10 flex items-center gap-1.5"
            >
              {loading ? 'Submitting Forms...' : 'Agree & Submit Application'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 bg-accent hover:bg-accent-light text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
            >
              Next Step
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
