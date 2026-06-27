import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, ClipboardList, ShieldAlert, Award, FileSpreadsheet, 
  Settings, LogOut, Menu, ChevronLeft, Bell, User, Building, HardHat,
  X, CheckCircle, AlertTriangle, Info, AlertOctagon, Camera
} from 'lucide-react';
import { api } from '../utils/api';

const sidebarVariants = {
  expanded: { width: 260 },
  collapsed: { width: 70 }
};

const menuListVariants = {
  visible: {
    transition: {
      staggerChildren: 0.05
    }
  }
};

const menuItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};

const getAvatarUrl = (url) => {
  if (!url) return "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120";
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('/uploads')) return `http://localhost:5000${url}`;
  return url;
};

export default function Layout({ children, currentTab, setCurrentTab }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [profilePassword, setProfilePassword] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (showProfileModal && user) {
      setProfileName(user.name || '');
      setProfileEmail(user.email || '');
      setProfileAvatar(user.avatarUrl || '');
      setSelectedAvatarFile(null);
      setProfilePassword('');
      setProfileError('');
      setProfileSuccess(false);
    }
  }, [showProfileModal, user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError('');
    setProfileSuccess(false);

    try {
      let finalAvatarUrl = profileAvatar;
      if (selectedAvatarFile) {
        const uploadRes = await api.uploadAvatar(selectedAvatarFile);
        finalAvatarUrl = uploadRes.avatarUrl;
      }

      const data = await api.updateProfile({
        name: profileName,
        email: profileEmail,
        avatarUrl: finalAvatarUrl,
        ...(profilePassword ? { password: profilePassword } : {})
      });
      
      setUser(data.user);
      setProfileSuccess(true);
      setTimeout(() => {
        setShowProfileModal(false);
        window.location.reload();
      }, 1500);
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  useEffect(() => {
    const currUser = api.getCurrentUser();
    setUser(currUser);
    
    // Fetch notifications if logged in
    if (currUser) {
      loadNotifications();
      // Poll notifications every 30s
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  const loadNotifications = async () => {
    try {
      const list = await api.getNotifications();
      setNotifications(list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    window.location.reload();
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

  const handleNotifClick = async (notif) => {
    try {
      await api.markNotificationRead(notif.id);
      loadNotifications();
      setShowNotifDropdown(false);
      
      // Redirect based on entity
      if (notif.entityId && notif.entityId !== 'expiring-mock' && notif.entityId !== 'idle-mock') {
        if (user.role === 'CONTRACTOR') {
          setCurrentTab('timeline');
        } else {
          // If staff/admin, go to review detail (we will set target application id in local storage)
          localStorage.setItem('selectedApplicationId', notif.entityId);
          setCurrentTab('applications');
        }
      } else {
        setCurrentTab('notifications');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const menuItems = {
    ADMIN: [
      { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
      { id: 'applications', name: 'Review Panel', icon: ClipboardList },
      { id: 'registry', name: 'Empanelled Registry', icon: Award },
      { id: 'analytics', name: 'Analytics & Reports', icon: FileSpreadsheet },
      { id: 'notifications', name: 'Alerts Center', icon: Bell },
      { id: 'admin', name: 'Admin Console', icon: Settings },
    ],
    STAFF: [
      { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
      { id: 'applications', name: 'Review Panel', icon: ClipboardList },
      { id: 'registry', name: 'Empanelled Registry', icon: Award },
      { id: 'analytics', name: 'Analytics & Reports', icon: FileSpreadsheet },
      { id: 'notifications', name: 'Alerts Center', icon: Bell },
    ],
    CONTRACTOR: [
      { id: 'timeline', name: 'Application Tracker', icon: LayoutDashboard },
      { id: 'wizard', name: 'emp_form', name: 'Pre-qualification Form', icon: ClipboardList },
      { id: 'registry', name: 'Empanelled Registry', icon: Award },
      { id: 'notifications', name: 'Alerts Center', icon: Bell },
    ]
  };

  const userRole = (user?.role || 'STAFF').toUpperCase();
  const roleMenus = menuItems[userRole] || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotifIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'error': return <AlertOctagon className="w-5 h-5 text-rose-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="h-screen flex bg-white overflow-hidden font-sans">
      
      {/* ==========================================
          DESKTOP SIDEBAR
         ========================================== */}
      <motion.aside
        className="hidden md:flex flex-col bg-primary text-slate-300 border-r border-primary-light z-30 shrink-0 h-full"
        initial="expanded"
        animate={sidebarExpanded ? 'expanded' : 'collapsed'}
        variants={sidebarVariants}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {/* Header Logo */}
        <div className="h-16 flex items-center px-4 border-b border-primary-light gap-3 justify-between">
          <AnimatePresence mode="wait">
            {sidebarExpanded ? (
              <motion.div 
                className="flex items-center gap-2 overflow-hidden"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <div className="bg-accent p-1.5 rounded text-white flex items-center justify-center">
                  <HardHat className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-outfit font-bold text-sm tracking-wide text-white leading-tight">AKIPL INFRA</span>
                  <span className="text-[9px] text-slate-500 tracking-wider">PRE-QUAL SYSTEM</span>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                className="bg-accent p-2 rounded text-white mx-auto"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <HardHat className="w-5 h-5" />
              </motion.div>
            )}
          </AnimatePresence>

          {sidebarExpanded && (
            <button 
              onClick={() => setSidebarExpanded(false)}
              className="p-1 rounded hover:bg-primary-light text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <motion.nav 
          className="flex-1 py-6 px-3 space-y-1 overflow-y-auto"
          variants={menuListVariants}
          initial="hidden"
          animate="visible"
        >
          {roleMenus.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id || (item.id === 'applications' && currentTab === 'evaluate');
            return (
              <motion.button
                key={item.id}
                variants={menuItemVariants}
                onClick={() => {
                  setCurrentTab(item.id);
                  if (item.id === 'applications') {
                    localStorage.removeItem('selectedApplicationId');
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all group duration-200 relative ${
                  isActive 
                    ? 'bg-accent text-white shadow-lg shadow-accent/10' 
                    : 'hover:bg-primary-light hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                {sidebarExpanded && (
                  <span className="truncate">{item.name}</span>
                )}
                {!sidebarExpanded && (
                  <div className="absolute left-16 bg-slate-800 text-white text-xs px-2 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md">
                    {item.name}
                  </div>
                )}
              </motion.button>
            );
          })}
        </motion.nav>

        {/* Footer Logout */}
        <div className="p-3 border-t border-primary-light">
          {sidebarExpanded ? (
            <button 
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          ) : (
            <button 
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-center p-3 rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </motion.aside>

      {/* Expand sidebar trigger button when collapsed */}
      {!sidebarExpanded && (
        <button 
          onClick={() => setSidebarExpanded(true)}
          className="hidden md:flex fixed bottom-5 left-5 bg-primary border border-primary-light hover:bg-primary-light text-white rounded-full p-2.5 shadow-lg z-50"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* ==========================================
          MOBILE HEADER / MENU
         ========================================== */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-primary text-white flex items-center justify-between px-4 z-40 border-b border-primary-light">
        <div className="flex items-center gap-2">
          <div className="bg-accent p-1.5 rounded flex items-center justify-center">
            <HardHat className="w-5 h-5 text-white" />
          </div>
          <span className="font-outfit font-bold text-sm tracking-wide text-white leading-tight">AKIPL INFRA</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Mobile Notifications */}
          <button 
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="p-1.5 rounded-full hover:bg-primary-light text-slate-300 relative transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-accent text-white text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold font-mono border-2 border-slate-900">
                {unreadCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded hover:bg-primary-light text-slate-300"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              className="md:hidden fixed top-0 bottom-0 right-0 w-[280px] bg-primary text-slate-300 z-50 flex flex-col border-l border-primary-light"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
            >
              <div className="h-16 flex items-center justify-between px-4 border-b border-primary-light">
                <span className="font-outfit font-bold text-sm text-white">Menu Navigation</span>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded hover:bg-primary-light text-slate-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
                {roleMenus.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                        isActive 
                          ? 'bg-accent text-white shadow-lg shadow-accent/10' 
                          : 'hover:bg-primary-light hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-primary-light space-y-2">
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowProfileModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-300 hover:bg-primary-light hover:text-white transition-all duration-200"
                >
                  <User className="w-5 h-5 text-slate-400" />
                  <span>My Profile</span>
                </button>
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ==========================================
          MAIN CONTENT CONTAINER
         ========================================== */}
      <div className="flex-1 flex flex-col min-w-0 pt-16 md:pt-0 overflow-hidden h-screen">
        
        {/* ==========================================
            DESKTOP HEADER
           ========================================== */}
         <header className="hidden md:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-6 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-outfit font-extrabold text-sm tracking-wider text-slate-700">AVINASH KANAPARTHI INFRA PRIVATE LIMITED</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-500 relative transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-accent text-white text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold font-mono">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifDropdown && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowNotifDropdown(false)} />
                    <motion.div
                      className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-40 overflow-hidden"
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="p-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <span className="font-semibold text-sm text-slate-700">Alerts & Messages</span>
                        {unreadCount > 0 && (
                          <button 
                            onClick={markAllRead}
                            className="text-xs font-medium text-accent hover:text-accent-dark hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto division-y divide-slate-100">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 text-xs">
                            No notifications to display
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <button
                              key={n.id}
                              onClick={() => handleNotifClick(n)}
                              className={`w-full text-left p-3.5 hover:bg-slate-50 flex gap-3 transition-colors border-b border-slate-100/50 ${!n.isRead ? 'bg-accent/5' : ''}`}
                            >
                              <div className="mt-0.5 shrink-0">
                                {getNotifIcon(n.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs text-slate-800 ${!n.isRead ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">{n.message}</p>
                                <span className="text-[9px] text-slate-400 block mt-1.5">
                                  {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                      <div className="p-2.5 border-t border-slate-100 bg-slate-50 text-center">
                        <button
                          onClick={() => {
                            setCurrentTab('notifications');
                            setShowNotifDropdown(false);
                          }}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-800"
                        >
                          View all notifications
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Dropdown */}
            <div className="h-8 w-px bg-slate-200" />
            <button 
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-3 hover:bg-slate-50 p-1.5 rounded-xl transition-colors cursor-pointer text-left focus:outline-none"
              title="Edit Profile Settings"
            >
              <img 
                src={getAvatarUrl(user?.avatarUrl)} 
                alt="Avatar" 
                className="w-9 h-9 rounded-full object-cover border border-slate-200"
              />
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight">{user?.name || 'Rohan Sharma'}</p>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{user?.role || 'Staff'}</span>
              </div>
            </button>
          </div>
        </header>

        {/* ==========================================
            BODY CONTENT AREA
           ========================================== */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* ==========================================
          LOGOUT CONFIRMATION MODAL
         ========================================== */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
            />
            <motion.div 
              className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl relative z-10 text-center space-y-4"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
            >
              <div className="mx-auto w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
                <LogOut className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-outfit font-bold text-base text-slate-800">Confirm Logout</h3>
                <p className="text-xs text-slate-500">Are you sure you want to log out of the system? Any unsaved edits might be lost.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-rose-500/25"
                >
                  Log Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          PROFILE EDIT MODAL
         ========================================== */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
            />
            <motion.div 
              className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-100 shadow-2xl relative z-10 space-y-4 text-left"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-accent" />
                  <h3 className="font-outfit font-bold text-base text-slate-800">My Profile Settings</h3>
                </div>
                <button onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {profileSuccess ? (
                <div className="py-6 text-center space-y-3">
                  <div className="mx-auto w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                    <CheckCircle className="w-6 h-6 animate-bounce" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">Profile Updated Successfully!</h4>
                  <p className="text-xs text-slate-400">Refreshing application workspace...</p>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-bold text-slate-500">
                  {profileError && (
                    <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded text-rose-700 font-medium">
                      {profileError}
                    </div>
                  )}

                  {/* Avatar Section */}
                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div 
                      className="relative group cursor-pointer shrink-0" 
                      onClick={() => document.getElementById('avatar-file-input').click()}
                    >
                      <img 
                        src={getAvatarUrl(profileAvatar)} 
                        alt="Avatar Preview" 
                        className="w-16 h-16 rounded-full object-cover border border-accent group-hover:opacity-85 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                        <Camera className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1.5 text-left">
                      <label className="text-[10px] uppercase text-slate-400 block font-bold">Avatar Photo</label>
                      <input
                        id="avatar-file-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedAvatarFile(file);
                            setProfileAvatar(URL.createObjectURL(file));
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById('avatar-file-input').click()}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all inline-flex items-center gap-1"
                      >
                        <Camera className="w-3.5 h-3.5 text-slate-500" />
                        Choose Photo
                      </button>
                      <p className="text-[9px] text-slate-400 font-medium leading-tight">Supports JPG, PNG (Max 5MB). Select from Gallery or Camera.</p>
                    </div>
                  </div>

                  {/* Name Input */}
                  <div className="space-y-1 text-left">
                    <label className="uppercase text-[10px] text-slate-400">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Your Name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-700 bg-white focus:outline-none focus:border-accent"
                    />
                  </div>

                  {/* Email Input */}
                  <div className="space-y-1 text-left">
                    <label className="uppercase text-[10px] text-slate-400">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="your.email@akipl.com"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-700 bg-white focus:outline-none focus:border-accent"
                    />
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1 text-left">
                    <label className="uppercase text-[10px] text-slate-400">New Password (leave blank to keep current)</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={profilePassword}
                      onChange={(e) => setProfilePassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-700 bg-white focus:outline-none focus:border-accent"
                    />
                  </div>

                  {/* Submit buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowProfileModal(false)}
                      className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="flex-1 py-2 bg-accent hover:bg-accent-dark disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-accent/25"
                    >
                      {profileSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
