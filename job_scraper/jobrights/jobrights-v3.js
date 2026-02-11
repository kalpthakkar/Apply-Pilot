(async () => {

	/********************************************************************
	 * 🔧 USER CONFIGURATION — CHANGE ONLY THIS SECTION
	 ********************************************************************/
	const CONFIG = {
		/* 
        *  ATS filter (regex, case-insensitive)
        *  • 'null'/'undefined' for no preference
        *  • Array[strings] for pattern based ATS filter. 
        */
		ats: ["workday"],

		// Jobs published within last X hours (0 = disable)
		publishedWithinHours: 48,

		// Tri-state preference filters:
		// true  → must be true
		// false → do NOT filter
		// null  → do NOT filter
		preferences: {
			isReposted: false,
			isH1bSponsor: null,
			isWorkAuthRequired: null,
			isCitizenOnly: false,
			isClearanceRequired: false,
			isRemote: null
		},

		// Pagination
		pageSize: 20,

        // Sorting configuration (applied after filtering)
        // sort: null  <-- to disable sorting
        // Priority based filtering -> 1st rule gets higher priority, and subsequent rules nest sorting order.
        sort: [
            {
                field: "publishTime",
                order: "desc", // "asc" | "desc"
                type: "date",  // "date" | "number" | "string"
                format: "DD-MM-YYYY HH:mm" // used only for date
            },
            {
                field: "matchScore",
                order: "desc",
                type: "number"
            }
        ],


		// CSV output filename
		outputFile: "jobright_jobs.csv"
	};

	/********************************************************************
	 * 🧠 HELPERS — TRI-STATE BOOLEAN MATCHER
	 ********************************************************************/

    /*****************************************
	 * 🧠 HELPER 🔹 TRI-STATE ATS MATCHER
	 *****************************************/
    function matchATS(applyUrl, atsList) {
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
	 * 🧠 HELPER 🔹 TRI-STATE BOOLEAN MATCHER
	 *****************************************/
    function matchPreference(value, preference) {
        // No preference → do not filter
        if (preference === null || preference === undefined) {
            return true;
        }

        // Explicit preference → must match exactly
        return value === preference;
    }

    /*****************************************
	 * 🧠 HELPER 🔹 SORTING
	 *****************************************/
    function sortJobs(jobs, sortConfig = []) {

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


	/********************************************************************
	 * 📥 CSV DOWNLOAD UTILITY
	 ********************************************************************/
	function downloadCSV(data, filename) {
		if (!data.length) return;

		const headers = Object.keys(data[0]);
		const rows = [headers.join(",")];

		for (const row of data) {
			const values = headers.map(h => {
				let val = row[h] ?? "";
				val = String(val).replace(/"/g, '""');
				if (val.includes(",") || val.includes("\n")) {
					val = `"${val}"`;
				}
				return val;
			});
			rows.push(values.join(","));
		}

		const blob = new Blob([rows.join("\n")], {
			type: "text/csv"
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	/********************************************************************
	 * 🌐 FETCH ALL JOBS (BACKEND PAGINATION)
	 ********************************************************************/
	async function fetchAllJobs() {
		const results = [];
		const seenJobIds = new Set();
		let position = 0;

		while (true) {
			const res = await fetch(
				`https://jobright.ai/swan/recommend/list/jobs?refresh=false&sortCondition=0&position=${position}&count=${CONFIG.pageSize}`, {
					credentials: "include"
				}
			);

			const json = await res.json();
			const jobs = json?.result?.jobList || [];
			if (!jobs.length) break;

			for (const item of jobs) {
				const job = item.jobResult;
				const company = item.companyResult;

				if (!job || seenJobIds.has(job.jobId)) continue;
				seenJobIds.add(job.jobId);

				results.push({
					title: job.jobTitle,
					company: company.companyName || "N/A",
					publishTime: job.publishTime,
					publishTimeDesc: job.publishTimeDesc,
					applyUrl: job.applyLink || job.originalUrl,
					matchScore: item.displayScore,
					isReposted: job.repost,
					location: job.jobLocation,
					seniority: job.jobSeniority,
					isH1bSponsor: job.isH1bSponsor,
					isCitizenOnly: job.isCitizenOnly,
					isClearanceRequired: job.isClearanceRequired,
					isWorkAuthRequired: job.isWorkAuthRequired,
					employmentType: job.employmentType,
					workModel: job.workModel,
					isRemote: job.isRemote,
					isDeleted: job.isDeleted,
					salaryDesc: job.salaryDesc,
					minSalary: job.minSalary,
					maxSalary: job.maxSalary,
					companyURL: company.companyURL,
					originalUrl: job.originalUrl,
					jobId: job.jobId,
					summary: job.jobSummary?.replace(/\n/g, " ") || ""
				});
			}

			position += CONFIG.pageSize;
		}

		return results;
	}

	/********************************************************************
	 * 🧪 FILTER LOGIC
	 ********************************************************************/
	function filterJobs(jobs) {
		const now = new Date();

		return jobs.filter(job => {
			// ATS filter
            const atsMatch = matchATS(job.applyUrl, CONFIG.ats);

			// Time filter
			let timeMatch = true;
			if (CONFIG.publishedWithinHours > 0 && job.publishTime) {
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

	/********************************************************************
	 * 🚀 MAIN EXECUTION
	 ********************************************************************/
	console.log("⏳ Fetching jobs from JobRight…");

	const allJobs = await fetchAllJobs();
	console.log(`📦 Total jobs fetched: ${allJobs.length}`);

    const filteredJobs = filterJobs(allJobs);
    console.log(`🎯 Jobs after filtering: ${filteredJobs.length}`);

    const sortedJobs = sortJobs(filteredJobs, CONFIG.sort);
    console.log("📊 Sorting applied:", CONFIG.sort);

    if (!sortedJobs.length) {
        console.warn("⚠️ No jobs matched your filters. CSV not generated.");
        return;
    }

	console.table(sortedJobs);
	downloadCSV(sortedJobs, CONFIG.outputFile);

	console.log(`✅ CSV downloaded: ${CONFIG.outputFile}`);

})();