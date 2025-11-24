
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import { Resource, Lead } from './types';
import { auth } from './firebaseConfig';
import * as api from './services/api';
import { checkUrlForEmail } from './utils/emailGate';

const AppContent: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    // checkUrlForEmail(); // Email gate is currently disabled.
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthenticated(!!user);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const [fetchedResources, fetchedLeads] = await Promise.all([
      api.getResources(),
      isAuthenticated ? api.getLeads() : Promise.resolve([]),
    ]);
    setResources(fetchedResources);
    setLeads(fetchedLeads);
    setIsLoading(false);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchData();
    }
  }, [fetchData, isAuthLoading]);

  useEffect(() => {
    if (window.self === window.top) return;
    
    let rafId: number;
    const postHeight = () => {
      rafId = requestAnimationFrame(() => {
        const height = document.documentElement.scrollHeight;
        window.parent.postMessage({ type: 'financial-library-resize', height }, '*');
      });
    };

    const observer = new ResizeObserver(postHeight);
    observer.observe(document.documentElement);
    document.addEventListener('transitionend', postHeight);
    
    postHeight();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
      document.removeEventListener('transitionend', postHeight);
    };
  }, []);

  const handleLogin = async (email: string, pass: string): Promise<boolean> => {
    return await api.login(email, pass);
  };

  const handleLogout = async () => {
    await api.logout();
  };

  const handleUpdateCredentials = async (currentPass: string, newUser: string, newPass: string): Promise<boolean> => {
    return await api.updateCredentials(currentPass, newUser, newPass);
  };

  const addLeadAndDownload = async (resourceId: string, leadData: { firstName: string; email: string; hasConsented: boolean; }) => {
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return;

    await api.addLead(resourceId, resource.title, leadData);
    
    if (!resource.isComingSoon && resource.fileUrl) {
      const link = document.createElement('a');
      link.href = resource.fileUrl;
      link.target = '_blank';
      link.download = resource.fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    fetchData();
  };

  const handleGoogleDriveClick = async (resourceId: string) => {
    await api.incrementResourceAccessCount(resourceId);
    fetchData();
  };

  const addResource = async (resourceData: Omit<Resource, 'id' | 'downloadCount'>) => {
    await api.addResource(resourceData);
    fetchData();
  };

  const updateResource = async (updatedResource: Resource) => {
    await api.updateResource(updatedResource);
    fetchData();
  };

  const deleteResource = async (id: string) => {
    const resourceToDelete = resources.find(r => r.id === id);
    if (resourceToDelete) {
      await api.deleteResource(id, resourceToDelete);
      fetchData();
    }
  };

  if (isLoading || isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold text-slate">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header isAuthenticated={isAuthenticated} onLogout={handleLogout} />

      <main className="flex-grow pb-16 md:pb-0">
        <Routes>
          <Route path="/" element={<HomePage resources={resources} onDownload={addLeadAndDownload} onGoogleDriveClick={handleGoogleDriveClick} />} />
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route 
            path="/admin"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <AdminPage 
                  resources={resources} 
                  leads={leads}
                  addResource={addResource}
                  updateResource={updateResource}
                  deleteResource={deleteResource}
                  adminUsername={currentUser?.email || 'Admin'}
                  updateCredentials={handleUpdateCredentials}
                />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <Footer isAuthenticated={isAuthenticated} />
      <BottomNav isAuthenticated={isAuthenticated} onLogout={handleLogout} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
};

export default App;
