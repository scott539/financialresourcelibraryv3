import React, { useEffect } from 'react';

const CONVERTKIT_UID = 'c7b5581604';

const ConvertKitScript: React.FC = () => {
  useEffect(() => {
    // Check if script already exists to prevent duplicates
    if (document.querySelector(`script[data-uid="${CONVERTKIT_UID}"]`)) return;

    // Load the ConvertKit Script
    const script = document.createElement('script');
    script.async = true;
    script.dataset.uid = CONVERTKIT_UID;
    script.src = `https://biggerpockets-money.kit.com/${CONVERTKIT_UID}/index.js`;
    document.body.appendChild(script);

  }, []);

  return null;
};

export default ConvertKitScript;