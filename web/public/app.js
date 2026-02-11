// ./public/app.js

/**
web/
├── node_modules/
├── public/
│   ├── app.js
│   ├── index.html
│   ├── script.js
│   └── style.css
├── uploads/
├── fileUtils.js
├── package-lock.json
├── package.json
├── server.js
└── userData.json
 */

/**
 * 🔹 Convert Form to JSON
 * ---------------------------------------------
 * Converts the entire application form (including nested sections)
 * into a structured JSON object suitable for backend submission.
 *
 * ✅ Returns an object of the following structure:
 *
 * {
 *   firstName: "John",
 *   lastName: "Doe",
 *   email: "john@example.com",
 *   phone: "1234567890",
 *
 *   // 🔹 Array of custom URLs entered by user
 *   otherURLs: [
 *     "https://github.com/johndoe",
 *     "https://linkedin.com/in/johndoe"
 *   ],
 *
 *   // 🔹 Employment / EEO Information
 *   employmentInfo: {
 *     gender: "male",
 *     lgbtq: "yes",
 *     sexualOrientation: "heterosexual",
 *     authorizedWorkUS: "yes",
 *     authorizedWorkCA: "no",
 *     authorizedWorkUK: "no",
 *     visaSponsorship: "no",
 *     disability: "no",
 *     veteran: "no",
 *     age: "27",
 *     ethnicity: ["asian", "hispanic"]
 *   },
 *
 *   // 🔹 Address Section
 *   addresses: [
 *     {
 *       addressLine1: "123 Main Street",
 *       addressLine2: "Apt 5B",
 *       city: "San Francisco",
 *       state: "CA",
 *       country: "USA",
 *       postalCode: "94105"
 *     },
 *     ...
 *   ],
 *
 *   // 🔹 Work Experience Section
 *   workExperiences: [
 *     {
 *       jobTitle: "Software Engineer",
 *       company: "TechCorp",
 *       jobLocationType: "Remote",
 *       location: "California, USA",
 *       jobType: "Full-time",
 *       roleDescription: "Developed web applications...",
 *       startDate: "2023-01-01",
 *       endDate: "2024-05-01"
 *     },
 *     ...
 *   ],
 *
 *   // 🔹 Education Section
 *   education: [
 *     {
 *       school: "Stanford University",
 *       degree: ["BSc"],
 *       major: ["Computer Science"],
 *       gpa: "3.9"
 *     },
 *     ...
 *   ],
 *
 *   // 🔹 Resume Section
 *   resumes: [
 *     {
 *       resumeCategory: "Software Engineer",
 *       resumeCountry: "USA",
 *       resumeState: "CA",
 *		 resumeStoredPath: "1731108723456/Kalp Resume.pdf"
 *     },
 *     ...
 *   ],
 *
 *   // 🔹 Additional Info
 *   additionalInfo: {
 *     relocation: "yes",
 *     salaryExpectation: "100000"
 *   },

 * }
 *
 * @param {HTMLFormElement} formElement - The form DOM element
 * @returns {Object} json - Parsed structured form data
 */
