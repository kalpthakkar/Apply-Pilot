import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline, env } from '@xenova/transformers';
import { LABEL_DEFINITIONS } from '../shared/config/labelConfig.js';

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
const OUTPUT_VERSION = 1;

// Allow local model usage if already downloaded
env.allowLocalModels = true;
env.localModelPath = path.resolve(__dirname, '../models'); // optional
env.useBrowserCache = false;

/* ===========================================================
   📦 OUTPUT STRUCTURE INITIALIZATION
   =========================================================== */
const output = {
	version: OUTPUT_VERSION,
	model: MODEL_NAME,
	embeddingType: 'semantic',
    normalized: NORMALIZE,
	dimensions: null,
	generatedAt: new Date().toISOString(),
	questions: {},
};

/* ===========================================================
   🔹 LOAD EMBEDDING PIPELINE (ONCE)
   =========================================================== */
async function loadEmbedder() {
	console.log(`🔹 Loading model: ${MODEL_NAME}...`);
	return pipeline('feature-extraction', MODEL_NAME, {
		quantized: false, // full precision for offline quality
	});
}


/* ===========================================================
   🔹 NORMALIZE RAW TEXT
   =========================================================== */
function normalizeLabel(text) {
    return String(text)
        .toLowerCase()
        .replace(/\*/g, '')
        .replace(/[:?]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}


/* ===========================================================
   🔹 MAIN GENERATION LOGIC
   =========================================================== */
async function run() {
	const embedder = await loadEmbedder();

	for (const [questionKey, def] of Object.entries(LABEL_DEFINITIONS)) {
		console.log(`\n📌 Processing question group: ${questionKey}`);

		const labels = [];

		for (const [labelText, thresholdPercent] of def.labels) {

            const normalizedLabelText = normalizeLabel(labelText)

			console.log(`  🔸 Embedding: "${normalizedLabelText}"`);

			const result = await embedder(normalizedLabelText, {
				pooling: 'mean',
				normalize: NORMALIZE,
			});

			const vector = Array.from(result.data);

			if (!output.dimensions) {
				output.dimensions = vector.length;
			}

			labels.push({
				text: labelText,
                normalizedText: normalizedLabelText,
				threshold: thresholdPercent / 100,
				embedding: vector,
			});
		}

		output.questions[questionKey] = {
			type: def.type ?? [],
			labels,
		};

	}

	/* ===========================================================
	   💾 WRITE OUTPUT FILE
	   =========================================================== */
	const outPath = path.resolve(
		__dirname,
		'../shared/labelEmbeddings.json'
	);

	fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
	console.log(`\n✅ Label embeddings written to:\n${outPath}`);
}

/* ===========================================================
   🚀 RUN
   =========================================================== */
run().catch((err) => {
	console.error('❌ Failed to generate embeddings:', err);
	process.exit(1);
});