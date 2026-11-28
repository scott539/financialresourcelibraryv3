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

// A signup Kit held for its spam check. It is not a subscription: the library still shows the
// email form, and only prefills it, so a visitor who comes back can send it again in one tap.
export const PENDING_SIGNUP_KEY = 'financial_library_pending_signup';

export interface PendingSignup { firstName: string; email: string; }

export const savePendingSignup = (signup: PendingSignup): void => {
  if (!signup.email || !isValidEmail(signup.email)) return;
  try {
    localStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify({ firstName: signup.firstName, email: signup.email }));
  } catch (error) {
    console.error("Could not save pending signup to localStorage", error);
  }
};

export const getPendingSignup = (): PendingSignup | null => {
  try {
    const raw = localStorage.getItem(PENDING_SIGNUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.email !== 'string' || !isValidEmail(parsed.email)) return null;
    return { firstName: typeof parsed.firstName === 'string' ? parsed.firstName : '', email: parsed.email };
  } catch {
    return null;
  }
};

export const clearPendingSignup = (): void => {
  try {
    localStorage.removeItem(PENDING_SIGNUP_KEY);
  } catch (error) {
    console.error("Could not clear pending signup from localStorage", error);
  }
};