// 🔹 Convert Form to JSON
function formToJSON(formElement) {
    const formData = new FormData(formElement);
    const json = {};
    const processedKeys = new Set();

    const getChips = (container, name) => Array.from(
        container
            .querySelector(`[name='${name}']`)
            ?.closest(".multiselect-wrapper")
            ?.querySelectorAll(".chips-container .chip") || []
    ).map(chip => chip.dataset.value);

    function getRadioFieldValue(form, name, transform = v => v) {
        const checked = form.querySelector(`input[type="radio"][name="${name}"]:checked`);
        return checked ? transform(checked.value) : null;
    }

    function getCheckboxFieldValue(form, name, transform = v => v) {
        const boxes = form.querySelectorAll(`input[type="checkbox"][name="${name}"]`);

        if (!boxes.length) return null;

        // Single checkbox → boolean intent
        if (boxes.length === 1) {
            return boxes[0].checked;
        }

        // Multiple checkboxes → array of selected values
        return Array.from(boxes)
            .filter(b => b.checked)
            .map(b => transform(b.value));
    }

    function getStandardFieldValue(form, name, transform = v => v) {
        const input = form.querySelector(`[name="${name}"]`);
        if (!input) return null;

        switch (input.type) {
            case 'radio': // 🔘 RADIO: value-based enum / boolean
                return getRadioFieldValue(form, name, transform);

            case 'checkbox': // ☑️ CHECKBOX: boolean intent
                return getCheckboxFieldValue(form, name, transform);

            default: // Default input (text, select, textarea, etc.)
                return transform(input.value);
        }
    }

    const FIELD_GROUPS = [
        { selector: '#employmentInfo', key: 'employmentInfo' },
    ];

    function resolveParentGroup(input, groups) {
        for (const { selector, key } of groups) {
            if (input.closest(selector)) {
                return key;
            }
        }
        return null;
    }

    const DISABLE_AUTO_SET_KEY = ['salaryExpectation', 'salaryExpectationMin', 'salaryExpectationMax'];

    // ----- Convert Form to JSON 🔹 Standard Fields -----
    for (const [key] of formData.entries()) {

        if (DISABLE_AUTO_SET_KEY.includes(key)) continue;

        const cleanKey = key.endsWith('[]') ? key.slice(0, -2) : key;
        // console.log('Key:', key);

        if (processedKeys.has(cleanKey)) continue;
        processedKeys.add(cleanKey);

        const input =
            formElement.querySelector(`[name="${key}"]`) ??
            formElement.querySelector(`[name="${cleanKey}"]`);

        if (!input) continue;

        // Skip repeatable/nested blocks handled elsewhere
        if (input.closest(
            '.address-block, .workExperience-block, .education-block, .resume-block, .project-block, .achievement-block'
        )) continue;

        const parentKey = resolveParentGroup(input, FIELD_GROUPS);

        let fieldValue;

        // 🔘 Radio / ☑️ Checkbox
        if (input.type === 'radio' || input.type === 'checkbox') {
            const value = getStandardFieldValue(formElement, cleanKey);

            fieldValue =
                typeof value === 'string'
                    ? value === 'true'
                        ? true
                        : value === 'false'
                            ? false
                            : value
                    : value;
        }
        // 📚 Array fields
        else if (key.endsWith('[]')) {
            fieldValue = formData.getAll(key);
        }
        // 📝 Default fields
        else {
            fieldValue = formData.get(key);
        }

        if (parentKey) {
            json[parentKey] ??= {};
            json[parentKey][cleanKey] = fieldValue;
        } else {
            json[cleanKey] = fieldValue;
        }
    }

    // ----- Convert Form to JSON 🔹 Normalize Missing Checkboxes -----
    const allCheckboxes = formElement.querySelectorAll('input[type="checkbox"]');
    const checkboxGroups = {};

    allCheckboxes.forEach(cb => {
        const name = cb.name?.replace(/\[\]$/, '');
        if (!name) return;

        if (!checkboxGroups[name]) {
            checkboxGroups[name] = [];
        }
        checkboxGroups[name].push(cb);
    });

    for (const [name, boxes] of Object.entries(checkboxGroups)) {
        if (processedKeys.has(name)) continue;

        // Single checkbox → boolean
        if (boxes.length === 1) {
            json[name] = false;
            continue;
        }

        // Grouped checkboxes → empty array
        json[name] = [];
    }


	// ----- Convert Form to JSON 🔹 Additional URLs -----
    json.otherURLs = Array.from(document.querySelectorAll('.links-fields-container input[name="otherURLs[]"]'))
        .map(input => input.value)
        .filter(val => val.trim() !== "");

    // ----- Convert Form to JSON 🔹 EEO (Employment Info) -----
    const employmentModal = document.getElementById('employmentInfo');
    if (employmentModal) {
        json.employmentInfo = {};
   
        // Radios
        [
            'visaSponsorshipRequirement',
            'workAuthorization',
            'rightToWork',
            'backgroundCheck',
            'employmentRestrictions',
            'nonCompleteRestrictions',
            'securityClearance',
            'citizenshipStatus',
            'gender',
            'sexualOrientation',
            'lgbtqStatus',
            'hispanicOrLatino',
            'militaryService',
            'veteranStatus',
            'disabilityStatus'
        ].forEach(name => {
            const value = getRadioFieldValue(employmentModal, name);
            json.employmentInfo[name] = 
                typeof value === 'string'
                    ? value === 'true'
                        ? true
                        : value === 'false'
                            ? false
                            : value
                    : value;

        });
        
        const visaStatusInput = employmentModal.querySelector('input[name="visaStatus"]');
        if (visaStatusInput) json.employmentInfo.visaStatus = visaStatusInput.value;
        
        const chips = employmentModal.querySelectorAll('.multiselect-wrapper .chips-container .chip');
        if (chips.length) {
            json.employmentInfo.ethnicity = Array.from(chips).map(c => c.dataset.value);
        }
    }

	// ----- Convert Form to JSON 🔹 Address -----
    let primaryAddressIdx = 0; // default
    json.addresses = Array.from(document.querySelectorAll("#addressContainer > div")).map((div, i) => {
        if (div.dataset.primary === "true") primaryAddressIdx = i;
        return {
            addressLine1: div.querySelector("[name='addressLine1[]']")?.value || "",
            addressLine2: div.querySelector("[name='addressLine2[]']")?.value || "",
            city: div.querySelector("[name='city[]']")?.value || "",
            state: div.querySelector("[name='state[]']")?.value || "",
            country: div.querySelector("[name='country[]']")?.value || "",
            postalCode: div.querySelector("[name='postalCode[]']")?.value || ""
        };
    });
    json.primaryAddressContainerIdx = primaryAddressIdx;

	// ----- Convert Form to JSON 🔹 Work Experience -----
    json.workExperiences = Array.from(document.querySelectorAll("#workContainer > div")).map(div => ({
        jobTitle: div.querySelector("[name='jobTitle[]']").value,
        company: div.querySelector("[name='company[]']").value,
        jobLocationType: div.querySelector("[name='jobLocationType[]']").value,
        location: div.querySelector("[name='location[]']").value,
        jobType: div.querySelector("[name='jobType[]']").value,
        roleDescription: div.querySelector("[name='roleDescription[]']").value,
        startDate: div.querySelector("[name='startDate[]']").value,
        endDate: div.querySelector("[name='endDate[]']").value,
        reasonForLeaving: div.querySelector("[name='reasonForLeaving[]']")?.value || null
    }));

	// ----- Convert Form to JSON 🔹 Education -----
    json.education = Array.from(document.querySelectorAll("#educationContainer > div")).map(div => {
        return {
            school: div.querySelector("[name='school[]']")?.value || "",
            degree: getChips(div, "degree[]"),
            major: getChips(div, "major[]"),
			startDate: div.querySelector("[name='startDate[]']").value,
        	endDate: div.querySelector("[name='endDate[]']").value,
            gpa: div.querySelector("[name='gpa[]']")?.value || ""
        };
    });

    // ----- Convert Form to JSON 🔹 Resume -----
    json.resumes = [{}]; // initialize before pushing
    let primaryResumeIdx = 0; // default to first resume
    document.querySelectorAll("#resumeContainer > div").forEach((div, i) => {
		const resumeStoredPath = div.querySelector(".uploaded-resume-file")?.textContent.replace(/^Uploaded:\s*/, "") || "";
        const title = div.querySelector("[name='resumeCategory[]']")?.value.trim();
        const file = div.querySelector("[name='resume[]']")?.files?.[0] || null;

		if (title && (file || resumeStoredPath)) {

            // Read location fields safely
            const city = div.querySelector("[name='resumeCity[]']")?.value.trim() || "";
            const state = div.querySelector("[name='resumeState[]']")?.value.trim() || "";
            const country = div.querySelector("[name='resumeCountry[]']")?.value.trim() || "";

            // Build region string: City → State → Country (only if present)
            const resumeRegion = [city, state, country].filter(Boolean).join(", ");

			json.resumes[0][`resumeContainerID_${i}`] = {
				resumeCategory: title,
				resumeCountry: country,
				resumeState: state,
                resumeCity: city,
                resumeRegion: resumeRegion,
				resumeStoredPath: resumeStoredPath

				// --- Optional Params ---
				// resumeName: file ? file.name : "",
				// resumeSize: file ? file.size : "",
				// resumelastModified: file ? file.lastModified : "",
				// resumeType: file ? file.type : "",
			};

            // 🔹 Check if this resume is primary
            if (div.dataset.primary === "true") primaryResumeIdx = i;
		}
    });
    // 🔹 Persist primary resume container number
    json.primaryResumeContainerIdx = primaryResumeIdx;

    // ----- Convert Form to JSON 🔹 Projects -----
    json.projects = {};
    document.querySelectorAll("#projectsContainer > div").forEach((div, i) => {
        const title = div.querySelector(".project-title")?.value.trim();
        const filePath = div.querySelector(".uploaded-project-file")?.textContent.replace(/^Uploaded:\s*/, "") || "";
        json.projects[title] = {
            description: div.querySelector(".project-description")?.value || "",
            topics: getChips(div, "projectTopics[]"),
            file: filePath,
            url: div.querySelector(".project-url")?.value || ""
        };
    });

    // ----- Convert Form to JSON 🔹 Achievements -----
    json.achievements = {};
    document.querySelectorAll("#achievementsContainer > div").forEach((div, i) => {
        const title = div.querySelector(".achievement-title")?.value.trim();
        const filePath = div.querySelector(".uploaded-achievement-file")?.textContent.replace(/^Uploaded:\s*/, "") || "";
        json.achievements[title] = {
            description: div.querySelector(".achievement-description")?.value || "",
            file: filePath,
            url: div.querySelector(".achievement-url")?.value || ""
        };
    });

    // ----- Convert Form to JSON 🔹 Additional Info Section -----

    json.skills = getChips(document.getElementById("skillsContainer"), "skills[]");
    // json.enabledSkillsSelection = document.querySelector(`#enabledSkillsSelection`).checked;

    // json.salaryExpectation = document.getElementById("salaryRangeToggle").checked ? { min: form.salaryMin.value || null, max: form.salaryMax.value || null } : form.salaryExpectation.value || null;
    json.salaryExpectation = { min: form?.salaryExpectationMin?.value || form?.salaryExpectation?.value || null, max: form?.salaryExpectationMax?.value || form?.salaryExpectation?.value || null };

	// ----- 🔹 Converted Form -> JSON  🔹 -----
    return json; // ✅ Return parsed form data
}

