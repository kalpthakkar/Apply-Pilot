// ============================================================================
// 📁 JobBoard Dependencies
// ============================================================================
import {JOB_KEY_MAP, JOB_KEY_SELECTOR_TYPE} from '@shared/config/jobBoardConfig.js';

// ============================================================================
// 🧩 Config
// ============================================================================
export const JOBBOARD = 'hiringcafe'

export const KEY_SELECTOR_MAP = {
    [JOB_KEY_MAP.TITLE] : JOB_KEY_SELECTOR_TYPE.FORCE_UPDATE,
    [JOB_KEY_MAP.COMPANY_NAME]: JOB_KEY_SELECTOR_TYPE.FORCE_UPDATE,
    [JOB_KEY_MAP.APPLY_URL]: JOB_KEY_SELECTOR_TYPE.FORCE_UPDATE,
    [JOB_KEY_MAP.MATCH_SCORE]: JOB_KEY_SELECTOR_TYPE.FORCE_UPDATE,
    [JOB_KEY_MAP.PUBLISH_TIME_ISO]: JOB_KEY_SELECTOR_TYPE.SOFT_UPDATE, 
    [JOB_KEY_MAP.LOCATIONS]: JOB_KEY_SELECTOR_TYPE.FORCE_UPDATE, 
    [JOB_KEY_MAP.SENIORITY]: JOB_KEY_SELECTOR_TYPE.FORCE_UPDATE, 
    [JOB_KEY_MAP.EMPLOYMENT_TYPE]: JOB_KEY_SELECTOR_TYPE.FORCE_UPDATE, 
    [JOB_KEY_MAP.WORK_MODAL]: JOB_KEY_SELECTOR_TYPE.FORCE_UPDATE, 
    [JOB_KEY_MAP.IS_REPOSTED]: JOB_KEY_SELECTOR_TYPE.FORCE_UPDATE, 
    [JOB_KEY_MAP.SUMMARY]: JOB_KEY_SELECTOR_TYPE.FORCE_UPDATE, 
    [JOB_KEY_MAP.SKILLS]: JOB_KEY_SELECTOR_TYPE.FORCE_UPDATE,
    [JOB_KEY_MAP.IS_VISA_SPONSOR]: JOB_KEY_SELECTOR_TYPE.FORCE_UPDATE, 
    [JOB_KEY_MAP.IS_CITIZEN_ONLY]: JOB_KEY_SELECTOR_TYPE.SOFT_UPDATE, 
    [JOB_KEY_MAP.IS_CLEARANCE_REQUIRED]: JOB_KEY_SELECTOR_TYPE.FORCE_UPDATE, 
    [JOB_KEY_MAP.IS_WORK_AUTH_REQUIRED]: JOB_KEY_SELECTOR_TYPE.SOFT_UPDATE, 
    [JOB_KEY_MAP.IS_REMOTE]: JOB_KEY_SELECTOR_TYPE.FORCE_UPDATE, 
    [JOB_KEY_MAP.IS_DELETED]: JOB_KEY_SELECTOR_TYPE.FORCE_UPDATE, 
    [JOB_KEY_MAP.MIN_SALARY]: JOB_KEY_SELECTOR_TYPE.FORCE_UPDATE, 
    [JOB_KEY_MAP.MAX_SALARY]: JOB_KEY_SELECTOR_TYPE.FORCE_UPDATE, 
    [JOB_KEY_MAP.COMPANY_URL]: JOB_KEY_SELECTOR_TYPE.FORCE_UPDATE, 
    [JOB_KEY_MAP.SOURCE_ID]: JOB_KEY_SELECTOR_TYPE.FORCE_UPDATE, 
    [JOB_KEY_MAP.APPLICATION_STATUS]: JOB_KEY_SELECTOR_TYPE.SOFT_UPDATE, 
    [JOB_KEY_MAP.EXECUTION_RESULT]: JOB_KEY_SELECTOR_TYPE.SOFT_UPDATE, 
    [JOB_KEY_MAP.APPLIED_AT]: JOB_KEY_SELECTOR_TYPE.SOFT_UPDATE,
}



/********************************************************************
 * 🔧 CONFIG — TUNE EVERYTHING HERE
 ********************************************************************/
export const CONFIG = {
    // --- SearchState (mirrors UI filters) ---
    searchState: {
        dateFetchedPastNDays: -1, // -1 = no backend cutoff (IMPORTANT)
        searchQuery: "Software",
        securityClearances: ["None", "Confidential", "Public Trust", "Other"],
        seniorityLevel: ["No Prior Experience Required", "Entry Level", "Mid Level", "Senior Level"],
        roleYoeRange: [0, 4],
        managementYoeRange: [0, 3],
        hideJobTypes: ["Applied"]
    },
    // --- Pagination ---
    pageSize: 40, // hard server limit
    maxPages: 200, // safety guard (200 * 40 = 8000 jobs max)
    // --- Client-side filters ---
    publishedWithinHours: 72, // 0 = disable
    ats: ["workday", "greenhouse", "lever", "oraclecloud"], // null = disable
    excludeSecurityClearance: true
};
