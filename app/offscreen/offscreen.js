import { pipeline, env } from '@xenova/transformers';

/* ===========================================================
   🔹 MODEL SETUP
   Configure Transformers library to use local models, disable
   browser caching, and define preferred backends.
   =========================================================== */
env.allowLocalModels = true; // Allow loading model files from local extension path
env.localModelPath = chrome.runtime.getURL('dist/models'); // Path to pre-downloaded model
env.useBrowserCache = false; // Disable Cache API usage (important for extension stability)
env.backends = ['webgpu', 'webgl', 'wasm', 'cpu']; // Preferred backend order; auto-selects first available

let embedderPromise = null; // Singleton for loaded pipeline

/**
 * 🔹 getEmbedder()
 * Loads the embedding pipeline only once. Subsequent calls return the same promise.
 * Throws an error if the model fails to load.
 */
async function getEmbedder() {
    if (embedderPromise) return embedderPromise;

    try {
        embedderPromise = await pipeline('feature-extraction', 'bge-base-en-v1.5', {
            quantized: true, // smaller and faster model
            cache: false,    // do not rely on caching
            device: 'auto',  // pick first available backend automatically
        });
        console.log('[Offscreen] Model loaded on backend:', embedderPromise.backend);
        return embedderPromise;
    } catch (err) {
        embedderPromise = null; // reset on failure
        throw new Error(`Failed to load embedder: ${err.message}`);
    }
}

/* ===========================================================
   🔹 PERSISTENT PORT LISTENER
   Handles communication with background.js via a long-lived port.
   Allows multiple embedding requests to be processed asynchronously
   and maintains mapping via unique IDs.
   =========================================================== */
chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== 'offscreen-comm') return; // Only handle our offscreen port

    console.log('[Offscreen] Port connected');

    // Listen for messages from background.js
    port.onMessage.addListener(async (msg) => {
        if (msg.type === 'EMBED_LABEL') {
            const { id, text } = msg;

            try {
                if (!text || typeof text !== 'string') throw new Error('Invalid text provided');

                // Get singleton embedder
                const embedder = await getEmbedder();

                // Generate embedding vector
                const output = await embedder(text, {
                    pooling: 'mean',   // aggregate token embeddings to sentence-level
                    normalize: true,   // L2 normalize for cosine similarity
                });

                // ✅ Send back embedding vector along with request ID
                port.postMessage({
                    success: true,
                    id,
                    embedding: Array.from(output.data),
                    dimensions: output.data.length,
                });
            } catch (err) {
                console.error('[Offscreen embedding error]', err);

                // Send error response with ID
                port.postMessage({
                    success: false,
                    id,
                    error: err.message,
                });
            }
        }
    });

    // Handle port disconnect
    port.onDisconnect.addListener(() => {
        console.log('[Offscreen] Port disconnected');
    });
});

/* ===========================================================
   🔹 OFFSCREEN UNLOAD HANDLER
   Notifies background.js to reset singleton state if
   offscreen document is closed (user navigates away / extension idle)
   =========================================================== */
window.addEventListener('unload', () => {
    try {
        // Connect to background to notify closure
        const port = chrome.runtime.connect({ name: 'offscreen-closed' });

        // Optional: send a simple message
        port.postMessage({ reason: 'unload' });

        // Disconnect immediately to avoid hanging port
        port.disconnect();
    } catch (err) {
        console.warn('[Offscreen] Failed to notify unload:', err);
    }
});

