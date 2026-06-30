(function() {
    // Prevent multiple initializations
    if (window.BPMoneyLibraryInitialized) return;
    window.BPMoneyLibraryInitialized = true;

    // Find the container element
    var container = document.getElementById('bp-money-library');
    if (!container) {
        console.error('BP Money Library: Container <div id="bp-money-library"></div> not found.');
        return;
    }

    // Determine the source URL. It should point to the domain where the React app is hosted.
    // If the script is loaded from the React app, we can use the script's src to infer the origin.
    var scripts = document.getElementsByTagName('script');
    var currentScript = scripts[scripts.length - 1];
    var origin = 'https://financialresourcelibraryv3.vercel.app'; // Default fallback

    try {
        if (currentScript && currentScript.src) {
            var url = new URL(currentScript.src);
            origin = url.origin;
        }
    } catch (e) {
        console.warn('BP Money Library: Could not determine origin from script tag, using default.');
    }

    // Create the iframe
    var iframe = document.createElement('iframe');
    iframe.src = origin;
    iframe.style.width = '100%';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.scrolling = 'no';
    
    // Add it to the container
    container.appendChild(iframe);

    // Listen for resize messages from the iframe
    window.addEventListener('message', function(event) {
        // Validate message structure
        if (!event.data || typeof event.data !== 'object') return;
        
        // Handle resize message
        if (event.data.type === 'financial-library-resize' && event.data.height) {
            var newHeight = parseInt(event.data.height, 10);
            if (newHeight > 0) {
                // Add a small buffer and only update if it actually changed
                var targetHeight = (newHeight + 10) + 'px';
                if (iframe.style.height !== targetHeight) {
                    iframe.style.height = targetHeight;
                }
            }
        }
    });
})();
