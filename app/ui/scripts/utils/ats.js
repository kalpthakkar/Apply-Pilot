// app\ui\scripts\utils\ats.js
// ============================================================================
// 📁 Global Dependencies
// ============================================================================
import { getActiveTab, sendMessage } from './shared.js';

// ============================================================================
// 🧩 Config
// ============================================================================
/* --------------------------------------------------------------------------
 * 🎨 DOM REFERENCES
 * ------------------------------------------------------------------------ */
const runBtn = () => document.getElementById('run');
const stateEl = () => document.getElementById('status');

// ============================================================================
// 🧩 Helpers
// ============================================================================

export async function initAtsUI(syncFromBackground) {

    /* --------------------------------------------------------------------------
    * ▶️ RUN BUTTON
    * ------------------------------------------------------------------------ */
    runBtn().addEventListener('click', async () => {
        const tab = await getActiveTab();
        if (!tab?.id) return;

        const current = await sendMessage('getTabState', { tabId: tab.id });

        // 🛑 STOP
        if (current?.running) {
            await sendMessage('stopTabExecution', { tabId: tab.id });
            await syncFromBackground();
            return;
        }

        // 🚀 START
        const res = await sendMessage('startTabExecution', {
            tabId: tab.id,
            payload: { mode: null }
        });

        /**
         * Do NOT assume success.
         * Must re-fetch authoritative state.
         */
        await syncFromBackground();

        // Capture session only if background confirms
        const confirmed = await sendMessage('getTabState', { tabId: tab.id });
        if (confirmed?.sessionId) {
            localSessionId = confirmed.sessionId;
        }
    });


	/* --------------------------------------------------------------------------
	* ⚡ POPUP STATE CHANGE
	* ------------------------------------------------------------------------ */
	const autofillToggle = document.getElementById('autofillEnabled');
	autofillToggle.addEventListener('change', async (e) => {
		await chrome.storage.sync.set({
			autofillEnabled: e.target.checked
		});

		console.log('[Popup] Autofill setting saved:', e.target.checked);
	});
    
}


export function updateAtsUI(tabState) {

    // Display 'ATS' Section
    document.body.style.width = '300px';
    document.getElementById('jobboard').style.display = 'none';
    document.getElementById('ats').style.display = 'block';

    const running = tabState.running === true;
    const state = tabState.state || (running ? 'running' : 'idle');

    console.log('[Popup] updateUI ←', tabState);

    runBtn().textContent = running ? 'STOP' : 'START';
    runBtn().classList.toggle('btn-danger', running);
    runBtn().classList.toggle('btn-primary', !running);

    if (running) stateEl().innerHTML = `<span class="text-success">RUNNING</span>`;
    else stateEl.innerHTML = `<span class="text-muted">${state.toUpperCase()}</span>`;
}