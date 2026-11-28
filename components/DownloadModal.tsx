import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { observeVisibleRange, placeModal, recentAnchorY } from '../utils/modalPlacement';
import { Resource } from '../types';
import { clearPendingSignup, getPendingSignup, savePendingSignup, saveSubscriberEmail } from '../utils/emailGate';
import { subscribeToKit } from '../utils/kitSubscribe';
import { createModalSession, openKitCheck, submitSignup, SignupView } from '../utils/signupFlow';
import { LinkIcon } from './icons';

interface DownloadModalProps {
  resource: Resource | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (resourceId: string, lead: { firstName: string; email: string; hasConsented: boolean; }, triggerFileDownload?: boolean) => Promise<void>;
  onGoogleDriveClick: (resourceId: string) => void;
  actionType?: 'download' | 'gdrive';
}

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
  const [view, setView] = useState<SignupView>({ name: 'form', error: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const error = view.name === 'form' ? view.error : '';
  const setError = (message: string) => setView({ name: 'form', error: message });

  const modalRef = useRef<HTMLDivElement>(null);
  // A Kit reply stamped with an older session belongs to a modal that was closed or reopened.
  const session = useRef(createModalSession()).current;

  useEffect(() => {
    session.begin();
    if (isOpen) {
      // Reset form state when modal opens. A signup Kit held for its check only prefills the form.
      const pending = getPendingSignup();
      setFirstName(pending?.firstName ?? '');
      setEmail(pending?.email ?? '');
      setHasConsented(true);
      setView({ name: 'form', error: '' });
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
  }, [isOpen, resource?.id]);

  // Opened directly (the Vercel app), the panel is a fixed dialog centered in the
  // viewport and never taller than it. Inside the embed the library is a tall iframe
  // and the host page scrolls, so a fixed, centered panel would land in the middle of
  // the catalog. There the panel is placed in document coordinates, centered on the
  // part of the frame that is on screen (or where the visitor tapped, until that part
  // is known), and placed again whenever its content changes height.
  const inFrame = typeof window !== 'undefined' && window.self !== window.top;
  const [panelTop, setPanelTop] = useState<number | null>(null);
  const [docHeight, setDocHeight] = useState(0);
  const [maxPanelHeight, setMaxPanelHeight] = useState<number | null>(null);
  const showing = isOpen && !!resource;

  useLayoutEffect(() => {
    if (!showing) { setPanelTop(null); return; }
    if (!inFrame) return;
    const anchorY = recentAnchorY();
    let visible: [number, number] | null = null;
    let reported = false;
    const place = () => {
      const panel = modalRef.current;
      if (!panel) return;
      const height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, window.innerHeight);
      setDocHeight(height);
      const top = placeModal({
        anchorY: visible ? null : anchorY,
        visibleTop: visible ? visible[0] : null,
        visibleBottom: visible ? visible[1] : null,
        panelHeight: panel.offsetHeight,
        docHeight: height,
      });
      setPanelTop(top);
      if (window.self !== window.top && !reported && visible) {
        reported = true;
        window.parent.postMessage({ type: 'bpm-library-modal', top }, '*');
      }
    };
    place();
    // Only the first report matters: once placed, the panel scrolls with the page like content.
    let done = false;
    const stop = observeVisibleRange((top, bottom) => {
      if (done) return;
      done = true;
      visible = [top, bottom];
      setMaxPanelHeight(Math.max(320, bottom - top - 32));
      place();
    });
    // The error line, or a switch between views, changes the panel's height after it was placed.
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => place());
    if (resize && modalRef.current) resize.observe(modalRef.current);
    const fallback = window.setTimeout(() => {
      if (window.self !== window.top && !reported) {
        reported = true;
        window.parent.postMessage({ type: 'bpm-library-modal', top: modalRef.current?.offsetTop ?? 0 }, '*');
      }
    }, 300);
    return () => { stop(); resize?.disconnect(); window.clearTimeout(fallback); };
  }, [showing, inFrame, view.name]);

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
    const stamp = session.stamp();
    const isCurrent = () => session.isCurrent(stamp);
    const lead = { firstName: firstName.trim(), email: email.trim(), hasConsented };
    const resourceId = resource.id;

    try {
      // Kit's answer decides the view. Nothing is remembered as subscribed unless Kit took it,
      // and a reply that lands after the modal moved on changes nothing on screen.
      await submitSignup({
        subscribe: () => subscribeToKit({
          firstName: lead.firstName,
          email: lead.email,
          referrer: `${window.location.origin}/?resource=${encodeURIComponent(resourceId)}`,
        }),
        logLead: () => onDownload(resourceId, lead, false),
        rememberSubscriber: () => saveSubscriberEmail(lead.email),
        rememberPending: () => savePendingSignup({ firstName: lead.firstName, email: lead.email }),
        clearPending: clearPendingSignup,
        isCurrent,
        show: setView,
      });
    } catch (err) {
      console.error("Submission failed:", err);
      if (isCurrent()) setError("An unexpected error occurred. Please try again.");
    } finally {
      if (isCurrent()) setIsSubmitting(false);
    }
  };

  const renderSuccess = () => (
    <div className="text-center py-8 animate-fade-in-scale">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 mb-6 border border-emerald-100 shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl font-black text-ink tracking-tight mb-2">You're All Set!</h2>
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
        {/* The only control here unless the Drive link is shown, so it is the primary button then. */}
        <button 
          type="button"
          onClick={onClose} 
          className={actionType === 'gdrive' && resource.googleDriveUrl
            ? "w-full border border-line bg-white text-ink2 hover:text-primary hover:border-primary font-bold py-3.5 px-4 rounded-xl transition duration-300 text-sm focus-visible:outline-primary focus-visible:outline-offset-2"
            : "w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 px-4 rounded-xl transition duration-300 shadow-sm text-sm focus-visible:outline-primary focus-visible:outline-offset-2"}
        >
          Back to Library
        </button>
      </div>
    </div>
  );

  const checkUrl = view.name === 'kitCheck' || view.name === 'checkEmail' ? view.url : undefined;

  const renderKitCheck = () => (
    <div className="text-center py-8 animate-fade-in-scale">
      <h2 className="text-2xl font-black text-ink tracking-tight mb-2">One more step</h2>
      <p className="text-gray-600 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
        Our email provider, Kit, needs a quick check that you're a person before it adds you to the list. The check opens in a new tab.
      </p>
      <div className="flex flex-col gap-3">
        <a
          href={checkUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => openKitCheck(view, setView)}
          className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 px-4 rounded-xl transition duration-300 shadow-sm text-sm focus-visible:outline-primary focus-visible:outline-offset-2"
        >
          Finish signing up
        </a>
        <button
          onClick={onClose}
          type="button"
          className="w-full border border-line bg-white text-ink2 hover:text-primary hover:border-primary font-bold py-3.5 px-4 rounded-xl transition duration-300 text-sm focus-visible:outline-primary focus-visible:outline-offset-2"
        >
          Back to Library
        </button>
      </div>
    </div>
  );

  // After the visitor opens Kit's check. This page never hears how the check went, so the copy
  // only says what is left to do, and the visitor is not remembered as subscribed.
  const renderCheckEmail = () => (
    <div className="text-center py-8 animate-fade-in-scale">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-card text-primary mb-6 border border-line shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9 6 9-6" />
        </svg>
      </div>
      <h2 className="text-2xl font-black text-ink tracking-tight mb-2">Check your email to finish signing&nbsp;up</h2>
      <p className="text-gray-600 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
        Once you pass Kit's check in the new tab, Kit emails you a link to confirm. You're on the list after you click it.
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
          type="button"
          onClick={onClose}
          className={actionType === 'gdrive' && resource.googleDriveUrl
            ? "w-full border border-line bg-white text-ink2 hover:text-primary hover:border-primary font-bold py-3.5 px-4 rounded-xl transition duration-300 text-sm focus-visible:outline-primary focus-visible:outline-offset-2"
            : "w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 px-4 rounded-xl transition duration-300 shadow-sm text-sm focus-visible:outline-primary focus-visible:outline-offset-2"}
        >
          Back to Library
        </button>
        <a
          href={checkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-500 underline hover:text-primary py-2"
        >
          Closed the tab? Open Kit's check again
        </a>
      </div>
    </div>
  );

  const renderForm = () => (
    <>
      <div className="text-center mb-6">
        {/* Resource Mini Card Preview to visually hook the user. The top margin keeps it clear of the close button. */}
        <div className="flex items-center gap-4 p-3 bg-card border border-line2 rounded-2xl mt-7 sm:mt-5 mb-6 text-left">
          <img 
            src={resource.imageUrl} 
            alt={resource.title} 
            className="w-14 h-14 object-cover rounded-xl shadow-sm border border-line flex-shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary mb-1">
              {resource.isComingSoon ? 'Sign Up' : resource.isOpenDirectly ? 'Web App / Calculator' : actionType === 'gdrive' ? 'Google Drive Link' : 'Instant Download'}
            </span>
            <h3 className="font-bold text-ink text-sm truncate leading-tight">{resource.title}</h3>
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
        
        <h2 className="text-2xl font-black text-ink tracking-tight mb-1.5">
          {resource.isComingSoon ? 'Get notified when this launches' : 'Want to stay updated on this resource?'}
        </h2>
        <p className="text-gray-500 text-xs leading-relaxed max-w-sm mx-auto">
          {resource.isComingSoon 
            ? 'Sign up to get notified the second this toolkit becomes available.'
            : 'Sign up to receive the latest version of this tool plus future calculators, worksheets, and finance updates directly to your inbox.'}
        </p>
      </div>

      {/* The signup is sent to Kit by utils/kitSubscribe.ts, which reads Kit's answer. */}
      <form 
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
      >

        <div>
          <label htmlFor="modalFirstName" className="block text-xs font-bold text-ink mb-1.5">
            First Name
          </label>
          <input
            type="text"
            id="modalFirstName"
            name="fields[first_name]"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="e.g. Scott"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-sm text-ink disabled:bg-gray-50 font-medium"
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="modalEmail" className="block text-xs font-bold text-ink mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            id="modalEmail"
            name="email_address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. scott@biggerpocketsmoney.com"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-sm text-ink disabled:bg-gray-50 font-medium"
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
          className="hover:text-ink underline focus:outline-none transition-colors"
        >
          No thanks, just close
        </button>
        <button 
          onClick={onClose}
          className="hover:text-ink focus:outline-none transition-colors"
        >
          Cancel
        </button>
      </div>
    </>
  );
  
  const closeButton = (
    <button 
      onClick={onClose} 
      className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition duration-200"
      aria-label="Close modal"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
  const body = view.name === 'done' ? renderSuccess()
    : view.name === 'kitCheck' ? renderKitCheck()
    : view.name === 'checkEmail' ? renderCheckEmail()
    : renderForm();
  const keyframes = (
    <style>{`
      @keyframes fade-in-scale {
        from { opacity: 0; transform: translateX(-50%) scale(0.96); }
        to { opacity: 1; transform: translateX(-50%) scale(1); }
      }
      @keyframes fade-in-scale-centered {
        from { opacity: 0; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1); }
      }
    `}</style>
  );

  if (!inFrame) {
    // Centered in the viewport, 1rem clear of every edge; tall content scrolls inside the panel.
    return createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#13231a]/70 backdrop-blur-sm"
        onClick={onClose}
        aria-modal="true"
        role="dialog"
      >
        <div
          ref={modalRef}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-full p-6 sm:p-8 overflow-y-auto overscroll-contain border border-gray-100"
          onClick={e => e.stopPropagation()}
          style={{ animation: 'fade-in-scale-centered 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
        >
          {closeButton}
          {body}
        </div>
        {keyframes}
      </div>,
      document.body
    );
  }

  return createPortal(
    <div 
      className="absolute left-0 top-0 w-full bg-[#13231a]/70 backdrop-blur-sm z-50"
      style={{ height: docHeight || '100%' }}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-[calc(100%-2rem)] max-w-md p-6 sm:p-8 absolute left-1/2 -translate-x-1/2 overflow-y-auto overscroll-contain border border-gray-100"
        onClick={e => e.stopPropagation()}
        style={{
          top: panelTop ?? 0,
          maxHeight: maxPanelHeight ?? undefined,
          visibility: panelTop === null ? 'hidden' : 'visible',
          animation: 'fade-in-scale 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {closeButton}
        {body}
      </div>
      {keyframes}
    </div>,
    document.body
  );
};

export default DownloadModal;
