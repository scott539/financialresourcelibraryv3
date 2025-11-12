import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Resource } from '../types';
import { saveSubscriberEmail } from '../utils/emailGate';
import { LinkIcon } from './icons';

interface DownloadModalProps {
  resource: Resource | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (resourceId: string, lead: { firstName: string; email: string; hasConsented: boolean; }) => Promise<void>;
}

const DownloadModal: React.FC<DownloadModalProps> = ({ resource, isOpen, onClose, onDownload }) => {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [hasConsented, setHasConsented] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset form state when modal opens
      setFirstName('');
      setEmail('');
      setHasConsented(false);
      setError('');
      setIsSubmitted(false);
      setIsSubmitting(false);
      // Prevent background scrolling when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    // Cleanup function to restore scrolling
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen || !resource) return null;

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !email.trim()) {
      setError('All fields are required.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!hasConsented) {
      setError('You must consent to our terms to proceed.');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    try {
      const lead = { firstName, email, hasConsented };
      await onDownload(resource.id, lead);
      saveSubscriberEmail(email);
      setIsSubmitted(true);
    } catch (err) {
      console.error("Submission failed:", err);
      setError("Submission failed. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSuccess = () => (
    <div className="text-center">
      <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h2 className="mt-4 text-2xl font-bold text-slate">Thank You!</h2>
      <p className="mt-2 text-gray-600">
        {resource.isComingSoon 
          ? "You're on the list! We'll notify you as soon as this resource is available."
          : "Your download should begin automatically. We've also sent a confirmation to your email."}
      </p>
      <div className="mt-6 flex flex-col sm:flex-row-reverse gap-3">
        <button 
          onClick={onClose} 
          className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-md transition duration-300"
        >
          Close
        </button>
        {resource.googleDriveUrl && (
            <a
              href={resource.googleDriveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-white text-blue-600 font-bold py-2 px-4 rounded-md transition duration-300 hover:bg-blue-50 border border-gray-300 flex items-center justify-center gap-2"
            >
              <LinkIcon className="w-5 h-5" />
              Open in Google Drive
            </a>
          )}
      </div>
    </div>
  );

  const renderForm = () => (
    <>
      <h2 className="text-2xl font-bold text-slate mb-1">
        {resource.isComingSoon ? 'Be the First to Know' : 'Get Your Free Resource'}
      </h2>
      <p className="text-gray-600 mb-6 text-sm">
        You're about to get: <strong className="text-slate">{resource.title}</strong>
      </p>
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label htmlFor="modalFirstName" className="block text-sm font-medium text-gray-700">First Name</label>
          <input
            type="text"
            id="modalFirstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            required
            disabled={isSubmitting}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="modalEmail" className="block text-sm font-medium text-gray-700">Email Address</label>
          <input
            type="email"
            id="modalEmail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            required
            disabled={isSubmitting}
          />
        </div>
        <div className="mb-6">
          <label htmlFor="modalConsent" className="flex items-start space-x-3">
            <input
              id="modalConsent"
              name="consent"
              type="checkbox"
              checked={hasConsented}
              onChange={(e) => setHasConsented(e.target.checked)}
              className="h-4 w-4 mt-1 rounded border-gray-300 text-primary focus:ring-primary"
              required
              disabled={isSubmitting}
            />
            <span className="text-sm text-gray-600">
              I consent to be added to the BiggerPockets Money email list. See our{' '}
              <Link
                to="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="text-primary underline hover:text-primary-dark"
              >
                Privacy Policy
              </Link>.
            </span>
          </label>
        </div>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-md transition duration-300 disabled:opacity-50" disabled={isSubmitting || !hasConsented}>
          {isSubmitting ? 'Submitting...' : resource.isComingSoon ? 'Notify Me' : 'Download Now'}
        </button>
      </form>
    </>
  );
  
  return (
    <div 
      className="fixed inset-0 bg-slate bg-opacity-75 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 sm:p-8 relative transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
        style={{animation: 'fade-in-scale 0.3s forwards'}}
      >
        <button 
          onClick={onClose} 
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-2 rounded-full"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {isSubmitted ? renderSuccess() : renderForm()}
      </div>
       <style>{`
        @keyframes fade-in-scale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-scale {
          animation: fade-in-scale 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default DownloadModal;