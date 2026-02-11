// ============================================================================
// 📁 JobBoard Dependencies
// ============================================================================
import {matchATS, matchPreference, parsePublishTimeUTC} from '@shared/utils/jobBoardUtils.js';
import {JOB_KEY_MAP} from '@shared/config/jobBoardConfig.js';

// ============================================================================
// 📁 JobRights Dependencies
// ============================================================================
import {JOBBOARD} from '@jobBoards/config/jobrightsConfig.js';



/********************************************************************
 * 🍭 PARSE SKILLS
 ********************************************************************/
function extractSkills(job) {
    const skillsSet = new Set();

    // Extract skills from skillMatchingScores
    if (job.jobResult && job.jobResult.skillMatchingScores) {
        job.jobResult.skillMatchingScores.forEach(item => {
            if (item.featureName) {
                skillsSet.add(item.featureName); // Adding featureName as skill
            }
        });
    }

    // Extract skills from jdCoreSkills
    if (job.jobResult && job.jobResult.jdCoreSkills) {
        job.jobResult.jdCoreSkills.forEach(item => {
            if (item.skill) {
                skillsSet.add(item.skill); // Adding skill from jdCoreSkills
            }
        });
    }

    // Extract skills from detailQualifications --> mustHave --> hardSkill
    if (job.jobResult && job.jobResult.detailQualifications && job.jobResult.detailQualifications.mustHave && job.jobResult.detailQualifications.mustHave.hardSkill) {
        job.jobResult.detailQualifications.mustHave.hardSkill.forEach(item => {
            if (item.skill) {
                skillsSet.add(item.skill); // Adding hardSkill from mustHave
            }
        });
    }

    // Extract skills from detailQualifications --> mustHave --> softSkill
    if (job.jobResult && job.jobResult.detailQualifications && job.jobResult.detailQualifications.mustHave && job.jobResult.detailQualifications.mustHave.softSkill) {
        job.jobResult.detailQualifications.mustHave.softSkill.forEach(item => {
            if (item.skill) {
                skillsSet.add(item.skill); // Adding softSkill from mustHave
            }
        });
    }

    // Extract skills from detailQualifications --> preferredHave --> hardSkill
    if (job.jobResult && job.jobResult.detailQualifications && job.jobResult.detailQualifications.preferredHave && job.jobResult.detailQualifications.preferredHave.hardSkill) {
        job.jobResult.detailQualifications.preferredHave.hardSkill.forEach(item => {
            if (item.skill) {
                skillsSet.add(item.skill); // Adding hardSkill from preferredHave
            }
        });
    }

    // Extract skills from detailQualifications --> preferredHave --> softSkill
    if (job.jobResult && job.jobResult.detailQualifications && job.jobResult.detailQualifications.preferredHave && job.jobResult.detailQualifications.preferredHave.softSkill) {
        job.jobResult.detailQualifications.preferredHave.softSkill.forEach(item => {
            if (item.skill) {
                skillsSet.add(item.skill); // Adding softSkill from preferredHave
            }
        });
    }

    // Convert Set to Array and return
    return Array.from(skillsSet);
}


/********************************************************************
 * 🌐 FETCH ALL JOBS (BACKEND PAGINATION)
 ********************************************************************/
