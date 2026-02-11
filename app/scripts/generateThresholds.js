/**
 * ===========================================================
 * 🔹 generateThresholds.js
 *
 * Self-supervised threshold tuning for label embeddings.
 * Reads labelEmbeddings.json → computes thresholds based on
 * intra-group similarity → updates the JSON with meaningful
 * thresholds for each label.
 *
 * Algorithm:
 * 1️⃣ Compute pairwise cosine similarity for sibling labels
 * 2️⃣ For each label:
 *    threshold = mean(sim) - 0.5 * std(sim)
 *    → adjust by length (longer labels get slight boost)
 *    → clamp to MIN_THRESHOLD and MAX_THRESHOLD
 * ===========================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/* ===========================================================
   📍 PATH RESOLUTION (ESM-safe)
   =========================================================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------- CONFIG -----------------
const EMBEDDINGS_PATH = path.join(__dirname, '../shared/labelEmbeddings.json');
const MIN_THRESHOLD = 0.75;
const MAX_THRESHOLD = 0.95;
const SINGLE_WORD_MIN_THRESHOLD = 0.80;

// ----------------------- UTILS -----------------------------

/**
 * Cosine similarity for normalized embeddings
 * @param {Float32Array} a 
 * @param {Float32Array} b 
 */
function cosineNormalized(a, b) {
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot;
}

/**
 * Compute mean of an array
 */
function mean(arr) {
    if (!arr.length) return 0;
    return arr.reduce((acc, v) => acc + v, 0) / arr.length;
}

/**
 * Compute standard deviation
 */
function std(arr) {
    if (!arr.length) return 0;
    const m = mean(arr);
    const variance = arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / arr.length;
    return Math.sqrt(variance);
}

/**
 * Compute number of words in a label
 */
function numWords(label) {
    return label.trim().split(/\s+/).length;
}

/**
 * Clamp value between min and max
 */
function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
}







// ------------------- THRESHOLD CALCULATION --------------------------

/**
 * Compute thresholds for a label group with:
 * - semantic similarity as the main factor
 * - minor contribution from word count
 * - adaptive sliding max threshold per group
 */
function computeThresholdsForGroup(labels) {
    if (!labels || labels.length === 0) return;

    // Single label → assign safe default
    if (labels.length === 1) {
        labels[0].threshold = clamp(0.9, MIN_THRESHOLD, 0.95);
        return;
    }

    // Precompute pairwise similarities
    const sims = Array(labels.length).fill(null).map(() => []);
    const allSims = [];
    for (let i = 0; i < labels.length; i++) {
        const a = new Float32Array(labels[i].embedding);
        for (let j = 0; j < labels.length; j++) {
            if (i === j) continue;
            const b = new Float32Array(labels[j].embedding);
            const sim = cosineNormalized(a, b);
            sims[i].push(sim);
            allSims.push(sim);
        }
    }

    // Sliding max threshold based on group similarity
    const groupMean = mean(allSims);
    const groupStd = std(allSims);
    const maxThresholdForGroup = clamp(groupMean + groupStd, MIN_THRESHOLD, 0.95);

    // Compute threshold for each label
    for (let i = 0; i < labels.length; i++) {
        const simValues = sims[i];
        const avg = mean(simValues);
        const deviation = std(simValues);

        // Base threshold: mean - 0.5 * std
        let threshold = avg - 0.5 * deviation;

        // Minor adjustment for label length (max 10% boost)
        const wordCount = numWords(labels[i].text);
        const lengthFactor = 1 + Math.min(0.03 * wordCount, 0.10); // minor boost
        threshold *= lengthFactor;

        // Optional stricter lower bound for single-word labels
        if (wordCount === 1) {
            threshold = Math.max(threshold, SINGLE_WORD_MIN_THRESHOLD);
        }

        // Clamp to adaptive maxThresholdForGroup
        threshold = clamp(threshold, MIN_THRESHOLD, maxThresholdForGroup);

        // Final round
        labels[i].threshold = parseFloat(threshold.toFixed(3));
    }
}



