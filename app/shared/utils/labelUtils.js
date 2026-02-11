import { STOP_WORDS, LABEL_BLACKLIST } from '@shared/config/labelConfig.js';
import LABEL_EMBEDDINGS_RAW from '@shared/labelEmbeddings.json';

/* --------------------------------------------------------------------------
 * ⚙️ BROWSER SIDE EMBEDDINGS (Ollama Script) - NOT IN USE
 * ------------------------------------------------------------------------ */
/*
async function embedWithOllama(text) {
    const res = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'mxbai-embed-large:latest', prompt: text })
    });

    if (!res.ok) throw new Error(`Embedding failed for "${text}"`);
    const json = await res.json();
    return json.embedding;
}
*/


/* ============================================================================
 * 🧠 PRELOADED LABEL EMBEDDINGS (RUNTIME OPTIMIZED)
 * ----------------------------------------------------------------------------
 * - Convert JSON embeddings → Float32Array once at load time
 * - Avoids repeated allocations during cosine similarity
 * - These embeddings are generated offline using the SAME model
 *   and are already L2-normalized
 * ========================================================================== */
const LABEL_EMBEDDINGS = (() => {
	const out = structuredClone(LABEL_EMBEDDINGS_RAW);

	for (const group of Object.values(out.questions)) {
		for (const label of group.labels) {
			label.embedding = new Float32Array(label.embedding);
		}
	}

	return out;
})();

/* ============================================================================
 * 🔑 PUBLIC CONSTANTS
 * ========================================================================== */
export const LABEL_EMBEDDING_KEYS = Object.freeze(
	Object.keys(LABEL_EMBEDDINGS.questions).reduce((acc, key) => {
		acc[key] = key;
		return acc;
	}, {})
);

export const LABEL_EMBEDDING_SELECTION = Object.freeze({
	ALL: Object.keys(LABEL_EMBEDDINGS.questions),
	NONE: [],
});


/* ============================================================================
 * 🏷️ GET LABEL FROM QUESTION
 * ----------------------------------------------------------------------------
 * ========================================================================== */
// Returns 'string' or null/undefined
// export function getLabelText(question) {
// 	const foundLabel = question?.label?.textContent?.trim() ?? question?.labelText?.trim()
// 	if (!foundLabel) {
// 		console.log("⚠️ GET_LABEL_TEXT question:", question, ' ||| labelText:', foundLabel);
// 		console.log("YOO 1:::", question?.label?.textContent)
// 		console.log("YOO 2:::", question?.labelText)
// 	}	
// 	return foundLabel
// }

/* ============================================================================
 * 🧹 LABEL NORMALIZATION (DISCOVERED LABELS)
 * ----------------------------------------------------------------------------
 * IMPORTANT:
 * - Must mirror the normalization logic used during embedding generation
 * - Any mismatch here directly degrades cosine similarity accuracy
 * ========================================================================== */
function normalizeDiscoveredLabel(raw) {
	if (!raw) return '';

	return String(raw)
		.toLowerCase()
		.replace(/\*/g, '')           // required markers (*)
		.replace(/[:?]/g, '')         // punctuation
		.replace(/\([^)]*\)/g, '')    // parenthetical hints
		.replace(/\s+/g, ' ')
		.trim()
		.split(' ')
		.filter(w => !STOP_WORDS.has(w))
		.join(' ');
}

/* ============================================================================
 * 🚫 BLACKLIST FILTER
 * ========================================================================== */
function isBlacklistedLabel(label) {
	return LABEL_BLACKLIST.some(rx => rx.test(label));
}

/* ============================================================================
 * 📡 EMBEDDING REQUEST (ASYNC → BACKGROUND → OFFSCREEN)
 * ----------------------------------------------------------------------------
 * - Accepts single label or array
 * - Returns embeddings in the same order
 * - Does NOT cache (labels are usually unique)
 * ========================================================================== */
async function requestEmbeddings(labels) {
	const labelList = Array.isArray(labels) ? labels : [labels];

	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage(
			{ action: 'requestEmbeddings', text: labelList },
			(response) => {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError);
					return;
				}
				if (!response?.success) {
					reject(new Error(response?.error || 'Embedding failed'));
					return;
				}
				resolve(response.results);
			}
		);
	});
}

/* ============================================================================
 * 📐 COSINE SIMILARITY
 * ----------------------------------------------------------------------------
 * Two variants:
 * 1️⃣ cosineNormalized → fastest (dot product only)
 * 2️⃣ cosineGeneral    → fallback if vectors are not normalized
 * ========================================================================== */
function cosineNormalized(a, b) {
	let dot = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
	}
	return dot;
}

