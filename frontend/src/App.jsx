import React, { useState, useEffect } from 'react';
import { api } from './utils/api';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StaffReviewPanel from './pages/StaffReviewPanel';
import VendorRegistry from './pages/VendorRegistry';
import AnalyticsPage from './pages/AnalyticsPage';
import AlertsCenter from './pages/AlertsCenter';
import AdminPanel from './pages/AdminPanel';
import VendorPortal from './pages/VendorPortal';
import ApplicationWizard from './pages/ApplicationWizard';

const getInitialState = () => {
  const currentUser = api.getCurrentUser();
  if (currentUser) {
    const role = (currentUser.role || '').toUpperCase();
    if (role === 'ADMIN' || role === 'STAFF' || role === 'CONTRACTOR') {
      return {
        user: currentUser,
        tab: role === 'CONTRACTOR' ? 'timeline' : 'dashboard'
      };
    } else {
      api.logout();
    }
  }
  return { user: null, tab: '' };
};

export default function App() {
  const initialState = getInitialState();
  const [user, setUser] = useState(initialState.user);
  const [currentTab, setCurrentTab] = useState(initialState.tab);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    const role = (loggedInUser.role || '').toUpperCase();
    if (role === 'CONTRACTOR') {
      setCurrentTab('timeline');
    } else {
      setCurrentTab('dashboard');
    }
  };

  // Not logged in -> Show Login Page
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const userRole = (user?.role || '').toUpperCase();
  return (
    <Layout currentTab={currentTab} setCurrentTab={setCurrentTab}>
      {/* Dynamic Tab Rendering */}
      {currentTab === 'dashboard' && (userRole === 'STAFF' || userRole === 'ADMIN') && (
        <Dashboard setCurrentTab={setCurrentTab} />
      )}
      
      {currentTab === 'applications' && (userRole === 'STAFF' || userRole === 'ADMIN') && (
        <StaffReviewPanel />
      )}

      {currentTab === 'registry' && (
        <VendorRegistry />
      )}

      {currentTab === 'analytics' && (userRole === 'STAFF' || userRole === 'ADMIN') && (
        <AnalyticsPage />
      )}

      {currentTab === 'notifications' && (
        <AlertsCenter />
      )}

      {currentTab === 'admin' && userRole === 'ADMIN' && (
        <AdminPanel />
      )}

      {/* Contractor Specific Pages */}
      {currentTab === 'timeline' && userRole === 'CONTRACTOR' && (
        <VendorPortal setCurrentTab={setCurrentTab} />
      )}

      {currentTab === 'wizard' && (
        <ApplicationWizard setCurrentTab={setCurrentTab} />
      )}
    </Layout>
  );
}
