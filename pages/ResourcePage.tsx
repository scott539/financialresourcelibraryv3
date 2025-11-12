import React, { useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Resource } from '../types';
// The SUBSCRIBER_EMAIL_KEY is no longer used for writing but is kept for context.
import { SUBSCRIBER_EMAIL_KEY, getSubscriberEmail/*, saveSubscriberEmail*/ } from '../utils/emailGate';
import { DownloadIcon } from '../components/icons';

interface ResourcePageProps {
  resources: Resource[];
  onDownload: (resourceId: string, lead: { firstName: string; email: string; hasConsented: boolean; }) => Promise<void>;
}

const ResourcePage: React.FC<ResourcePageProps> = ({ resources, onDownload }) => {
  const { id } = useParams<{ id: string }>();
  const resource = resources.find(r => r.id === id);

  // The subscriberEmail will always be populated now, bypassing the form.
  const [subscriberEmail, setSubscriberEmail] = useState<string | null>(() => getSubscriberEmail());
  
  // State for the form is kept but commented out for potential future use.
  /*
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [hasConsented, setHasConsented] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  */
 
  const [error, setError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);


  if (!resource) {
    return <Navigate to="/" />;
  }
  
  /*
  // Form logic is commented out as the email gate is disabled.
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

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
      setSubscriberEmail(email);
      setIsSubmitted(true);
    } catch (err) {
      console.error("Submission failed:", err);
      setError("Submission failed. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  */

  const handleDirectDownload = async () => {
    if (!subscriberEmail || !resource) return;
    setIsDownloading(true);
    setError('');
    try {
      // We don't have a first name, so we provide a default.
      // Consent is implied by the user having already passed the gate.
      const lead = { firstName: 'Subscriber', email: subscriberEmail, hasConsented: true };
      await onDownload(resource.id, lead);
    } catch (err) {
      console.error("Download failed:", err);
      setError("Download failed. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const renderDirectDownload = () => (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-slate mb-2">Welcome!</h2>
      <p className="text-gray-600 mb-6">
        You have unlocked this resource. Click below to get instant access.
      </p>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      <button 
          onClick={handleDirectDownload}
          disabled={isDownloading}
          className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-md transition duration-300 disabled:opacity-50 flex items-center justify-center"
      >
          <DownloadIcon className="w-5 h-5 mr-2"/>
          {isDownloading ? 'Downloading...' : `Download: ${resource?.title}`}
      </button>
      {/* The 'Not you?' link is hidden as the email is now a placeholder. */}
      {/*
      <p className="text-xs text-gray-500 mt-4">
          Logged in as {subscriberEmail}. Not you?{' '}
          <button 
            onClick={() => { 
              localStorage.removeItem(SUBSCRIBER_EMAIL_KEY); 
              setSubscriberEmail(null); 
              setError('');
            }} 
            className="underline text-primary hover:text-primary-dark"
          >
            Click here
          </button>.
      </p>
      */}
    </div>
  );

  /*
  // The form is no longer rendered.
  const renderForm = () => {
    if (isSubmitted) {
      return (
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
        </div>
      );
    }

    return (
       <>
        <h2 className="text-2xl font-bold text-slate mb-1">
          {resource.isComingSoon ? 'Be the First to Know' : 'Get Your Free Resource'}
        </h2>
        <p className="text-gray-600 mb-6">
          {resource.isComingSoon 
            ? "This resource is currently in development. Sign up to get notified upon release."
            : "Enter your details below to get instant access."}
        </p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
            <input
              type="text"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="mb-6">
            <label htmlFor="consent" className="flex items-start space-x-3">
              <input
                id="consent"
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
    )
  }
  */

  return (
    <div className="bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-primary">{resource.category}</span>
            <h1 className="text-4xl font-extrabold text-slate mt-2 mb-4">{resource.title}</h1>
            <img src={resource.imageUrl} alt={resource.title} className="w-full aspect-square object-cover rounded-lg shadow-lg mb-6" />
             <div className="mb-6 flex flex-wrap gap-2">
                {(resource.tags || []).map(tag => (
                  <span key={tag} className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary bg-secondary/30">
                    {tag}
                  </span>
                ))}
            </div>
            <p className="text-lg text-gray-600 leading-relaxed">{resource.description}</p>
            <div className="mt-6 flex items-center space-x-4 text-sm text-gray-500">
                <span>Type: <strong>{resource.type}</strong></span>
                <span>|</span>
                <span>{resource.isComingSoon ? 'Signups' : 'Downloads'}: <strong>{(resource.downloadCount || 0).toLocaleString()}</strong></span>
            </div>
          </div>
          <div className="bg-background-light p-8 rounded-lg shadow-lg sticky top-8">
            {/* Since the email gate is disabled, we always show the direct download option. */}
            {renderDirectDownload()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourcePage;
