// ============================================================================
// 📁 JobBoard Dependencies
// ============================================================================
import {matchATS, matchPreference, parsePublishTimeUTC} from '@shared/utils/jobBoardUtils.js';
import {JOB_KEY_MAP} from '@shared/config/jobBoardConfig.js';

// ============================================================================
// 📁 HiringCafe Dependencies
// ============================================================================
import {JOBBOARD} from '@jobBoards/config/hiringcafeConfig.js';

/********************************************************************
 * 🧠 HELPERS
 ********************************************************************/
function buildDefaultSearchState() {
    return {
        locations: [],
        workplaceTypes: ["Remote", "Hybrid", "Onsite"],
        defaultToUserLocation: false,
        userLocation: null,

        physicalEnvironments: ["Office", "Outdoor", "Vehicle", "Industrial", "Customer-Facing"],
        physicalLaborIntensity: ["Low", "Medium", "High"],
        physicalPositions: ["Sitting", "Standing"],
        oralCommunicationLevels: ["Low", "Medium", "High"],
        computerUsageLevels: ["Low", "Medium", "High"],
        cognitiveDemandLevels: ["Low", "Medium", "High"],

        currency: { label: "Any", value: null },
        frequency: { label: "Any", value: null },

        roleTypes: ["Individual Contributor", "People Manager"],
        securityClearances: ["None", "Confidential", "Public Trust", "Other"],

        hideJobTypes: ["Applied"],

        dateFetchedPastNDays: -1,
        searchQuery: "",
        seniorityLevel: [],
        roleYoeRange: [0, 20],
        managementYoeRange: [0, 20],

        sortBy: "default",

        // Keep all other required fields empty arrays
        associatesDegreeFieldsOfStudy: [],
        bachelorsDegreeFieldsOfStudy: [],
        mastersDegreeFieldsOfStudy: [],
        doctorateDegreeFieldsOfStudy: [],
        languagesRequirements: [],
        companyNames: [],
        industries: []
    };
}

function syncToDefaultSearchState(CONFIG) {
    const searchState = buildDefaultSearchState();

    searchState.searchQuery = CONFIG.search ?? "";
    searchState.dateFetchedPastNDays =
        CONFIG.publishedWithinHours
            ? Math.ceil(CONFIG.publishedWithinHours / 24)
            : -1;

    function normalizeLocation(loc) {
        return {
            id: loc?.id ?? null,
            types: Array.isArray(loc?.types) ? loc.types : [],
            address_components: Array.isArray(loc?.address_components)
                ? loc.address_components
                : [],
            geometry: loc?.geometry?.location
                ? {
                    location: {
                        lat: Number(loc.geometry.location.lat),
                        lon: Number(loc.geometry.location.lon),
                    }
                }
                : null,
            formatted_address: loc?.formatted_address ?? "",
            population: typeof loc?.population === "number"
                ? loc.population
                : null,
            workplace_types: Array.isArray(loc?.workplace_types)
                ? loc.workplace_types
                : [],
            options: typeof loc?.options === "object" && loc.options !== null
                ? loc.options
                : {}
        };
    }

    if (Array.isArray(CONFIG.locations)) {
        searchState.locations = CONFIG.locations.map(normalizeLocation);
        searchState.defaultToUserLocation = false;
    }
    console.log("Normalized Locations:::", searchState.locations)


    searchState.seniorityLevel = CONFIG.seniority;
    searchState.roleYoeRange = CONFIG.roleYoeRange;
    searchState.managementYoeRange = CONFIG.managementYoeRange;
    searchState.hideJobTypes = ["Applied"];
    
    const ALL_CLEARANCES = ["None", "Confidential", "Public Trust", "Other"];
    if (CONFIG.securityClearances == null) {
        // No preference
        searchState.securityClearances = ALL_CLEARANCES;
    }
    else if (
        Array.isArray(CONFIG.securityClearances) &&
        CONFIG.securityClearances.length === 1 &&
        CONFIG.securityClearances[0] === "None"
    ) {
        // Only non-clearance jobs
        searchState.securityClearances = ["None"];
    }
    else if (Array.isArray(CONFIG.securityClearances)) {
        // Specific clearance types
        searchState.securityClearances = CONFIG.securityClearances;
    }

    if (CONFIG.isVisaSponsor === true) {
        searchState.benefitsAndPerks = ["visa_sponsorship"];
    }

    return searchState;
}

