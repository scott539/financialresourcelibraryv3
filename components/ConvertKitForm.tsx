
import React, { useEffect } from 'react';

/**
 * This component loads the ConvertKit script for Modal or Slide-in forms.
 * It does not render any visible UI itself; it lets ConvertKit handle the popup.
 * 
 * INSTRUCTIONS:
 * 1. Create a "Slide-in" or "Modal" form in ConvertKit.
 * 2. Get the "JavaScript" embed code.
 * 3. Replace 'YOUR_NEW_UID' below with the 10-character ID from that code.
 *    Example: src="https://biggerpockets-money.kit.com/a1b2c3d4e5/index.js" -> UID is "a1b2c3d4e5"
 */

const CONVERTKIT_UID = 'c7b5581604';

const ConvertKitScript: React.FC = () => {
  useEffect(() => {
    // specific check to ensure we don't load duplicate scripts
    const existingScript = document.querySelector(`script[data-uid="${CONVERTKIT_UID}"]`);
    if (existingScript) return;

    const script = document.createElement('script');
    script.async = true;
    script.dataset.uid = CONVERTKIT_UID;
    script.src = `https://biggerpockets-money.kit.com/${CONVERTKIT_UID}/index.js`;
    
    document.body.appendChild(script);

    return () => {
      // Optional: Cleanup script on unmount if you only want it on specific pages
      // document.body.removeChild(script); 
    };
  }, []);

  return null;
};

export default ConvertKitScript;
