export const SUBSCRIBER_EMAIL_KEY = 'financial_library_subscriber_email';

// Basic email validation
const isValidEmail = (email: string | null): boolean => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const saveSubscriberEmail = (email: string): void => {
  if (email && isValidEmail(email)) {
    try {
      localStorage.setItem(SUBSCRIBER_EMAIL_KEY, email);
    } catch (error) {
      console.error("Could not save email to localStorage", error);
    }
  }
};

export const getSubscriberEmail = (): string | null => {
  try {
    return localStorage.getItem(SUBSCRIBER_EMAIL_KEY);
  } catch (error) {
    console.error("Could not read email from localStorage", error);
    return null;
  }
};

// This function should be called once when the app loads.
export const checkUrlForEmail = (): void => {
    // We are using HashRouter, so params are in the hash part of the URL
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(hash.substring(hash.indexOf('?')));
    const emailFromUrl = searchParams.get('email');

    if (emailFromUrl && isValidEmail(emailFromUrl)) {
        saveSubscriberEmail(emailFromUrl);
        // Clean the URL to remove the email parameter for a cleaner user experience
        const cleanUrl = window.location.pathname + window.location.hash.split('?')[0];
        if (window.history.replaceState) {
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }
};
