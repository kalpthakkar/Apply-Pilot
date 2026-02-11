/**
 * ===========================================================
 * 🔎 In-Memory Semantic Similarity Comparator (ESM)
 * ===========================================================
 * - Compares 1 input string vs N candidate strings
 * - Generates embeddings in-place (no persistence)
 * - Returns similarity scores mapped to each candidate
 * - Uses @xenova/transformers (BGE base)
 * ===========================================================
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline, env } from '@xenova/transformers';

/* ===========================================================
   📍 PATH RESOLUTION (ESM-safe)
   =========================================================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===========================================================
   🧠 MODEL CONFIGURATION
   =========================================================== */
const MODEL_NAME = 'bge-base-en-v1.5';
const NORMALIZE = true;

// Allow local model usage if already downloaded
env.allowLocalModels = true;
env.localModelPath = path.resolve(__dirname, '../models');
env.useBrowserCache = false;

/* ===========================================================
   🔹 COSINE SIMILARITY FUNCTIONS
   =========================================================== */
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

/* ===========================================================
   🔹 OPTIONAL TEXT NORMALIZATION
   =========================================================== */
function normalizeText(text) {
	return String(text)
		.toLowerCase()
		.replace(/\*/g, '')
		.replace(/[:?]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

/* ===========================================================
   🔹 EMBEDDER (SINGLETON)
   =========================================================== */
let embedderInstance = null;

async function getEmbedder() {
	if (!embedderInstance) {
		console.log(`🔹 Loading model: ${MODEL_NAME}...`);
		embedderInstance = await pipeline('feature-extraction', MODEL_NAME, {
			quantized: false,
		});
	}
	return embedderInstance;
}

/* ===========================================================
   🔹 CORE COMPARISON FUNCTION
   ===========================================================
   @param {string} sourceText
   @param {string[]} candidateTexts
   @param {Object} options
   @returns {Promise<Array>}
   =========================================================== */
export async function compareSemantic(
	sourceText,
	candidateTexts,
	options = {}
) {
	const {
		normalizeTextInput = true,
		useNormalizedCosine = true,
	} = options;

	if (!Array.isArray(candidateTexts)) {
		throw new Error('candidateTexts must be an array of strings');
	}

	const embedder = await getEmbedder();

	const source = normalizeTextInput
		? normalizeText(sourceText)
		: sourceText;

	const candidates = normalizeTextInput
		? candidateTexts.map(normalizeText)
		: candidateTexts;

	// Embed source
	const sourceResult = await embedder(source, {
		pooling: 'mean',
		normalize: NORMALIZE,
	});
	const sourceVector = Array.from(sourceResult.data);

	// Embed candidates
	const candidateResults = await embedder(candidates, {
		pooling: 'mean',
		normalize: NORMALIZE,
	});

	const similarityFn = useNormalizedCosine
		? cosineNormalized
		: cosineGeneral;

	// Map similarities
	return candidates.map((text, idx) => {
		const vector = Array.from(candidateResults[idx].data);
		return {
			text,
			score: similarityFn(sourceVector, vector),
		};
	});
}

/* ===========================================================
   🧪 EXAMPLE USAGE (optional)
   =========================================================== */

(async () => {
	const source = 'Will you now or in the future be able to work without visa sponsorship? (like: H-1B visa)?*';
	// const candidates = [
    //     'Are you authorized to work in this country without employer sponsorship?',
    //     'Are you authorized to work without requiring visa sponsorship?',
    //     'Are you or will you be able to work without visa sponsorship?',
    //     'Are you eligible to work without any need of employer or visa sponsorship?',
    //     'Do you have independent work authorization (no sponsorship required)?',
    //     'Do you currently have work authorization that does not require sponsorship?',
    //     'Will you be able to work without company sponsorship?',
	// ];

    let candidates = `
    What is your current visa status?
    What type of visa do you hold?
    Please select your visa category.
    What immigration status do you currently hold?
    Please indicate your current work visa.
    What is your current immigration classification?
    Which visa are you currently on?
    What is your current work authorization category?
    What is your present immigration status?
    What is your current non-immigrant status?
    `
    candidates = candidates.split('\n').map(line => line.trim()).filter(line => line.length > 0);

	const results = await compareSemantic(source, candidates);
	console.log(results);
})();

