(function() {
  // Find the target container
  const container = document.getElementById('bp-money-library') || document.getElementById('bp-money-library-root');
  if (!container) {
    console.warn('BiggerPockets Money Library container (#bp-money-library) not found.');
    return;
  }

  // Prevent duplicate iframe injection
  if (container.querySelector('iframe')) return;

  // Determine the base URL dynamically from the script source
  const currentScript = document.currentScript;
  const scriptUrl = currentScript ? currentScript.src : '';
  let baseUrl = 'https://ais-pre-haidiskwkybbkvl4lcecgc-619184583394.us-west2.run.app';
  if (scriptUrl) {
    try {
      baseUrl = new URL(scriptUrl).origin;
    } catch (e) {
      console.error('Error parsing script source URL:', e);
    }
  }

  // Check if a specific resource is requested via data attribute
  const resourceId = container.getAttribute('data-resource-id') || '';
  let iframeUrl = baseUrl + '/#/';
  if (resourceId) {
    iframeUrl = baseUrl + '/#/embed/' + resourceId;
  }

  // Create and style the iframe
  const iframe = document.createElement('iframe');
  iframe.src = iframeUrl;
  iframe.style.width = '100%';
  iframe.style.height = '600px'; // Robust default height during load
  iframe.style.border = 'none';
  iframe.style.overflow = 'hidden';
  iframe.style.display = 'block';
  iframe.style.transition = 'height 0.2s ease-out';
  iframe.id = 'bp-library-iframe';
  iframe.setAttribute('title', 'BiggerPockets Money Financial Resource Library');
  iframe.setAttribute('scrolling', 'no');

  // Insert the iframe into the container
  container.appendChild(iframe);

  // Set up message listener for seamless responsive height adjustments
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'financial-library-resize') {
      const height = parseInt(e.data.height, 10);
      if (!isNaN(height) && height > 0) {
        // Enforce a minimum safe height of 450px to prevent visual clipping
        iframe.style.height = Math.max(450, height) + 'px';
        
        // Hide loader once the first resize message (successful load) is received
        const loader = document.getElementById('bp-library-loader');
        if (loader) {
          loader.style.display = 'none';
        }
      }
    }
  }, false);
})();