function cosineGeneral(a, b) {
	let dot = 0, na = 0, nb = 0;
	for (let i = 0; i < a.length; i++) {
		const x = a[i], y = b[i];
		dot += x * y;
		na += x * x;
		nb += y * y;
	}
	return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/* ============================================================================
 * 📏 HEURISTIC: LABEL LENGTH WEIGHT
 * ----------------------------------------------------------------------------
 * Slightly favors descriptive labels without overpowering similarity
 * ========================================================================== */
function labelLengthWeight(label) {
	const words = label.split(' ').length;
	return Math.min(1.15, 0.9 + words * 0.05);
}

/* ============================================================================
 * 🎯 MAIN MATCH FUNCTION
 * ----------------------------------------------------------------------------
 * Match discovered question label with preloaded label embeddings
 *
 * Strategy:
 * 1️⃣ Exact normalized string match (fast, deterministic)
 * 2️⃣ Semantic similarity (ML-based)
 *
 * Output:
 * - Array of unique question-group matches
 * - Each group appears ONCE with its best similarity score
 * - Sorted descending by similarityScore
 *
 * @param {Object} question - DOM node or object with .label.textContent
 * @param {string[]|string} embeddingSelectionKeys - subset of keys to match against
 * @param {Object} options
 * @param {boolean} options.earlyExit - return immediately on first semantic hit
 * @param {boolean} options.debug - enable logging
 * @returns {Promise<{key: string, similarityScore: number}[]>}
 * ========================================================================== */
export async function matchQuestionWithLabelEmbeddings(question, embeddingSelectionKeys, { earlyExit = false, debug = false } = {}) {
	if (embeddingSelectionKeys === LABEL_EMBEDDING_SELECTION.NONE) return [];

	const rawLabelText = question.labelText;
	if (!rawLabelText) return [];

	const normalizedLabelText = normalizeDiscoveredLabel(rawLabelText);
	if (!normalizedLabelText || isBlacklistedLabel(normalizedLabelText)) return [];

	const targetKeys = Array.isArray(embeddingSelectionKeys)
		? embeddingSelectionKeys
		: Object.keys(LABEL_EMBEDDINGS.questions);

	/* ------------------------------------------------------------------
	 * PASS 1️⃣: EXACT NORMALIZED MATCH
	 * ------------------------------------------------------------------ */
	for (const key of targetKeys) {
		const group = LABEL_EMBEDDINGS.questions[key];
		if (!group?.labels) continue;
		// skip if question.type is not allowed in this group
		if (!group.type.includes(question.type)) continue;

		for (const label of group.labels) {
			if (normalizeDiscoveredLabel(label.text) === normalizedLabelText) {
				if (debug) console.info('🎯 [LABEL_UTILS][EXACT MATCH]', rawLabelText, '→', label.text, `[${key}]`);
				// Exact match = perfect confidence
				return [{ key, similarityScore: 1 }];
			}
		}
	}

	// if (debug) console.info(`[LABEL_UTILS] No exact match for '${rawLabelText}', running semantic match…`);

	/* ------------------------------------------------------------------
	 * PASS 2️⃣: SEMANTIC MATCH (COSINE SIMILARITY)
	 * ------------------------------------------------------------------ */
	try {
		const [embedResult] = await requestEmbeddings(normalizedLabelText);
		if (!embedResult?.success) return [];

		const queryEmbedding = new Float32Array(embedResult.embedding);

		/**
		 * Map<groupKey, bestScore>
		 * Ensures ONE entry per question group
		 */
		const bestScoresByGroup = new Map();

		for (const key of targetKeys) {
			const group = LABEL_EMBEDDINGS.questions[key];
			if (!group?.labels) continue;
			// skip if question.type is not allowed in this group
			if (!group.type.includes(question.type)) continue;

			let bestScoreForGroup = null;

			for (const label of group.labels) {
				const sim = LABEL_EMBEDDINGS.normalized
					? cosineNormalized(queryEmbedding, label.embedding)
					: cosineGeneral(queryEmbedding, label.embedding);

				if (sim < label.threshold) continue;

				// Embeddings already handles lable length based weight adjustments - no longer need this here.
				// Deprecated: const weightedScore = sim * labelLengthWeight(label.text);

				if (debug) console.info('🎯 [LABEL_UTILS][SEMANTIC HIT]', normalizedLabelText, '↔', label.text, '=', sim.toFixed(4), '(threshold:', label.threshold, ')', `[${key}]`);

				// Early-exit: first valid semantic hit
				if (earlyExit) {
					return [{ key, similarityScore: sim }];
				}

				if (bestScoreForGroup === null || sim > bestScoreForGroup) {
					bestScoreForGroup = sim;
				}
			}

			// Persist best score for this group (if any)
			if (bestScoreForGroup !== null) {
				bestScoresByGroup.set(key, bestScoreForGroup);
			}
		}

		if (bestScoresByGroup.size === 0) return [];

		// Convert Map → sorted array
		return Array.from(bestScoresByGroup.entries())
			.map(([key, similarityScore]) => ({ key, similarityScore }))
			.sort((a, b) => b.similarityScore - a.similarityScore);
	} catch (err) {
		console.error('❌ [LABEL_UTILS] Semantic matching failed:', err);
		return [];
	}
}