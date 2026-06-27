import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Grid, List, Mail, Phone, Calendar, Star, MapPin, 
  ChevronRight, Sparkles, Filter, XCircle, AlertTriangle
} from 'lucide-react';
import { api } from '../utils/api';
import ShimmerLoader from '../components/ShimmerLoader';

export default function VendorRegistry() {
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // grid or table
  
  // Search & Filter
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [rating, setRating] = useState('');

  // Selected Vendor Profile Drilldown
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [vendorDetail, setVendorDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadVendors();
  }, [search, category, city, rating]);

  const loadVendors = async () => {
    setLoading(true);
    try {
      const params = {
        ...(search && { search }),
        ...(category && { category }),
        ...(city && { city }),
        ...(rating && { rating })
      };
      const data = await api.getVendors(params);
      setVendors(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProfile = async (id) => {
    setSelectedVendorId(id);
    setDetailLoading(true);
    try {
      const data = await api.getVendorById(id);
      setVendorDetail(data);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const getExpiryBadge = (expiryDateStr) => {
    const expiryDate = new Date(expiryDateStr);
    const today = new Date();
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <span className="bg-rose-500 text-white px-2 py-0.5 rounded text-[9px] font-bold">EXPIRED</span>;
    } else if (diffDays <= 60) {
      return <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-[9px] font-bold animate-pulse whitespace-nowrap">EXPIRING IN {diffDays} DAYS</span>;
    } else {
      return <span className="bg-blue-500 text-white px-2 py-0.5 rounded text-[9px] font-bold">ACTIVE</span>;
    }
  };

  return (
    <div className="space-y-6 page-enter text-left">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">Empanelled Vendor Registry</h2>
          <p className="text-xs text-slate-400">Database of pre-qualified, verified infrastructure contractors</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-xl border transition-all ${
              viewMode === 'grid' ? 'bg-accent border-accent-dark text-white' : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            <Grid className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-xl border transition-all ${
              viewMode === 'table' ? 'bg-accent border-accent-dark text-white' : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            <List className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-bold text-slate-500">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by company, tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
          />
        </div>

        <div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-2 py-2 border border-slate-200 rounded-xl bg-transparent"
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

        <div>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-2 py-2 border border-slate-200 rounded-xl bg-transparent"
          >
            <option value="">All Cities</option>
            <option>Hyderabad</option>
            <option>Bangalore</option>
            <option>Chennai</option>
            <option>Vijayawada</option>
            <option>Vishakhapatnam</option>
            <option>Mumbai</option>
            <option>Pune</option>
          </select>
        </div>

        <div>
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="w-full px-2 py-2 border border-slate-200 rounded-xl bg-transparent"
          >
            <option value="">All Ratings</option>
            <option value="5">5 Stars (High Performance)</option>
            <option value="4">4 Stars (Solid)</option>
            <option value="3">3 Stars (Qualified)</option>
          </select>
        </div>
      </div>

      {/* Main Vendor display */}
      {loading ? (
        <ShimmerLoader type={viewMode === 'grid' ? 'cards' : 'table'} />
      ) : vendors.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center text-slate-400 italic">
          No empanelled vendors match the filters.
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID LAYOUT */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {vendors.map((v) => (
            <motion.div
              key={v.id}
              className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              {/* Expiry tag at top right */}
              <div className="absolute top-4 right-4">
                {getExpiryBadge(v.expiryDate)}
              </div>

              {/* Title & rating */}
              <div className="space-y-1 pr-16 text-left">
                <h3 className="font-extrabold text-sm text-slate-800 tracking-tight leading-snug line-clamp-1">{v.companyName}</h3>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < v.ratingStars ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                  ))}
                  <span className="text-[10px] font-bold text-slate-400 ml-1">({v.score}/100)</span>
                </div>
              </div>

              {/* Badges categories */}
              <div className="flex flex-wrap gap-1">
                {v.categories.map(c => (
                  <span key={c} className="bg-accent/5 text-accent text-[10px] font-bold px-2 py-0.5 rounded">
                    {c}
                  </span>
                ))}
              </div>

              {/* Details lists */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-500 text-left">
                <p className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {v.city}, {v.state.slice(0, 2).toUpperCase()}
                </p>
                <p className="flex items-center gap-1.5 truncate">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  Exp: {new Date(v.expiryDate).toLocaleDateString()}
                </p>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-between items-center text-xs">
                <div className="flex gap-2 text-slate-400">
                  <a href={`mailto:${v.email}`} title={v.email} className="hover:text-slate-800"><Mail className="w-4 h-4" /></a>
                  <a href={`tel:${v.phone}`} title={v.phone} className="hover:text-slate-800"><Phone className="w-4 h-4" /></a>
                </div>
                <button
                  onClick={() => handleOpenProfile(v.id)}
                  className="text-xs font-bold text-accent hover:text-accent-dark flex items-center gap-0.5"
                >
                  <span>Vendor Profile</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* TABLE LAYOUT */
        <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Vendor ID</th>
                <th className="px-5 py-3">Company Name</th>
                <th className="px-5 py-3">Categories</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3 text-center">Score</th>
                <th className="px-5 py-3 text-center">Rating</th>
                <th className="px-5 py-3 text-center">Empanelment Status</th>
                <th className="px-5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {vendors.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-bold">{v.applicationId}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-900">{v.companyName}</td>
                  <td className="px-5 py-3.5 truncate max-w-xs">{v.categories.join(', ')}</td>
                  <td className="px-5 py-3.5">{v.city}, {v.state}</td>
                  <td className="px-5 py-3.5 text-center font-bold text-slate-900">{v.score}</td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center gap-0.5 justify-center">
                      {[...Array(v.ratingStars)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center">{getExpiryBadge(v.expiryDate)}</td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => handleOpenProfile(v.id)}
                      className="px-3 py-1.5 bg-accent text-white rounded-lg font-bold hover:bg-accent-light text-[10px]"
                    >
                      Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Selected Vendor Profile Drilldown Modal */}
      <AnimatePresence>
        {selectedVendorId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVendorId(null)}
            />
            
            <motion.div
              className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative z-10 border border-slate-100 max-h-[85vh] overflow-y-auto space-y-5"
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
            >
              {detailLoading ? (
                <div className="py-12 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Header info */}
                  <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">EMPANELLED PROFILE</span>
                      <h3 className="font-extrabold text-lg text-slate-800">{vendorDetail?.companyName}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-xs font-bold text-slate-500">{vendorDetail?.applicationId}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < (vendorDetail?.ratingStars || 3) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedVendorId(null)}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                    >
                      Close ×
                    </button>
                  </div>

                  {/* Core profile details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-slate-600">
                    <p><span className="font-bold text-slate-800">Registration ID:</span> {vendorDetail?.regNo}</p>
                    <p><span className="font-bold text-slate-800">GST:</span> {vendorDetail?.gst}</p>
                    <p><span className="font-bold text-slate-800">Incorporated:</span> {vendorDetail?.incorporationDate || 'N/A'}</p>
                    <p><span className="font-bold text-slate-800">PAN:</span> {vendorDetail?.pan}</p>
                    <p><span className="font-bold text-slate-800">Headquarters Address:</span> {vendorDetail?.address}, {vendorDetail?.city}, {vendorDetail?.state}</p>
                    <p><span className="font-bold text-slate-800">Website:</span> {vendorDetail?.website}</p>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
                    <h4 className="font-bold text-slate-800">Work Category & Capacities</h4>
                    <p className="text-slate-600"><span className="font-bold text-slate-800">Empanelled Categories:</span> {
                      vendorDetail?.technicalDetails ? JSON.parse(vendorDetail.technicalDetails.categories || '[]').join(', ') : 'Civil Works'
                    }</p>
                    <div className="grid grid-cols-3 gap-2 text-slate-500 font-medium">
                      <p><span className="font-bold text-slate-800">Max Capacity:</span> {vendorDetail?.technicalDetails?.maxCapacity} Projects</p>
                      <p><span className="font-bold text-slate-800">Active projects:</span> {vendorDetail?.technicalDetails?.currentProjects}</p>
                      <p><span className="font-bold text-slate-800">Safety Index:</span> {vendorDetail?.technicalDetails?.safetyScore}/100</p>
                    </div>
                  </div>

                  {/* Project references list */}
                  <div className="border-t border-slate-100 pt-4 space-y-3 text-xs">
                    <h4 className="font-bold text-slate-800">Historical Projects Reference List</h4>
                    <div className="space-y-2">
                      {vendorDetail?.projectReferences.map((ref) => (
                        <div key={ref.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 font-medium">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">{ref.projectName}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              ref.status === 'Completed' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                            }`}>{ref.status}</span>
                          </div>
                          <p className="text-[11px] text-slate-500">Client: {ref.clientName} | Value: ₹{ref.contractValue.toLocaleString()}</p>
                          {ref.description && <p className="text-[10px] text-slate-400 leading-relaxed pt-0.5">{ref.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contact Footer actions */}
                  <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs">
                    <div className="flex gap-4 font-semibold text-slate-500">
                      <p className="flex items-center gap-1"><Mail className="w-4 h-4" /> {vendorDetail?.email || 'contact@akipl-vendor.com'}</p>
                      <p className="flex items-center gap-1"><Phone className="w-4 h-4" /> +91 98765 43210</p>
                    </div>
                    <a
                      href={`mailto:${vendorDetail?.email}`}
                      className="px-4 py-2 bg-accent hover:bg-accent-dark text-white font-bold rounded-xl text-xs"
                    >
                      Contact Vendor
                    </a>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