export async function fetchAllJobs() {
    const results = [];
    const seenJobIds = new Set();
    let position = 0;
    const PAGE_SIZE = 10

    while (true) {
        const res = await fetch(
            `https://jobright.ai/swan/recommend/list/jobs?refresh=false&sortCondition=0&position=${position}&count=${PAGE_SIZE}`, {
                credentials: "include"
            }
        );

        const json = await res.json();
        const jobs = json?.result?.jobList || [];
        if (!jobs.length) break;

        for (const job of jobs) {
            const jobData = job.jobResult;
            const companyData = job.companyResult;

            if (!jobData || seenJobIds.has(jobData.jobId)) continue;
            seenJobIds.add(jobData.jobId);

            const publishTimeISO = parsePublishTimeUTC(jobData.publishTime);

            results.push({
                [JOB_KEY_MAP.TITLE]: jobData.jobTitle,
                [JOB_KEY_MAP.COMPANY_NAME]: companyData.companyName || null,
                [JOB_KEY_MAP.APPLY_URL]: jobData.applyLink || jobData.originalUrl,
                [JOB_KEY_MAP.MATCH_SCORE]: job.displayScore,
                [JOB_KEY_MAP.PUBLISH_TIME_ISO]: publishTimeISO,
                [JOB_KEY_MAP.LOCATIONS]: [jobData.jobLocation],
                [JOB_KEY_MAP.SENIORITY]: jobData.jobSeniority,
                [JOB_KEY_MAP.EMPLOYMENT_TYPE]: jobData.employmentType,
                [JOB_KEY_MAP.WORK_MODAL]: jobData.workModel,
                [JOB_KEY_MAP.SUMMARY]: jobData.jobSummary?.replace(/\n/g, " ") || "",
                [JOB_KEY_MAP.SKILLS]: extractSkills(job),
                [JOB_KEY_MAP.IS_REPOSTED]: jobData.repost,
                [JOB_KEY_MAP.IS_VISA_SPONSOR]: jobData.isH1bSponsor,
                [JOB_KEY_MAP.IS_CITIZEN_ONLY]: jobData.isCitizenOnly,
                [JOB_KEY_MAP.IS_CLEARANCE_REQUIRED]: jobData.isClearanceRequired,
                [JOB_KEY_MAP.IS_WORK_AUTH_REQUIRED]: jobData.isWorkAuthRequired,
                [JOB_KEY_MAP.IS_REMOTE]: jobData.isRemote,
                [JOB_KEY_MAP.IS_DELETED]: jobData.isDeleted,
                [JOB_KEY_MAP.MIN_SALARY]: jobData.minSalary,
                [JOB_KEY_MAP.MAX_SALARY]: jobData.maxSalary,
                [JOB_KEY_MAP.COMPANY_URL]: companyData.companyURL,
                [JOB_KEY_MAP.SOURCE_ID]: JOBBOARD + jobData.jobId,
                [JOB_KEY_MAP.APPLICATION_STATUS]: 'init',
                [JOB_KEY_MAP.EXECUTION_RESULT]: 'pending',
                [JOB_KEY_MAP.APPLIED_AT]: null
            });
        }

        position += PAGE_SIZE;
    }

    return results;
}


/********************************************************************
 * 🧪 HELPER 🔹 FILTER LOGIC
 ********************************************************************/
export function filterJobs(jobs, CONFIG) {
    const now = new Date();

    return jobs.filter(job => {

        // ATS filter
        const atsMatch = matchATS(job[JOB_KEY_MAP.APPLY_URL], CONFIG.ats);

        // Time filter
        let timeMatch = true;
        if (CONFIG.publishedWithinHours && CONFIG.publishedWithinHours > 0 && job.publishTime) {
            const diffHrs = (now - new Date(job.publishTime)) / 36e5;
            timeMatch = diffHrs <= CONFIG.publishedWithinHours;
        }

        // Preference filters
        const prefs = CONFIG.preferences;
        const preferenceMatch =
            matchPreference(job.isReposted, prefs.isReposted) &&
            matchPreference(job.isH1bSponsor, prefs.isH1bSponsor) &&
            matchPreference(job.isWorkAuthRequired, prefs.isWorkAuthRequired) &&
            matchPreference(job.isCitizenOnly, prefs.isCitizenOnly) &&
            matchPreference(job.isClearanceRequired, prefs.isClearanceRequired) &&
            matchPreference(job.isRemote, prefs.isRemote);

        return atsMatch && timeMatch && preferenceMatch;
    });
}

/*****************************************
 * 🧠 HELPER 🔹 SORTING
 *****************************************/
export function sortJobs(jobs, sortConfig = []) {

    if (!Array.isArray(sortConfig) || !sortConfig.length) {
        return jobs;
    }

    function parseDate(dateStr) {
        if (!dateStr) return null;

        // Expected format: DD-MM-YYYY HH:mm
        const [datePart, timePart] = dateStr.split(" ");
        if (!datePart || !timePart) return null;

        const [day, month, year] = datePart.split("-").map(Number);
        const [hour, minute] = timePart.split(":").map(Number);

        return new Date(year, month - 1, day, hour, minute);
    }

    return [...jobs].sort((a, b) => {
        for (const rule of sortConfig) {
            const {
                field,
                order = "asc",
                type = "string"
            } = rule;

            let valA = a[field];
            let valB = b[field];

            if (type === "date") {
                valA = parseDate(valA);
                valB = parseDate(valB);
            } else if (type === "number") {
                valA = Number(valA);
                valB = Number(valB);
            } else {
                valA = String(valA ?? "");
                valB = String(valB ?? "");
            }

            // Handle nulls safely
            if (valA == null && valB == null) continue;
            if (valA == null) return order === "asc" ? 1 : -1;
            if (valB == null) return order === "asc" ? -1 : 1;

            if (valA > valB) return order === "asc" ? 1 : -1;
            if (valA < valB) return order === "asc" ? -1 : 1;
        }
        return 0;
    });
}