export async function fetchAllJobs(CONFIG) {

    if ((!('maxJobs' in CONFIG)) || (CONFIG.maxJobs == null)) CONFIG.maxJobs = 50;
    else if (CONFIG.maxJobs === 0) return [];

    const MAX_PAGE = 100;
    const PAGE_SIZE = 40;

    const searchState = syncToDefaultSearchState(CONFIG);
    // if (Array.isArray(CONFIG.locations) && CONFIG.locations.length) {
    //     searchState.locations = CONFIG.locations;
    // }
    // if (Array.isArray(CONFIG.securityClearances) && CONFIG.securityClearances.length) {
    //     searchState.securityClearances = CONFIG.securityClearances;
    // }
    // if (CONFIG.isVisaSponsor === true) {
    //     searchState.benefitsAndPerks = ["visa_sponsorship"];
    // }

    // Encode Search State
    const s = encodeURIComponent(btoa(decodeURIComponent(encodeURIComponent(JSON.stringify(searchState)))));

    const allJobs = [];
    const seenIds = new Set();
    for (let page = 0; page < MAX_PAGE; page++) {
        let res;
        try {
            res = await fetch(
                `https://hiring.cafe/api/search-jobs` + `?s=${s}&size=${PAGE_SIZE}&page=${page}`, 
                { credentials: "include" }
            );
        } catch {
            console.warn(`⚠️ Network error on page ${page}`);
            break;
        }
        if (!res.ok) {
            console.warn(`⚠️ HTTP ${res.status} on page ${page}`);
            break;
        }
        const json = await res.json();
        const pageJobs = json?.results || [];
        if (!pageJobs.length) break;
        let newCount = 0;
        for (const job of pageJobs) {
            if (allJobs.length >= CONFIG.maxJobs)  break;
            if (seenIds.has(job.objectID)) continue;
            seenIds.add(job.objectID);
            const jobData = job.v5_processed_job_data || {};
            const companyData = job.v5_processed_company_data || {};

            /********************************************************************
             * 🪄 IN-FLIGHT FILTER
             ********************************************************************/
            // ATS filter
            const atsMatch = matchATS(job.apply_url, CONFIG.ats);
            // Time filter
            let timeMatch = true;
            const publishTimeUTC = parsePublishTimeUTC(jobData?.estimated_publish_date);
            if (CONFIG.publishedWithinHours && CONFIG.publishedWithinHours > 0 && publishTimeUTC) {
                const diffHrs = (Date.now() - new Date(publishTimeUTC)) / 36e5;
                timeMatch = diffHrs <= CONFIG.publishedWithinHours;
            }
            // Preference filters
            const preferenceMatch =
                matchPreference(jobData.workplace_type === "Remote", CONFIG.isRemote) &&
                matchPreference(!!jobData.visa_sponsorship, CONFIG.isVisaSponsor);
            if (!(atsMatch && timeMatch && preferenceMatch)) {
                continue;
            }

            /********************************************************************
             * 📥 PUSH RESULT
             ********************************************************************/
            allJobs.push({
                [JOB_KEY_MAP.TITLE]: job.job_information?.title,
                [JOB_KEY_MAP.COMPANY_NAME]: companyData.name || jobData.company_name,
                [JOB_KEY_MAP.APPLY_URL]: job.apply_url,
                [JOB_KEY_MAP.MATCH_SCORE]: null,
                [JOB_KEY_MAP.PUBLISH_TIME_ISO]: parsePublishTimeUTC(jobData?.estimated_publish_date),
                [JOB_KEY_MAP.LOCATIONS]: jobData?.workplace_cities || [jobData.formatted_workplace_location],
                [JOB_KEY_MAP.SENIORITY]: jobData.seniority_level,
                [JOB_KEY_MAP.EMPLOYMENT_TYPE]: jobData.commitment?.[0],
                [JOB_KEY_MAP.WORK_MODAL]: jobData.workplace_type,
                [JOB_KEY_MAP.SUMMARY]: jobData.requirements_summary,
                [JOB_KEY_MAP.SKILLS]: jobData.technical_tools || [],
                [JOB_KEY_MAP.IS_REPOSTED]: null,
                [JOB_KEY_MAP.IS_VISA_SPONSOR]: jobData.visa_sponsorship,
                [JOB_KEY_MAP.IS_CITIZEN_ONLY]: null,
                [JOB_KEY_MAP.IS_CLEARANCE_REQUIRED]: jobData.security_clearance !== "None",
                [JOB_KEY_MAP.IS_WORK_AUTH_REQUIRED]: null,
                [JOB_KEY_MAP.IS_REMOTE]: jobData.workplace_type === "Remote",
                [JOB_KEY_MAP.IS_DELETED]: job.is_expired,
                [JOB_KEY_MAP.MIN_SALARY]: jobData.yearly_min_compensation,
                [JOB_KEY_MAP.MAX_SALARY]: jobData.yearly_max_compensation,
                [JOB_KEY_MAP.COMPANY_URL]: companyData.website || jobData.company_website,
                [JOB_KEY_MAP.SOURCE_ID]: JOBBOARD + job.objectID,
                [JOB_KEY_MAP.APPLICATION_STATUS]: 'init',
                [JOB_KEY_MAP.EXECUTION_RESULT]: 'pending',
                [JOB_KEY_MAP.APPLIED_AT]: null
            });
            newCount++;
        }
        console.log(`📦 Page ${page + 1}: +${newCount} jobs (total ${allJobs.length})`);
        if (allJobs.length >= CONFIG.maxJobs)  break;
        if (pageJobs.length < PAGE_SIZE) break;
    }
    return allJobs;
}