/**
 * Compute thresholds for a label group (superior version)
 * Features:
 * - Semantic similarity driven
 * - Minor length adjustment
 * - Adaptive sliding max per group based on percentile
 * - Outlier-resistant (using percentiles, not mean alone)
 * - Optional single-word boost
 */
function computeThresholdsForGroupAdvanced(labels) {
    if (!labels || labels.length === 0) return;

    // Single label → assign safe default
    if (labels.length === 1) {
        labels[0].threshold = clamp(0.9, MIN_THRESHOLD, 0.95);
        return;
    }

    // --- 1️⃣ Precompute all pairwise similarities ---
    const simsMatrix = Array(labels.length).fill(null).map(() => []);
    const allSims = [];
    for (let i = 0; i < labels.length; i++) {
        const a = new Float32Array(labels[i].embedding);
        for (let j = 0; j < labels.length; j++) {
            if (i === j) continue;
            const b = new Float32Array(labels[j].embedding);
            const sim = cosineNormalized(a, b);
            simsMatrix[i].push(sim);
            allSims.push(sim);
        }
    }

    // --- 2️⃣ Compute group statistics ---
    const groupMean = mean(allSims);
    const groupStd = std(allSims);

    // Use percentile-based sliding cap (90th percentile)
    const sortedSims = [...allSims].sort((a, b) => a - b);
    const percentile90 = sortedSims[Math.floor(0.9 * sortedSims.length)] || 0.95;
    const maxThresholdForGroup = clamp(percentile90, MIN_THRESHOLD, 0.95);

    // --- 3️⃣ Compute thresholds per label ---
    for (let i = 0; i < labels.length; i++) {
        const simValues = simsMatrix[i];

        // Base threshold: mean - 0.5 * std (semantic)
        let threshold = mean(simValues) - 0.5 * std(simValues);

        // Minor length adjustment (capped at 10%)
        const wordCount = numWords(labels[i].text);
        const lengthFactor = 1 + Math.min(0.03 * wordCount, 0.10);
        threshold *= lengthFactor;

        // Optional single-word safeguard
        if (wordCount === 1) threshold = Math.max(threshold, SINGLE_WORD_MIN_THRESHOLD);

        // Clamp to adaptive maxThresholdForGroup
        threshold = clamp(threshold, MIN_THRESHOLD, maxThresholdForGroup);

        // Extra safety: prevent thresholds too close to MIN for long labels
        if (wordCount > 7 && threshold < 0.85) threshold = 0.85;

        // Extra safety: prevent thresholds too high for highly variable groups
        if (groupStd > 0.05 && threshold > maxThresholdForGroup) threshold = maxThresholdForGroup;

        labels[i].threshold = parseFloat(threshold.toFixed(3));
    }
}



/**
 * Compute adaptive thresholds for a group of labels
 * - Each label gets its own threshold
 * - Group similarity stats used for sliding caps
 * - Minor word count adjustment
 * - Outlier-resistant (percentiles)
 * - Ensures semantic consistency without overfitting
 */
