
window.addEventListener('load', () => {
    // Small delay to ensure wallpaper is rendered
    setTimeout(() => {
        // Create the Liquid Glass Container
        const container = new LiquidGlass.Container({
            borderRadius: 44,
            type: 'rounded',
            tintOpacity: 0.1,  // Slightly more visible glass
            blurRadius: 40,    // Deep, soft blur
            fixedBackground: true,
            intensity: 0.08    // Even more subtle for realism
        });

        // Style the container element
        container.element.style.width = '100%';
        container.element.style.maxWidth = '720px';
        container.element.style.padding = '40px';
        container.element.style.margin = '0 auto';

        // --- Add Input Field (Custom HTML inside container) ---
        const inputWrapper = document.createElement('div');
        inputWrapper.id = 'input-container'; // ID for easier CSS targeting
        inputWrapper.className = 'input-group';
        inputWrapper.innerHTML = `
            <input type="text" id="songUrl" placeholder="הכנס קישור לשיר מזמרשת..." class="glass-input">
        `;
        container.element.appendChild(inputWrapper);

        // --- Create Nested Glass Button ---
        const downloadBtn = new LiquidGlass.Button({
            text: 'הורד שיר',
            size: '22', // Font size, button scales around it
            type: 'pill',
            tintOpacity: 0.25, // Higher opacity for button to stand out
            intensity: 0.25,  // More refraction for the button
            blurRadius: 30,   // Softer blur for the button
            onClick: async () => {
                const url = document.getElementById('songUrl').value;
                const consoleDiv = document.getElementById('console');

                // Helper to update console
                const log = (msg, type = 'info') => {
                    const color = type === 'error' ? '#ff6b6b' : (type === 'success' ? '#51cf66' : '#ffffff');
                    consoleDiv.innerHTML += `<div class="console-line" style="color: ${color}">${msg}</div>`;
                    consoleDiv.scrollTop = consoleDiv.scrollHeight;
                };

                if (!url) {
                    log('נא להכניס קישור לשיר', 'error');
                    return;
                }

                log(`מתחיל תהליך עבור: ${url}...`);

                // Generate Client ID
                const clientId = 'client_' + Math.random().toString(36).substr(2, 9);
                const API_BASE = 'http://localhost:3000';

                // 1. Setup SSE connection
                if (window.currentEventSource) window.currentEventSource.close();

                const eventSource = new EventSource(`${API_BASE}/api/events?clientId=${clientId}`);
                window.currentEventSource = eventSource;

                eventSource.onmessage = (e) => {
                    try {
                        const data = JSON.parse(e.data);
                        // Map server types to console types
                        const type = data.type === 'error' ? 'error' : (data.type === 'success' ? 'success' : 'info');
                        log(data.message, type);

                        if (data.type === 'done') {
                            eventSource.close();
                        }
                    } catch (err) {
                        console.error('SSE Error', err);
                    }
                };

                eventSource.onerror = (err) => {
                    // console.error('SSE Connection Error', err); 
                    // Usually just closed connection
                };

                // 2. Start Download Request
                try {
                    const res = await fetch(`${API_BASE}/api/download`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, clientId })
                    });

                    if (!res.ok) {
                        const errData = await res.json();
                        throw new Error(errData.error || 'Server error');
                    }

                    // 3. Handle Binary Download (ZIP)
                    const blob = await res.blob();
                    const downloadUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = downloadUrl;

                    // Get filename from Content-Disposition header
                    const contentDisp = res.headers.get('Content-Disposition');
                    let filename = 'songs.zip';
                    if (contentDisp) {
                        // Match both quoted and unquoted filenames
                        const match = contentDisp.match(/filename[*]?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
                        if (match) {
                            try {
                                filename = decodeURIComponent(match[1]);
                            } catch (e) {
                                // Fallback if decoding fails
                                filename = match[1];
                            }
                        }
                    }

                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(downloadUrl);

                    log('הושלם! הקובץ יורד למחשב.', 'success');

                } catch (error) {
                    log(`שגיאה: ${error.message}`, 'error');
                    eventSource.close();
                }
            }
        });

        // Add specific styling to the button element
        downloadBtn.element.style.width = '100%';
        downloadBtn.element.id = 'download-btn-container';

        // Add button to container (Triggers Nested Glass Effect)
        container.addChild(downloadBtn);

        // --- Add Console (Custom HTML) ---
        const consoleDiv = document.createElement('div');
        consoleDiv.id = 'console';
        consoleDiv.className = 'console';
        consoleDiv.innerHTML = '<div class="console-line">מוכן להורדה...</div>';
        container.element.appendChild(consoleDiv);

        // Mount the container
        const mountPoint = document.getElementById('glass-mount');
        mountPoint.appendChild(container.element);

        // Make the container globally accessible for tilt logic
        window.mainContainer = container;

        // --- Robust Resize Handler ---
        // With CSS backdrop-filter, we just need to ensure the library updates its surface resolution.
        // The library already has a resize listener, but we can double check here if needed.
        // For now, standard window resize is enough.

        // Initialize Tilt Effect
        initTiltEffect(container);
    }, 500);
});

function initTiltEffect(container) {
    document.addEventListener('mousemove', (e) => {
        if (!container || !container.element) return;

        const card = container.element;
        const rect = card.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2; // Fixed: was using width/2

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Calculate distance from center (normalized -1 to 1)
        const percentX = (mouseX - centerX) / (window.innerWidth / 2);
        const percentY = (mouseY - centerY) / (window.innerHeight / 2);

        // Max rotation in degrees
        const maxRotate = 2;

        const rotateX = -percentY * maxRotate;
        const rotateY = percentX * maxRotate;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

        // Optional: Adjust glass lighting parameters based on tilt?
        // This is where we could make the light source feel "stationary" as the card tilts
    });

    // Reset on mouse leave? Or keep last position?
    // Often nicer to keep it or slowly return to center.
}
