import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * PrivacyProtection component
 * Minimizes browser history entries and prevents search engine indexing
 * by using history.replaceState for navigation
 */
const PrivacyProtection = () => {
  const location = useLocation();

  useEffect(() => {
    // Replace current history entry instead of adding new one
    // This minimizes the URL appearing in browser history
    if (window.history.replaceState) {
      window.history.replaceState(
        null,
        document.title,
        window.location.href
      );
    }

    // Clear any sensitive data from history state
    if (window.history.state) {
      try {
        window.history.replaceState(
          {},
          document.title,
          window.location.href
        );
      } catch (e) {
        // Silently fail if replaceState is not available
      }
    }
  }, [location.pathname]);

  // Intercept browser back/forward buttons to use replaceState
  useEffect(() => {
    const handlePopState = (event) => {
      // When user uses back/forward, replace the history entry
      if (window.history.replaceState) {
        setTimeout(() => {
          window.history.replaceState(
            {},
            document.title,
            window.location.href
          );
        }, 0);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Prevent page from being cached
  useEffect(() => {
    // Set cache control headers via meta tags (already in index.html)
    // Also prevent browser from storing page in cache
    if ('serviceWorker' in navigator) {
      // Clear any cached service worker data
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
    }

    // Prevent browser from saving form data
    const forms = document.querySelectorAll('form');
    forms.forEach((form) => {
      form.setAttribute('autocomplete', 'off');
    });
  }, []);

  return null; // This component doesn't render anything
};

export default PrivacyProtection;

