// app/ui/popup.js
// ============================================================================
// 🧭 Popup UI Controller (MAIN)
// ============================================================================

// ============================================================================
// 📁 Global Dependencies
// ============================================================================
import { getActiveTab, sendMessage, loadSettings } from './scripts/utils/shared.js';

// ============================================================================
// 📁 ATS Dependencies
// ============================================================================
import { initAtsUI, updateAtsUI } from './scripts/utils/ats.js';

// ============================================================================
// 📁 JobBoard Dependencies
// ============================================================================
import { updateJobBoardUI } from './scripts/utils/jobboard.js';


/* --------------------------------------------------------------------------
 * 🧠 LOCAL SESSION TRACKING
 * ------------------------------------------------------------------------ */
/**
 * Session popup believes it is controlling.
 * Must always be validated against background.
 */
let localSessionId = null;

/* --------------------------------------------------------------------------
 * 🧩 UI RENDERING
 * ------------------------------------------------------------------------ */
async function updateUI(tabState = {}) {

	// Platform
	if (tabState?.platform) {

		switch (tabState.platform.type) {

			case 'ATS': {
				updateAtsUI(tabState)
				break;
			}

			case 'JOB_BOARD': {
				await updateJobBoardUI(tabState);
				break;
			}

			default: {
				document.getElementById('ats').style.display = 'block';
				document.getElementById('jobboard').style.display = 'none';
				break;
			}

		}

	}
	else {
		document.getElementById('ats').style.display = 'block';
		document.getElementById('jobboard').style.display = 'none';
	}
	

}

/* --------------------------------------------------------------------------
 * 🔄 AUTHORITATIVE STATE SYNC
 * ------------------------------------------------------------------------ */
async function syncFromBackground() {

	const tab = await getActiveTab();
	if (!tab?.id) return;

	// Set platform for correct rendering of UI while opening the popup.
	async function setTabPlatform(tabId) {
		return (await sendMessage('setTabPlatform', { tabId })).payload;
	}
	await setTabPlatform(tab.id);

	// Get Full Tab State 
	const state = await sendMessage('getTabState', { tabId: tab.id });

	await updateUI(state);
}

/* --------------------------------------------------------------------------
 * 📩 LIVE UPDATES (BACKGROUND → POPUP)
 * ------------------------------------------------------------------------ */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

	switch (request.action) {

		case 'updatePopup': {

			(async () => {

				const payload = request.payload;
				if (!payload) {
					sendResponse({ success: false });
				};

				/**
				 * 🔒 SESSION CONSISTENCY CHECK
				 * Ignore updates for sessions popup does not own
				 */
				if (
					localSessionId &&
					payload.sessionId &&
					payload.sessionId !== localSessionId
				) {
					console.warn('[Popup] Ignoring foreign session update');
					sendResponse({ success: false })
				}

				// Terminal state invalidates local session
				if (['finished', 'unsupported', 'error', 'canceled'].includes(payload.state)) {
					localSessionId = null;
				}

				await updateUI(payload);
				sendResponse({ success: true })
				return false;

			})();
		}

	}

});


/* --------------------------------------------------------------------------
 * ⚡ INIT
 * ------------------------------------------------------------------------ */
initAtsUI(syncFromBackground);
document.addEventListener('DOMContentLoaded', () => {
	syncFromBackground();
	loadSettings();
});