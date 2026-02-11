// ============================================================================
// 📧 Utility: Wait for Verification Email URL
// ============================================================================
/**
 * Waits for Workday verification email and extracts URL.
 * @returns {Promise<{type: 'url', value: string} | null>} - Verification link object or null.
 */
async function waitForVerificationURL() {
	console.log('[Workday] Waiting for verification email...');

	const response = await chrome.runtime.sendMessage({
		action: 'fetchRecentVerificationURL',
		query: '(from:workday.com OR from:myworkday.com) AND is:unread',
		topKSearch: 2,
		maxAgeMinutes: 5,
	});

	if (!response?.success) {
		console.error('[Workday] Failed to fetch verification email:', response?.error);
		return null;
	}

	const { url } = response;
	if (!url) return null;

	console.log(`[Workday] Found verification URL: ${url}`);
	return { type: 'url', value: url };
}


// ============================================================================
// ℹ️ Utility: Fetch Job Data from DB using jobId key
// ============================================================================
export async function fetchJobDataByKey(jobKey) {
	const response = await new Promise(resolve => {
		chrome.runtime.sendMessage(
			{
				action: 'fetchJobDataByKey',
				key: jobKey
			},
			resolve
		);
	});

	if (!response?.success) {
		console.log("⛔ ", response?.error || 'Failed to fetch job data');
		return {};
	}

	return response.data;
}
