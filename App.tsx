
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import EmbedResourcePage from './pages/EmbedResourcePage';
import PreviewResourcePage from './pages/PreviewResourcePage';
import ProtectedRoute from './components/ProtectedRoute';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import { Resource, Lead } from './types';
import { auth } from './firebaseConfig';
import * as api from './services/api';
import { STATIC_RESOURCES } from './data/staticResources';
import { AdminIcon } from './components/icons';

const AppContent: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const location = useLocation();

  // Check if we are in "headless" mode for embedding
  const isEmbedMode = location.pathname.startsWith('/embed/');

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
    
    // Merge database resources and static resources, ensuring we don't duplicate by ID or exact title
    const mergedResources = [...fetchedResources];
    for (const staticRes of STATIC_RESOURCES) {
      if (!mergedResources.some(r => r.id === staticRes.id || r.title.toLowerCase() === staticRes.title.toLowerCase())) {
        mergedResources.push(staticRes);
      }
    }

    // Apply session storage fallback to prevent count resetting on instant refreshes or slow background writes
    try {
      mergedResources.forEach(res => {
        const sessionKey = `bp_accessed_${res.id}`;
        if (sessionStorage.getItem(sessionKey)) {
          const baseline = STATIC_RESOURCES.find(s => s.id === res.id)?.downloadCount || 0;
          const expectedMin = (baseline || 0) + 1;
          if ((res.downloadCount || 0) < expectedMin) {
            res.downloadCount = expectedMin;
          }
        }
      });
    } catch (e) {
      console.error('Error applying session storage fallback:', e);
    }

    setResources(mergedResources);
    setLeads(fetchedLeads);
    setIsLoading(false);
    setIsInitialLoad(false);
  }, [isAuthenticated]);

  // Real-time synchronization of resources
  useEffect(() => {
    if (isAuthLoading) return;

    const unsubscribe = api.subscribeResources((fetchedResources) => {
      const mergedResources = [...fetchedResources];
      for (const staticRes of STATIC_RESOURCES) {
        if (!mergedResources.some(r => r.id === staticRes.id || r.title.toLowerCase() === staticRes.title.toLowerCase())) {
          mergedResources.push(staticRes);
        }
      }

      try {
        mergedResources.forEach(res => {
          const sessionKey = `bp_accessed_${res.id}`;
          if (sessionStorage.getItem(sessionKey)) {
            const baseline = STATIC_RESOURCES.find(s => s.id === res.id)?.downloadCount || 0;
            const expectedMin = (baseline || 0) + 1;
            if ((res.downloadCount || 0) < expectedMin) {
              res.downloadCount = expectedMin;
            }
          }
        });
      } catch (e) {
        console.error('Error applying session storage fallback:', e);
      }

      setResources(mergedResources);
      setIsLoading(false);
      setIsInitialLoad(false);
    }, (err) => {
      console.error("Real-time subscription failed, falling back to manual fetch:", err);
      fetchData();
    });

    return () => unsubscribe();
  }, [isAuthLoading, fetchData]);

  // Sync static resources to Firestore when an authenticated admin/dev session starts
  useEffect(() => {
    if (isAuthenticated) {
      const syncAndReload = async () => {
        await api.syncStaticResources(STATIC_RESOURCES);
        fetchData();
      };
      syncAndReload();
    }
  }, [isAuthenticated, fetchData]);

  useEffect(() => {
    if (window.self === window.top) return;

    let rafId: number;
    let lastSent = 0;

    const measure = (): number => {
      // Use the largest of several signals so we never under-report (which is what
      // causes an internal scrollbar). scrollHeight can round down and can lag behind
      // content changes, so we also consider the body's rendered bottom edge.
      const doc = document.documentElement;
      const body = document.body;
      const rectBottom = Math.ceil(body.getBoundingClientRect().bottom);
      return Math.max(
        doc.scrollHeight,
        doc.offsetHeight,
        body ? body.scrollHeight : 0,
        body ? body.offsetHeight : 0,
        rectBottom
      );
    };

    const postHeight = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        // Add a tiny buffer so sub-pixel rounding on the host side can't clip the last row.
        const height = measure() + 2;
        if (height !== lastSent) {
          lastSent = height;
          window.parent.postMessage({ type: 'financial-library-resize', height }, '*');
        }
      });
    };

    // Observe both documentElement and body so any content growth is caught.
    const observer = new ResizeObserver(postHeight);
    observer.observe(document.documentElement);
    if (document.body) observer.observe(document.body);

    document.addEventListener('transitionend', postHeight);
    window.addEventListener('load', postHeight);
    window.addEventListener('resize', postHeight);

    // Re-measure a few times after mount to catch late layout shifts (web fonts,
    // images decoding, etc.) without needing an event for each.
    const settleTimers = [100, 300, 600, 1200].map((t) => window.setTimeout(postHeight, t));

    // If any image finishes loading, its natural size may change the card height.
    const imgs = Array.from(document.images || []);
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener('load', postHeight, { once: true });
    });

    postHeight();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
      document.removeEventListener('transitionend', postHeight);
      window.removeEventListener('load', postHeight);
      window.removeEventListener('resize', postHeight);
      settleTimers.forEach((id) => clearTimeout(id));
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

  const addLeadAndDownload = async (
    resourceId: string, 
    leadData: { firstName: string; email: string; hasConsented: boolean; },
    triggerFileDownload: boolean = true
  ) => {
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return;

    // Use sessionStorage to de-duplicate increments on the client side per browser tab session
    const sessionKey = `bp_accessed_${resourceId}`;
    const alreadyAccessed = sessionStorage.getItem(sessionKey);
    const shouldIncrement = !alreadyAccessed;

    if (shouldIncrement) {
      sessionStorage.setItem(sessionKey, 'true');
      // Update local React state instantly so the user sees the count increment by 1 immediately
      setResources(prev => prev.map(r => r.id === resourceId ? { ...r, downloadCount: (r.downloadCount || 0) + 1 } : r));
    }

    // Log the lead in the background. Only increment the Firestore download/view count if not already accessed in this session.
    api.addLead(resourceId, resource.title, leadData, shouldIncrement)
      .then(() => fetchData())
      .catch((err) => console.error('Error logging lead:', err));
    
    if (triggerFileDownload && !resource.isComingSoon && resource.fileUrl && !resource.isOpenDirectly) {
      const link = document.createElement('a');
      link.href = resource.fileUrl;
      link.target = '_blank';
      link.download = resource.fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleGoogleDriveClick = (resourceId: string) => {
    // Use sessionStorage to de-duplicate increments on the client side per browser tab session
    const sessionKey = `bp_accessed_${resourceId}`;
    const alreadyAccessed = sessionStorage.getItem(sessionKey);
    const shouldIncrement = !alreadyAccessed;

    if (shouldIncrement) {
      sessionStorage.setItem(sessionKey, 'true');
      // Update local React state instantly so the user sees the count increment by 1 immediately
      setResources(prev => prev.map(r => r.id === resourceId ? { ...r, downloadCount: (r.downloadCount || 0) + 1 } : r));

      // Increment access in the background so we do not wait or expire the user click gesture
      api.incrementResourceAccessCount(resourceId)
        .then(() => fetchData())
        .catch((err) => console.error('Error incrementing resource access:', err));
    }
  };

  const addResource = async (resourceData: Omit<Resource, 'id'>, file?: File) => {
    await api.addResource(resourceData, file);
    fetchData();
  };

  const updateResource = async (updatedResource: Resource, file?: File) => {
    await api.updateResource(updatedResource, file);
    fetchData();
  };

  const deleteResource = async (id: string) => {
    const resourceToDelete = resources.find(r => r.id === id);
    if (resourceToDelete) {
      await api.deleteResource(id, resourceToDelete);
      fetchData();
    }
  };

  // Hide site chrome (Header, Footer, BottomNav) if in embed mode or on the main resource directory/privacy pages when embedded,
  // allowing seamless direct embedding into BiggerPockets' existing website without layout overlap.
  // We keep the chrome fully visible if visited standalone (not in an iframe), in development/preview environments, or if logged in as an admin.
  const isEmbedded = window.self !== window.top;
  const showManage = !!(isAuthenticated && currentUser && !currentUser.isAnonymous);
  
  const isDevelopmentOrPreview = (): boolean => {
    const hostname = window.location.hostname;
    return (
      hostname.includes('localhost') ||
      hostname.includes('run.app') ||
      hostname.includes('web-preview')
    );
  };

  const isChromeHidden = isEmbedMode || (isEmbedded && !isDevelopmentOrPreview() && (location.pathname === '/' || location.pathname === '' || location.pathname === '/privacy') && !showManage);

  if ((isLoading && isInitialLoad) || isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold text-slate">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isChromeHidden ? 'bg-transparent' : 'min-h-screen bg-paper'}`}>
      {!showManage && !isChromeHidden && !isEmbedded && (
        <Link
          id="admin-public-floating-btn"
          to="/admin"
          className="fixed top-3 right-4 z-[9999] inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-600 hover:text-white font-bold tracking-wider uppercase px-3 py-1.5 select-none cursor-pointer bg-white hover:bg-primary border border-slate-200 hover:border-primary rounded-lg shadow-sm transition-all duration-200"
          title="Admin Login"
        >
          <AdminIcon className="w-3.5 h-3.5" />
          Admin
        </Link>
      )}
      {showManage && <Header isAuthenticated={isAuthenticated} onLogout={handleLogout} showManage={showManage} />}

      <main className={`flex-grow ${!isChromeHidden ? 'pb-16 md:pb-0' : ''}`}>
        <Routes>
          <Route path="/" element={<HomePage resources={resources} onDownload={addLeadAndDownload} onGoogleDriveClick={handleGoogleDriveClick} showManage={showManage} />} />
          <Route path="/embed/:id" element={<EmbedResourcePage resources={resources} onDownload={addLeadAndDownload} onGoogleDriveClick={handleGoogleDriveClick} />} />
          <Route path="/preview/:id" element={<PreviewResourcePage resources={resources} onDownload={addLeadAndDownload} onGoogleDriveClick={handleGoogleDriveClick} />} />
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route 
            path="/admin"
            element={
              <ProtectedRoute isAuthenticated={showManage}>
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
          {/* Wildcard catch-all route to guarantee no route change (e.g. from ConvertKit hash anchors) ever causes a blank screen */}
          <Route path="*" element={<HomePage resources={resources} onDownload={addLeadAndDownload} onGoogleDriveClick={handleGoogleDriveClick} showManage={showManage} />} />
        </Routes>
      </main>
      
      {!isChromeHidden && <Footer showManage={showManage} />}
      {!isChromeHidden && <BottomNav isAuthenticated={isAuthenticated} onLogout={handleLogout} showManage={showManage} />}
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
