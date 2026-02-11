// app/services/gmail.js
// ============================================================================
// 📧 Gmail Service Helper
// ============================================================================
// 🧠 Purpose:
// Provides structured access to Gmail via OAuth2 and the Gmail REST API.
// Enables fetching of verification emails, OTPs, and activation links.
//
// 🔹 Core Features:
//   • Obtain OAuth2 tokens via Chrome Identity API
//   • Fetch and decode Gmail messages
//   • Extract OTPs and verification URLs
//   • Filter for recency (e.g., emails within X minutes)
//
// ⚙️ Requirements:
//   - Gmail API enabled in Google Cloud Console
//   - OAuth2 client_id declared in manifest.json
//   - Permissions: "identity", "https://www.googleapis.com/auth/gmail.readonly"
//
// ============================================================================

export class GmailService {
	/**
	 * @param {boolean} [enableLogging=false] - Enables verbose debug logs if true.
	 */
	constructor(enableLogging = false) {
		this.enableLogging = enableLogging;
	}

	// ------------------------------------------------------------------------
	// 🪵 Logging Utility
	// ------------------------------------------------------------------------

	/**
	 * Logs messages only when debugging is enabled.
	 * @param {...any} args - Items to log.
	 */
	log(...args) {
		if (this.enableLogging) console.log('[GmailService]', ...args);
	}



	// ------------------------------------------------------------------------
	// 🔐 Authentication
	// ------------------------------------------------------------------------

	/**
	 * Retrieves an OAuth2 access token using the Chrome Identity API.
	 * @param {boolean} [interactive=true] - If true, prompts user login if needed.
	 * @returns {Promise<string>} - Resolved OAuth2 token.
	 */
	async getAuthToken(interactive = true) {
		return new Promise((resolve, reject) => {
			chrome.identity.getAuthToken({ interactive }, (token) => {
				if (chrome.runtime.lastError || !token) {
					reject(chrome.runtime.lastError?.message || 'Failed to get token');
					return;
				}
				resolve(token);
			});
		});
	}

	// ------------------------------------------------------------------------
	// 🧩 Decoding Utilities
	// ------------------------------------------------------------------------

	/**
	 * Decodes Gmail’s base64url-encoded message body into a UTF-8 string.
	 * @param {string} data - Base64url-encoded string from Gmail API.
	 * @returns {string} - Decoded text or empty string on failure.
	 */
	_decodeBase64(data) {
		if (!data) return '';
		try {
			return decodeURIComponent(
				atob(data.replace(/-/g, '+').replace(/_/g, '/'))
					.split('')
					.map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
					.join('')
			);
		} catch (e) {
			this.log('Decode error:', e);
			return '';
		}
	}

	// ------------------------------------------------------------------------
	// 📥 Email Fetching
	// ------------------------------------------------------------------------

