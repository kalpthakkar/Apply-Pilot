// app\ui\scripts\utils\shared.js
/* --------------------------------------------------------------------------
 * 📡 MESSAGE HELPERS
 * ------------------------------------------------------------------------ */
export function sendMessage(action, payload = {}, timeout = 3000) {
	return new Promise((resolve) => {
		let settled = false;

		const timer = setTimeout(() => {
			if (!settled) {
				settled = true;
				resolve({});
			}
		}, timeout);

		try {
			chrome.runtime.sendMessage({ action, ...payload }, (resp) => {
		
				if (chrome.runtime.lastError) {
					clearTimeout(timer);
					settled = true;
					resolve({ error: chrome.runtime.lastError.message });
					return;
				}
				
				// if (settled) return;
				clearTimeout(timer);
				settled = true;
				resolve(resp || {});
			});
		} catch {
			clearTimeout(timer);
			resolve({});
		}
	});
}

export async function getActiveTab() {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	return tab;
}

export async function loadSettings() {
    const autofillToggle = document.getElementById('autofillEnabled');
    const autofillEnabled = await chrome.storage.sync.get('autofillEnabled');
    autofillToggle.checked = autofillEnabled.autofillEnabled === true;
}



