export const SUBSCRIBER_EMAIL_KEY = 'financial_library_subscriber_email';

// Basic email validation helper
const isValidEmail = (email: string | null): boolean => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Saves the subscriber email to localStorage to record consent
 */
export const saveSubscriberEmail = (email: string): void => {
  if (email && isValidEmail(email)) {
    try {
      localStorage.setItem(SUBSCRIBER_EMAIL_KEY, email);
    } catch (error) {
      console.error("Could not save email to localStorage", error);
    }
  }
};

/**
 * Retrieves the subscriber email if they have subscribed previously
 */
export const getSubscriberEmail = (): string | null => {
  try {
    return localStorage.getItem(SUBSCRIBER_EMAIL_KEY);
  } catch (error) {
    console.error("Could not read email from localStorage", error);
    return null;
  }
};

/**
 * Removes the subscription status (useful for testing or resetting)
 */
export const clearSubscriberEmail = (): void => {
  try {
    localStorage.removeItem(SUBSCRIBER_EMAIL_KEY);
  } catch (error) {
    console.error("Could not clear email from localStorage", error);
  }
};

/**
 * Helper to check if URL query params contain an email, to auto-verify subscribers arriving from emails
 */
export const checkUrlForEmail = (): void => {
  try {
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(hash.substring(hash.indexOf('?')));
    const emailFromUrl = searchParams.get('email');

    if (emailFromUrl && isValidEmail(emailFromUrl)) {
      saveSubscriberEmail(emailFromUrl);
      
      // Clean the URL hash query params for a beautiful address bar
      const cleanUrl = window.location.pathname + window.location.hash.split('?')[0];
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  } catch (error) {
    console.error("Error checking URL for email query param", error);
  }
};