	/**
	 * Fetches recent Gmail messages matching a given query.
	 * @param {string} query - Gmail search query (e.g., 'from:no-reply@workday.com').
	 * @param {number} [limit=3] - Maximum number of messages to retrieve.
	 * @returns {Promise<Array<EmailData>>} - Array of parsed email objects.
	 */
	async fetchRecentEmails(query = '', limit = 3) {
		const token = await this.getAuthToken();
		this.log('Got Gmail token:', token);

		const headers = { Authorization: `Bearer ${token}` };

		try {
			const listResp = await fetch(
				`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${limit}`,
				{ headers }
			);
			const listData = await listResp.json();

			if (!listData.messages) {
				this.log('No messages found.');
				return [];
			}

			const results = [];
			for (const msg of listData.messages) {
				const fullResp = await fetch(
					`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
					{ headers }
				);
				const fullData = await fullResp.json();
				const email = this._parseEmail(fullData);
				if (email) results.push(email);
			}

			return results;
		} catch (err) {
			console.error('[GmailService] Error fetching emails:', err);
			return [];
		}
	}

	// ------------------------------------------------------------------------
	// 🧾 Email Parsing
	// ------------------------------------------------------------------------

	/**
	 * Converts raw Gmail API message JSON → structured, normalized email object.
	 * @param {object} message - Gmail API message object.
	 * @returns {EmailData|null} - Parsed email data or null on error.
	 */
	_parseEmail(message) {
		try {
			const headers = {};
			for (const h of message.payload.headers || []) {
				headers[h.name] = h.value;
			}

			const from = headers['From'] || 'Unknown Sender';
			const subject = headers['Subject'] || 'No Subject';
			const snippet = message.snippet || '';
			const epoch = Math.floor(Number(message.internalDate) / 1000);
			const timeReadable = new Date(epoch * 1000).toISOString();

			const body = this._extractBody(message.payload) || snippet;
			const visibleText = this._extractVisibleText(body);
			const otp = this._extractOTP(visibleText);
			const passcode = this._extractPasscode(visibleText);
			const urls = this._extractActivationURLs(body);

			return { from, subject, time: epoch, timeReadable, body, visibleText, otp, passcode, urls };
		} catch (e) {
			console.error('[GmailService] Error parsing email:', e);
			return null;
		}
	}

	// ------------------------------------------------------------------------
	// 🧠 Content Extraction Helpers
	// ------------------------------------------------------------------------

	/**
	 * Recursively extracts plain text or HTML from Gmail message parts.
	 * @param {object} payload - Gmail message payload.
	 * @returns {string} - Decoded body text.
	 */
	// _extractBody(payload) {
	// 	if (!payload) return '';

	// 	if (payload.parts) {
	// 		for (const part of payload.parts) {
	// 			const text = this._extractBody(part);
	// 			if (text) return text;
	// 		}
	// 	}

	// 	if (payload.body?.data) {
	// 		return this._decodeBase64(payload.body.data);
	// 	}

	// 	return '';
	// }
	_extractBody(payload) {
		if (!payload) return '';

		let plain = '';
		let html = '';

		if (payload.mimeType === 'text/html' && payload.body?.data) {
			html = this._decodeBase64(payload.body.data);
		}

		if (payload.mimeType === 'text/plain' && payload.body?.data) {
			plain = this._decodeBase64(payload.body.data);
		}

		if (payload.parts) {
			for (const part of payload.parts) {
				const partBody = this._extractBody(part);
				if (part.mimeType === 'text/html') html ||= partBody;
				else plain ||= partBody;
			}
		}

		return html || plain || '';
	}


	/**
	 * CSP-safe HTML → visible text extractor.
	 * Produces clean, human-readable text.
	 * @param {string} html
	 * @returns {string}
	 */
	_extractVisibleText(html) {
		if (!html) return '';

		// Fast path: already plain text
		if (!/<[a-z][\s\S]*>/i.test(html)) {
			return html
				.replace(/\r\n?/g, '\n')
				.replace(/\n{3,}/g, '\n\n')
				.trim();
		}

		// Remove scripts/styles/noscript
		html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
		html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
		html = html.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

		// Block-level tags → newline
		html = html.replace(
			/<\/?(p|div|h\d|li|ul|ol|table|tr|td|th|blockquote|section|article)>/gi,
			'\n'
		);

		// Line breaks
		html = html.replace(/<br\s*\/?>/gi, '\n');

		// Strip all remaining tags
		html = html.replace(/<[^>]+>/g, '');

		// Decode HTML entities safely
		if (typeof document !== 'undefined') {
			const textarea = document.createElement('textarea');
			textarea.textContent = html;
			html = textarea.value;
		}

		// 🔥 CRITICAL NORMALIZATION 🔥
		return html
			.replace(/\r\n?/g, '\n')        // normalize CRLF
			.replace(/[ \t]+\n/g, '\n')     // trim line-end spaces
			.replace(/\n[ \t]+/g, '\n')     // trim line-start spaces
			.replace(/\n{3,}/g, '\n\n')     // collapse blank lines
			.replace(/[ \t]{2,}/g, ' ')     // collapse spaces
			.trim();
	}


	/**
	 * Extracts a 4–10 digit OTP from given text.
	 * @param {string} text - Email body content.
	 * @returns {string|null} - Detected OTP or null.
	 */
	_extractOTP(text) {
		if (!text) return null;

		const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);

		for (let i = 0; i < lines.length; i++) {
			if (/code|otp|one[- ]time|verification|security/i.test(lines[i])) {
				const nearby = lines.slice(i, i + 3).join(' ');
				const match = nearby.match(/\b\d{4,10}\b/);
				if (match) return match[0];
			}
		}

		// Fallback: isolated numeric line
		for (const line of lines) {
			if (/^\d{4,10}$/.test(line)) {
				return line;
			}
		}

		return null;
	}


	/**
	 * Extracts verification / security passcode from visible email text.
	 * Designed for ATS emails (Greenhouse, Workday, Lever).
	 */
	_extractPasscode(text) {
		if (!text) return null;

		const lines = text
			.split('\n')
			.map(l => l.trim())
			.filter(Boolean);

		// 1️⃣ Context-aware extraction
		for (let i = 0; i < lines.length; i++) {
			if (/code|security|verification|verify|application/i.test(lines[i])) {
				for (let j = i; j <= i + 3 && j < lines.length; j++) {
					const m = lines[j].match(/^[A-Za-z0-9]{6,12}$/);
					if (m) return m[0];
				}
			}
		}

		// 2️⃣ Standalone-line fallback (most reliable)
		for (const line of lines) {
			if (/^[A-Za-z0-9]{6,12}$/.test(line)) {
				return line;
			}
		}

		return null;
	}

	/**
	 * Extracts all activation/verification URLs from email body.
	 * Filters for common verification-related keywords.
	 * @param {string} body - Email body content (HTML or text).
	 * @returns {string[]} - Array of relevant URLs.
	 */
	_extractActivationURLs(body) {
		if (!body) return [];

		const urls = new Set();

		// Extract from href attributes and plain text
		const hrefMatches = [...body.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)];
		const textMatches = [...body.matchAll(/https?:\/\/[^\s"<>]+/gi)];

		hrefMatches.forEach((m) => urls.add(m[1]));
		textMatches.forEach((m) => urls.add(m[0]));

		// Keep only URLs with activation keywords
		const activationKeywords = ['activate', 'verify', 'confirm', 'signup', 'register'];
		return Array.from(urls).filter((u) =>
			activationKeywords.some((kw) => u.toLowerCase().includes(kw))
		);
	}


	// ------------------------------------------------------------------------
	// ⏰ Time Utility
	// ------------------------------------------------------------------------

	/**
	 * Checks whether an email timestamp is recent (within given minutes).
	 * @param {number} epochTime - Unix timestamp (seconds).
	 * @param {number} [maxAgeMinutes=2] - Max age in minutes.
	 * @returns {boolean} - True if email is within the time limit.
	 */
	isRecent(epochTime, maxAgeMinutes = 2) {
		const now = Math.floor(Date.now() / 1000);
		const diffMins = (now - epochTime) / 60;
		return diffMins >= 0 && diffMins <= maxAgeMinutes;
	}

	// ------------------------------------------------------------------------
	// 📮 Public Fetch Helpers
	// ------------------------------------------------------------------------

	/**
	 * Fetches the most recent OTP verification code from Gmail.
	 * @param {string} query - Gmail search query.
	 * @param {number} [topKSearch=2] - Number of emails to check.
	 * @param {number} [maxAgeMinutes=5] - Max age in minutes.
	 * @returns {Promise<string|null>} - OTP string or null.
	 */
	async fetchRecentVerificationOTP(query = '', topKSearch = 2, maxAgeMinutes = 5) {
		const emails = await this.fetchRecentEmails(query, topKSearch);
		if (!emails.length) return null;

		for (const email of emails) {
			if (email.otp && this.isRecent(email.time, maxAgeMinutes)) {
				this.log('✅ Recent verification email found:', email);
				return email.otp;
			}
		}

		this.log('❌ No recent verification emails found containing OTP.');
		return null;
	}

	/**
	 * Fetches the most recent alphanumeric verification passcode from Gmail.
	 * @param {string} query - Gmail search query.
	 * @param {number} [topKSearch=2] - Number of emails to check.
	 * @param {number} [maxAgeMinutes=5] - Max allowed email age.
	 * @returns {Promise<string|null>} - Passcode or null.
	 */
	async fetchRecentVerificationPasscode(query = '', topKSearch = 2, maxAgeMinutes = 5) {
		const emails = await this.fetchRecentEmails(query, topKSearch);
		console.log("[GMAIL] emails:::", emails)
		if (!emails.length) return null;

		for (const email of emails) {
			if (email.passcode && this.isRecent(email.time, maxAgeMinutes)) {
				this.log('✅ Recent verification passcode found:', email.passcode);
				return email.passcode;
			}
		}

		this.log('❌ No recent verification emails found containing passcode.');
		return null;
	}

	/**
	 * Fetches the most recent verification/activation URL from Gmail.
	 * @param {string} query - Gmail search query.
	 * @param {number} [topKSearch=2] - Number of recent messages to check.
	 * @param {number} [maxAgeMinutes=5] - Max allowed email age (minutes).
	 * @returns {Promise<string|null>} - Verification URL or null.
	 */
	async fetchRecentVerificationUrl(query = '', topKSearch = 2, maxAgeMinutes = 5) {
		const emails = await this.fetchRecentEmails(query, topKSearch);
		this.log('Fetched emails:', emails);

		if (!emails.length) return null;

		for (const email of emails) {
			if (!email.urls?.length) continue;
			if (!this.isRecent(email.time, maxAgeMinutes)) {
				this.log('Email too old:', email.timeReadable);
				continue;
			}

			this.log('✅ Found recent verification URL:', email.urls[0]);
			return email.urls[0];
		}

		this.log('❌ No recent verification URLs found.');
		return null;
	}
}

// ============================================================================
// 💡 Example Usage
// ============================================================================
//
// import { GmailService } from '../services/gmail.js';

// const gmail = new GmailService(true);

// Fetch most recent OTP
// const otp = await gmail.fetchRecentVerificationOTP('(from:greenhouse) AND is:unread ', 2, 125);

// Fetch most recent verification URL
// const url = await gmail.fetchRecentVerificationUrl('(from:workday.com)', 2, 10);

// console.log('OTP:', otp);
// console.log('Verification URL:', url);
//
// ============================================================================




// ============================================================================
// 💡 Example Usage
// ============================================================================
//
// import { GmailService } from '../services/gmail.js';
//
// const gmail = new GmailService(true);
//
// // Fetch most recent OTP
// const otp = await gmail.fetchRecentVerificationOTP('(from:workday.com)', 2, 5);
//
// // Fetch most recent verification URL
// const url = await gmail.fetchRecentVerificationUrl('(from:workday.com)', 2, 10);
//
// console.log('OTP:', otp);
// console.log('Verification URL:', url);
//
// ============================================================================