// 🔹 Fetch User Data
async function loadUserData() {
    try {
        const res = await fetch("/api/user");
        if (!res.ok) throw new Error("Failed to fetch user data");
        const data = await res.json();
        // ✅ Only delegate population to script.js
        if (window.populateData) {
            window.populateData(data);
        } else {
            console.warn("populateData not available yet");
        }
    } catch (err) {
        console.error("⚠️ Error loading data:", err);
    }
}

// 🔹 Save User Data To Database
/**
 * 🔹 Save User Data To Database
 *
 * This function handles the process of saving user data, including form data and uploaded files, 
 * by sending it to the server. It performs the following steps:
 * 
 * 1. **Collect Form Data**: Retrieves all form data and converts it to a structured JSON format.
 * 2. **Data Filtering**: 
 *    - Excludes any projects or achievements with empty titles and resumes with empty categories.
 *    - Keeps track of the number of discarded projects, achievements, and resumes.
 * 3. **File Handling**: Collects any files (resumes, projects, achievements) associated with the form and appends them to a `FormData` object.
 * 4. **Data Preparation**: Appends the refined JSON data (with excluded projects/achievements) and the `discardedCounter` (tracking discarded items) to the `FormData` object.
 * 5. **Send Data to Server**: Sends the `FormData` object (containing the updated form data and files) to the server via a `POST` request.
 * 6. **Handle Server Response**: Processes the server's response, checks for success, and updates the UI accordingly.
 * 7. **Error Handling**: If the request fails or the server response is invalid, the function catches the error and updates the UI with an appropriate message.
 *
 * This function is primarily responsible for handling form data submission, ensuring that only valid data is sent to the server, and managing any associated files.
 * 
 * @param {Event} e - The submit event triggered when the user submits the form.
 */
