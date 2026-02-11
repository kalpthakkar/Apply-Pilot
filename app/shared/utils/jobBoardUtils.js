// ============================================================================
// 📁 Global Dependencies
// ============================================================================
import { notifyTabState, getJobId } from '@shared/utils/utility.js';

// ============================================================================
// 📁 JobBoard Dependencies
// ============================================================================
import { JOB_KEY_MAP, JOB_KEY_SELECTOR_TYPE } from '@shared/config/jobBoardConfig.js';
import { sleep } from '../../modules/form/formUtils';

/*****************************************
 * 🧠 HELPER 🔹 TRI-STATE BOOLEAN MATCHER
 *****************************************/
export function matchPreference(value, preference) {
    // No preference → do not filter
    if (preference === null || preference === undefined) {
        return true; 
    }
    // Explicit preference → must match exactly
    return value === preference;
}


/*****************************************
 * 🧠 HELPER 🔹 TRI-STATE ATS MATCHER
 *****************************************/
export function matchATS(applyUrl, atsList) {
    // No preference → do not filter
    if (atsList === null || atsList === undefined) {
        return true;
    }

    // Explicit empty list → match nothing
    if (!Array.isArray(atsList) || atsList.length === 0) {
        return false;
    }

    // Match if any ATS regex matches
    return atsList.some(pattern => {
        try {
            return new RegExp(pattern, "i").test(applyUrl);
        } catch {
            return false;
        }
    });
}


/*****************************************
 * ⏱️ HELPER 🔹 Parse Publish Time to UTC
 *****************************************/
export function parsePublishTimeUTC(publishTimeStr) {
    if (!publishTimeStr || typeof publishTimeStr !== "string") return null;

    // Normalize to ISO-ish
    const normalized = publishTimeStr.includes("T")
        ? publishTimeStr
        : publishTimeStr.replace(" ", "T");

    const date = new Date(normalized.endsWith("Z") ? normalized : normalized + "Z");

    return isNaN(date.getTime()) ? null : date.toISOString();
}

/*****************************************
 * 🎭 HELPER 🔹 Filter and extract force update fields from the job
 *****************************************/
// const pick = (obj, keys) => Object.fromEntries(keys.map(k => [k, obj[k]]));
const extractForceData = (job, KEY_SELECTOR_MAP) => {
  // Filter keys based on FORCE_UPDATE type in KEY_SELECTOR_MAP
  return Object.fromEntries(
    Object.keys(KEY_SELECTOR_MAP)
      .filter(key => KEY_SELECTOR_MAP[key] === JOB_KEY_SELECTOR_TYPE.FORCE_UPDATE)
      .map(key => [key, job[key]]) // Map the key to the value from the job object
  );
};

/*****************************************
 * 🎭 HELPER 🔹 Filter and extract soft update fields from the job
 *****************************************/
const extractSoftData = (job, KEY_SELECTOR_MAP) => {
  // Filter keys based on SOFT_UPDATE type in KEY_SELECTOR_MAP
  return Object.fromEntries(
    Object.keys(KEY_SELECTOR_MAP)
      .filter(key => KEY_SELECTOR_MAP[key] === JOB_KEY_SELECTOR_TYPE.SOFT_UPDATE)
      .map(key => [key, job[key]]) // Map the key to the value from the job object
  );
};


/*****************************************
 * 🚀 HELPER 🔹 Prepare batch for upserting jobs to DB
 *****************************************/
async function prepareBatch(jobs, KEY_SELECTOR_MAP, JOBBOARD) {
    const rows = [];
    const seenIDs = new Set();

    for (const job of jobs) {
        const jobIdObj = await getJobId(job[JOB_KEY_MAP.APPLY_URL]);
        const { id, fingerprint } = jobIdObj;

        if (seenIDs.has(id)) continue;
        seenIDs.add(id);

        rows.push({
            key: id,
            fingerprint: fingerprint,
            force_data: extractForceData(job, KEY_SELECTOR_MAP),
            soft_data: extractSoftData(job, KEY_SELECTOR_MAP),
            source: JOBBOARD
        });
    }

    console.log("📦 Rows prepared:", rows.length);

    return rows
}


/*****************************************
 * 🚀 HELPER 🔹 Send batch to background.js | Update UI
 *****************************************/
async function upsertJobs(rows) {
    try {
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'upsertJobBatch',
                jobs: rows
            }, resolve);
        });

        const success = response?.success ?? false;

        if (success) {
            console.log(`✅ Successfully sent ${rows.length} jobs to background for upsert`);
        } else {
            console.error("❌ Failed sending jobs to background:", response?.error);
        }

        notifyTabState({
            state: 'fetchCompleted',
            fetchSuccess: success,
            fetchJobsCount: rows.length // Rows length is now equivalent to the number of jobs processed
        }, { updateUI: true });

    } catch (error) {
        console.error("❌ Error during job upsert:", error);

        notifyTabState({
            state: 'fetchCompleted',
            fetchSuccess: false,
            fetchJobsCount: rows.length
        }, { updateUI: true });
    }
}


/*****************************************
 * 🚀 HELPER 🔹 Prepare batch | Upsert Jobs to DB | Update UI
 *****************************************/
export async function prepareBatchAndUpsertJobs(jobs, KEY_SELECTOR_MAP, JOBBOARD) {
    const rows = await prepareBatch(jobs, KEY_SELECTOR_MAP, JOBBOARD);
    await upsertJobs(rows);
}

/*****************************************
 * ⬇️ HELPER 🔹 Download Jobs
 *****************************************/
export function downloadCSV(rows, filename) {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(",")];
    for (const r of rows) {
        lines.push(headers.map(h => {
            let v = String(r[h] ?? "").replace(/"/g, '""');
            return v.includes(",") ? `"${v}"` : v;
        }).join(","));
    }
    const blob = new Blob([lines.join("\n")], {
        type: "text/csv"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}