function computeThresholdsForGroupSuperior(labels) {
    if (!labels || labels.length === 0) return;

    if (labels.length === 1) {
        labels[0].threshold = clamp(0.9, MIN_THRESHOLD, 0.95);
        return;
    }

    // --- 1️⃣ Compute all pairwise similarities ---
    const simsMatrix = Array(labels.length).fill(null).map(() => []);
    const allSims = [];
    for (let i = 0; i < labels.length; i++) {
        const a = new Float32Array(labels[i].embedding);
        for (let j = 0; j < labels.length; j++) {
            if (i === j) continue;
            const b = new Float32Array(labels[j].embedding);
            const sim = cosineNormalized(a, b);
            simsMatrix[i].push(sim);
            allSims.push(sim);
        }
    }

    // --- 2️⃣ Compute group statistics ---
    const groupMean = mean(allSims);
    const groupStd = std(allSims);
    const sortedSims = [...allSims].sort((a, b) => a - b);
    const percentile90 = sortedSims[Math.floor(0.9 * sortedSims.length)] || 0.95;
    const maxThresholdForGroup = clamp(percentile90, MIN_THRESHOLD, 0.95);

    // --- 3️⃣ Compute label-specific thresholds ---
    for (let i = 0; i < labels.length; i++) {
        const simValues = simsMatrix[i];

        // Base threshold: mean - 0.5 * std of this label vs group
        let base = mean(simValues) - 0.5 * std(simValues);

        // Minor adjustment based on label's deviation from group
        const labelMean = mean(simValues);
        const deviationFromGroup = labelMean - groupMean; // positive = more similar than avg
        const labelOffset = deviationFromGroup * 0.3;    // small boost or reduction
        base += labelOffset;

        // Minor word-count adjustment (max +10%)
        const wordCount = numWords(labels[i].text);
        const lengthFactor = 1 + Math.min(0.03 * wordCount, 0.10);
        base *= lengthFactor;

        // Single-word safeguard
        if (wordCount === 1) base = Math.max(base, SINGLE_WORD_MIN_THRESHOLD);

        // Long-label safety: don't let extremely long labels set threshold too low
        if (wordCount > 7 && base < 0.85) base = 0.85;

        // Clamp to adaptive max for group
        base = clamp(base, MIN_THRESHOLD, maxThresholdForGroup);

        labels[i].threshold = parseFloat(base.toFixed(3));
    }
}




// ------------------- MAIN SCRIPT --------------------------

async function generateThresholds() {
    console.log('[THRESHOLDS] Loading label embeddings...');
    const rawData = fs.readFileSync(EMBEDDINGS_PATH, 'utf-8');
    const labelData = JSON.parse(rawData);

    if (!labelData.questions) {
        console.error('[THRESHOLDS] No questions found in JSON.');
        return;
    }

    console.log('[THRESHOLDS] Computing thresholds for each label group...');

    for (const [groupKey, group] of Object.entries(labelData.questions)) {
        const labels = group.labels;
        if (!labels || labels.length <= 1) {
            // Single label → assign default threshold
            if (labels?.[0]) labels[0].threshold = clamp(0.9, MIN_THRESHOLD, MAX_THRESHOLD);
            continue;
        }

        // Precompute all pairwise similarities
        const sims = Array(labels.length).fill(null).map(() => []);
        for (let i = 0; i < labels.length; i++) {
            for (let j = 0; j < labels.length; j++) {
                if (i === j) continue;
                sims[i].push(cosineNormalized(new Float32Array(labels[i].embedding), new Float32Array(labels[j].embedding)));
            }
        }

        // // Compute threshold for each label
        // for (let i = 0; i < labels.length; i++) {
        //     const simValues = sims[i];
        //     const avg = mean(simValues);
        //     const deviation = std(simValues);

        //     // Base threshold: mean - 0.5 * std
        //     let threshold = avg - 0.5 * deviation;

        //     // Adjust for label length
        //     const wordCount = numWords(labels[i].text);
        //     threshold *= 0.9 + 0.05 * wordCount;

        //     // Enforce stricter lower bound for low-context labels
        //     if (wordCount === 1) {
        //         threshold = Math.max(threshold, SINGLE_WORD_MIN_THRESHOLD);
        //     }

        //     // Clamp between min and max
        //     threshold = clamp(threshold, MIN_THRESHOLD, MAX_THRESHOLD);

        //     labels[i].threshold = parseFloat(threshold.toFixed(3));
        // }

        // computeThresholdsForGroup(labels);

        // computeThresholdsForGroupAdvanced(labels);

        computeThresholdsForGroupSuperior(labels);

    }

    // Save updated JSON
    fs.writeFileSync(EMBEDDINGS_PATH, JSON.stringify(labelData, null, 2), 'utf-8');
    console.log('[THRESHOLDS] Updated thresholds saved to labelEmbeddings.json ✅');
}

generateThresholds().catch(err => console.error('[THRESHOLDS] Error:', err));