async function saveUserData(e) {
	
    e.preventDefault();

    // ----- Save User Data To Database 🔹 Get Form Data (in JSON) -> Perform filtering while maintaining counter -> Wrap updated JSON into FormData (Object) -> attach all relevant files with index impled attribute (for tracking) to the formData -> Pass 'JSON' and 'counter for synchronicity' to the server -----

    // ----- Convert Form to JSON
    const json = formToJSON(e.target); // Get the full form data as JSON

    // Initialize discarded counters for both projects and achievements
    const discardedCounter = {
        projects: 0,
        achievements: 0
    };

    // ----- Refine Projects Data: Exclude Projects with Empty Titles -----
    const refinedProjects = {};
    Object.keys(json.projects).forEach((title) => {
        if (title.trim()) {
            refinedProjects[title] = json.projects[title];
        } else {
            discardedCounter.projects++; // Increment discarded counter for projects
        }
    });
    json.projects = refinedProjects; // Assign refined projects back to json

    // ----- Refine Achievements Data: Exclude Achievements with Empty Titles -----
    const refinedAchievements = {};
    Object.keys(json.achievements).forEach((title) => {
        if (title.trim()) {
            refinedAchievements[title] = json.achievements[title];
        } else {
            discardedCounter.achievements++; // Increment discarded counter for achievements
        }
    });
    json.achievements = refinedAchievements; // Assign refined achievements back to json

    // ----- Convert to FormData -----
    const formData = new FormData();
    formData.append("data", JSON.stringify(json)); // Add refined JSON data to FormData

    // Add the discardedCounter to formData (stringify it)
    formData.append("discardedCounter", JSON.stringify(discardedCounter));

	// Attach resume files
	document.querySelectorAll("#resumeContainer > div").forEach((div, i) => {
        const title = div.querySelector("[name='resumeCategory[]']")?.value.trim();
		const file = div.querySelector("[name='resume[]']")?.files?.[0];
		if (title && file) {
			formData.append(`resumeContainerID_${i}`, file); // 👈 attaches the file to the FormData
		}
	});

    // Attach project files
    document.querySelectorAll("#projectsContainer > div").forEach((div, i) => {
        const title = div.querySelector(".project-title")?.value.trim();
        const file = div.querySelector(".project-file")?.files?.[0];
        if (title && file) formData.append(`projectContainerID_${i}`, file);
    });

    // Attach achievement files
    document.querySelectorAll("#achievementsContainer > div").forEach((div, i) => {
        const title = div.querySelector(".achievement-title")?.value.trim();
        const file = div.querySelector(".achievement-file")?.files?.[0];
        if (title && file) formData.append(`achievementContainerID_${i}`, file);
    });

	// ----- Save User Data To Database 🔹 Send Data To Server -----
	let result;
    try {
        const res = await fetch("/api/user-with-files", {
            method: "POST",
            body: formData,
        });

        // 🩵 FIX: check if the response is JSON or HTML
        const text = await res.text();
        try {
            result = JSON.parse(text);
        } catch (parseErr) {
            console.error("⚠️ Server returned HTML instead of JSON:", text.substring(0, 200));
            throw new Error("Invalid JSON response from server");
        }
        if (!res.ok || !result.success) throw new Error(result.error || result.message || "Server error");
        console.log("✅ Data saved", (( { success, message } ) => ({ success, message }))(result));
        // alert("Data saved successfully!");

		// Update UI After Submitting the Form
		window.updateUIAfterSubmit(result);

    } catch (err) {
        console.error("⚠️ Error saving data:", err);
        // alert("Failed to save data.");
		window.updateUIAfterSubmit(result || { success: false, message: err});
    }
}

// 🔹 Upload Resume
async function uploadResume(file) {
    const formData = new FormData();
    formData.append("resume", file);

    const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
    });

    const result = await res.json();
    if (result.ok) {
        alert("Resume uploaded successfully!");
        console.log("📁 Uploaded:", result.path);
    } else {
        alert("Failed to upload file");
    }
}

// 🔹 Initialize
document.addEventListener("DOMContentLoaded", () => {
    loadUserData();
    const form = document.querySelector("form");
    if (form) {
        form.addEventListener("submit", saveUserData);
    }
    const resumeInput = document.querySelector("[name='resume']");
    if (resumeInput) {
        resumeInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) uploadResume(file);
        });
    }
});