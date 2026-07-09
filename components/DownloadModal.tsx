import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Resource } from '../types';
import { saveSubscriberEmail } from '../utils/emailGate';
import { LinkIcon } from './icons';

interface DownloadModalProps {
  resource: Resource | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (resourceId: string, lead: { firstName: string; email: string; hasConsented: boolean; }, triggerFileDownload?: boolean) => Promise<void>;
  onGoogleDriveClick: (resourceId: string) => void;
  actionType?: 'download' | 'gdrive';
}

const CONVERTKIT_FORM_ID = '2f902835bb';
const CONVERTKIT_SUBMIT_URL = `https://app.convertkit.com/html_forms/${CONVERTKIT_FORM_ID}/subscriptions`;

const DownloadModal: React.FC<DownloadModalProps> = ({ 
  resource, 
  isOpen, 
  onClose, 
  onDownload, 
  onGoogleDriveClick,
  actionType = 'download'
}) => {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [hasConsented, setHasConsented] = useState(true); // Default to consented for better UX
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset form state when modal opens
      setFirstName('');
      setEmail('');
      setHasConsented(true);
      setError('');
      setIsSubmitted(false);
      setIsSubmitting(false);
      // Prevent background scrolling when modal is open
      document.body.style.overflow = 'hidden';
      
      // Auto-scroll to center the modal in the viewport (highly beneficial for embedded iframe views)
      setTimeout(() => {
        modalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
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
      setError('You must consent to proceed.');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    try {
      const lead = { firstName: firstName.trim(), email: email.trim(), hasConsented };
      
      // 1. Submit the form to ConvertKit programmatically via our hidden iframe target
      if (formRef.current) {
        formRef.current.submit();
      }

      // 2. Save the subscriber email locally to remember their state
      saveSubscriberEmail(email.trim());

      // 3. Log the lead to Firebase Firestore (without downloading the file again)
      await onDownload(resource.id, lead, false);

      setIsSubmitted(true);
    } catch (err) {
      console.error("Submission failed:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSuccess = () => (
    <div className="text-center py-8 animate-fade-in-scale">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 mb-6 border border-emerald-100 shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">You're All Set!</h2>
      <p className="text-gray-600 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
        {resource.isComingSoon 
          ? "We've added your email. We will notify you as soon as this brand new resource launches!"
          : resource.isOpenDirectly
            ? "The web app/calculator has opened in a new tab! Welcome to our community."
            : actionType === 'gdrive'
              ? "Your Google Drive folder has opened! You will now receive future updates and free resources."
              : "Your download has successfully started! Check your downloads folder, and welcome to our community."}
      </p>
      
      <div className="flex flex-col gap-3">
        {actionType === 'gdrive' && resource.googleDriveUrl && (
          <a
            href={resource.googleDriveUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onGoogleDriveClick(resource.id)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition duration-300 shadow-sm flex items-center justify-center gap-2 text-sm"
          >
            <LinkIcon className="w-4 h-4" />
            <span>Open in Google Drive</span>
          </a>
        )}
        <button 
          onClick={onClose} 
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl transition duration-300 shadow-sm text-sm"
        >
          Back to Library
        </button>
      </div>
    </div>
  );

  const renderForm = () => (
    <>
      <div className="text-center mb-6">
        {/* Resource Mini Card Preview to visually hook the user */}
        <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-100 rounded-2xl mb-6 text-left">
          <img 
            src={resource.imageUrl} 
            alt={resource.title} 
            className="w-14 h-14 object-cover rounded-xl shadow-sm border border-slate-200/60 flex-shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary mb-1">
              {resource.isComingSoon ? 'Sign Up' : resource.isOpenDirectly ? 'Web App / Calculator' : actionType === 'gdrive' ? 'Google Drive Link' : 'Instant Download'}
            </span>
            <h3 className="font-bold text-slate-900 text-sm truncate leading-tight">{resource.title}</h3>
            <p className="text-gray-500 text-xs truncate mt-0.5">{resource.category}</p>
          </div>
        </div>

        {/* Status indicator to reinforce that they already got it first */}
        {!resource.isComingSoon && (
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 border border-emerald-100/80 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>{resource.isOpenDirectly ? 'Calculator / Workbook Opened!' : actionType === 'gdrive' ? 'Google Drive Opened!' : 'File Download Started!'}</span>
          </div>
        )}
        
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1.5">
          {resource.isComingSoon ? 'Get notified when this launches' : 'Want to stay updated on this resource?'}
        </h2>
        <p className="text-gray-500 text-xs leading-relaxed max-w-sm mx-auto">
          {resource.isComingSoon 
            ? 'Sign up to get notified the second this toolkit becomes available.'
            : 'Sign up to receive the latest version of this tool plus future calculators, worksheets, and finance updates directly to your inbox.'}
        </p>
      </div>

      {/* Background program-post target iframe */}
      <iframe name="ck-hidden-modal-iframe" style={{ display: 'none' }} title="ConvertKit Silencer" />

      {/* Standard HTML Form targeting the silent background iframe */}
      <form 
        ref={formRef}
        action={CONVERTKIT_SUBMIT_URL}
        method="post"
        target="ck-hidden-modal-iframe"
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
      >
        <input type="hidden" name="form_id" value={CONVERTKIT_FORM_ID} />
        <input type="hidden" name="first_name" value={firstName} />

        <div>
          <label htmlFor="modalFirstName" className="block text-xs font-bold text-slate-700 mb-1.5">
            First Name
          </label>
          <input
            type="text"
            id="modalFirstName"
            name="fields[first_name]"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="e.g. Scott"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-sm text-slate-800 disabled:bg-gray-50 font-medium"
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="modalEmail" className="block text-xs font-bold text-slate-700 mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            id="modalEmail"
            name="email_address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. scott@biggerpocketsmoney.com"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-sm text-slate-800 disabled:bg-gray-50 font-medium"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="pt-1">
          <label htmlFor="modalConsent" className="flex items-start gap-2.5 cursor-pointer">
            <input
              id="modalConsent"
              name="consent"
              type="checkbox"
              checked={hasConsented}
              onChange={(e) => setHasConsented(e.target.checked)}
              className="h-4 w-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              required
              disabled={isSubmitting}
            />
            <span className="text-xs text-gray-500 leading-normal select-none">
              I consent to receive regular finance templates, updates, and resources. See our{' '}
              <Link
                to="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="text-primary underline font-medium hover:text-primary-dark"
              >
                Privacy Policy
              </Link>.
            </span>
          </label>
        </div>

        {error && (
          <p className="text-red-500 text-xs font-semibold bg-red-50 p-3 rounded-xl border border-red-100">
            {error}
          </p>
        )}

        <button 
          type="submit" 
          disabled={isSubmitting || !hasConsented}
          className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 px-6 rounded-xl transition duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2 transform active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-sm"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>{resource.isComingSoon ? 'Saving Notification...' : 'Saving Subscription...'}</span>
            </>
          ) : (
            <>
              <span>{resource.isComingSoon ? 'Get Notified' : 'Get Latest Version & Stay Updated'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </form>

      <div className="flex justify-between items-center text-xs text-gray-400 mt-6 pt-4 border-t border-gray-100 font-medium">
        <button 
          onClick={() => {
            // Remember they wanted to skip so we don't badger them on every subsequent click
            saveSubscriberEmail('anonymous@subscriber.direct');
            onClose();
          }}
          className="hover:text-slate-900 underline focus:outline-none transition-colors"
        >
          No thanks, just close
        </button>
        <button 
          onClick={onClose}
          className="hover:text-slate-900 focus:outline-none transition-colors"
        >
          Cancel
        </button>
      </div>
    </>
  );
  
  return (
    <div 
      className="fixed inset-0 bg-[#13231a]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 relative border border-gray-100 transform transition-all duration-300"
        onClick={e => e.stopPropagation()}
        style={{animation: 'fade-in-scale 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards'}}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition duration-200"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {isSubmitted ? renderSuccess() : renderForm()}
      </div>
       <style>{`
        @keyframes fade-in-scale {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default DownloadModal;
