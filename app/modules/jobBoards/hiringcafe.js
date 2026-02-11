// app/modules/jobBoards/hiringcafe.js
// ============================================================================
// 📁 Global Dependencies
// ============================================================================
import {waitUntil, notifyTabState, getTabState, getJobId} from '@shared/utils/utility.js';

// ============================================================================
// 📁 JobBoard Dependencies
// ============================================================================
import {prepareBatchAndUpsertJobs} from '@shared/utils/jobBoardUtils.js';

// ============================================================================
// 📁 HiringCafe Dependencies
// ============================================================================
import {fetchAllJobs} from '@jobBoards/utils/hiringcafeUtils.js';
import {JOBBOARD, KEY_SELECTOR_MAP} from '@jobBoards/config/hiringcafeConfig.js';


// ============================================================================
// 🚀 STEP: Main Automation Entry Point
// ============================================================================

/**
 * Entry point for Workday automation.
 * @param {Object} payload - Config data from popup/background.
 */
export async function startExecution(payload = {}) {
    console.log(`[${JOBBOARD}] Started with payload:`, payload);

    try {

        /********************************************************************
         * 🌐 PHASE 1 — SEARCH PAGINATION (THE CORE)
         * 🧪 PHASE 2 — IN-FLIGHT FILTERING
         ********************************************************************/
        console.log("⏳ Fetching jobs from HiringCafe…");
        const allJobs = await fetchAllJobs(payload);
        console.log(`📦 Total jobs: ${allJobs.length}`);

        /********************************************************************
         *  
         ********************************************************************/
        if (!allJobs.length) {
            console.warn("⚠️ No jobs matched your filters.");
            notifyTabState({ state: 'fetchCompleted', fetchSuccess: true, fetchJobsCount: 0 }, { updateUI: true });
            return;
        }

        const finalJobs = allJobs;

        /********************************************************************
         * 🚀 PHASE 3 — PREPARE BATCH | UPSERT JOBS TO DB | UPDATE UI
         ********************************************************************/
        await prepareBatchAndUpsertJobs(finalJobs, KEY_SELECTOR_MAP, JOBBOARD)

        console.log(`[${JOBBOARD}] ✅ Execution completed successfully.`);

        /* Download Optional */
        // import {downloadCSV} from '@shared/utils/jobBoardUtils.js';
        // console.table(finalJobs.slice(0, 20));
        // downloadCSV(finalJobs, JOBBOARD + '.csv');
        // console.log(`✅ CSV downloaded: ${JOBBOARD + '.csv'}`);

    } catch (err) {
        notifyTabState({ state: 'fetchCompleted', fetchSuccess: false, fetchJobsCount: 0 }, { updateUI: true });
        console.error(`[${JOBBOARD}] ❌ Fatal automation error:`, err);
    } finally {
        // pass
    }
}