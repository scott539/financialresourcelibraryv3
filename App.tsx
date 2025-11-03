import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ResourcePage from './pages/ResourcePage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { Resource, Lead } from './types';
import { auth } from './firebaseConfig';
import * as api from './services/api';

const AppContent: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

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
    const postHeight = () => {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: 'financial-library-resize', height }, '*');
    };
    const observer = new ResizeObserver(postHeight);
    observer.observe(document.documentElement);
    document.addEventListener('transitionend', postHeight);
    const initialTimeout = setTimeout(postHeight, 100);
    return () => {
      clearTimeout(initialTimeout);
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
    // Note: newUser (email) update is not handled in the current api.ts for simplicity
    return await api.updateCredentials(currentPass, newUser, newPass);
  };

  const addLeadAndDownload = async (resourceId: string, leadData: { firstName: string; email: string }) => {
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return;
    await api.addLead(resourceId, resource.title, leadData);
    fetchData(); // Refetch to update download counts and leads
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
          <Route path="/" element={<HomePage resources={resources} />} />
          <Route path="/resource/:id" element={<ResourcePage resources={resources} onDownload={addLeadAndDownload} />} />
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
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