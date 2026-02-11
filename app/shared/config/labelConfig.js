import { FIELD_TYPE, FIELD_TYPE_SELECTION } from '../../modules/form/formUtils.js';
import { DB_KEY_MAP } from './config.js';
import { resolveAnswerValue } from '../utils/utility.js';


// Used for creating embeddings before extension initialization.

// Runtime label filters
export const STOP_WORDS = new Set([
  'please',
  'enter',
  'your',
  'the',
  'a',
  'an',
  'of',
  'to',
  'for'
]);

export const LABEL_BLACKLIST = [
  /^i agree/i,
  /^terms/i,
  /^privacy/i,
  /^captcha/i,
  /^submit/i,
  /^search/i,
  /^filter/i
];


/**
 * @typedef {[string, number]} FieldLabel
 */

/**
 * @callback FieldValueResolver
 * @param {Object} question
 * @param {Object} db
 * @returns {*}
 */

/**
 * @callback FieldHintResolver
 * @param {Object} question
 * @param {Object} db
 * @returns {string}
 */

/**
 * @typedef {Object} LabelDefinition
 * @property {string[]} type
 * @property {string | undefined} dbAnswerKey
 * @property {FieldValueResolver | undefined} value
 * @property {FieldHintResolver | undefined} hint
 * @property {FieldLabel[]} labels
 */

/**
 * @typedef {Object.<string, LabelDefinition>} LabelDefinitions
 */
export const LABEL_DEFINITIONS = {

	// AUTH RELATED

	EMAIL: {
		type: [FIELD_TYPE.TEXT, FIELD_TYPE.EMAIL],
		dbAnswerKey: DB_KEY_MAP.EMAIL,
		value: undefined,
		hint: undefined,
		labels: [
			['Email', 85],
			['Email address', 85],
			['Primary email', 85],
			['Contact email', 85],
			['Personal email', 85],
			['Work email', 85],
			['Enter your email address', 85],
			['User ID', 85],
    		['Login ID', 85],
		]
	},

	CONFIRM_EMAIL_ADDRESS: {
		type: [FIELD_TYPE.TEXT, FIELD_TYPE.EMAIL],
		dbAnswerKey: DB_KEY_MAP.EMAIL,
		value: undefined,
		hint: undefined,
		labels: [
			['Confirm email', 85],
			['Re-enter your email address', 85],
			['Confirm your email', 85],
			['Verify your email address', 85]
		]
	},

	USERNAME: {
		type: [FIELD_TYPE.TEXT],
		dbAnswerKey: DB_KEY_MAP.USERNAME,
		value: undefined,
		hint: undefined,
		labels: [
			['Username', 85],
			['Create a username', 85],
			['Account username', 85]
		]
	},

	PASSWORD: {
		type: [FIELD_TYPE.PASSWORD],
		dbAnswerKey: DB_KEY_MAP.PASSWORD,
		value: undefined,
		hint: undefined,
		labels: [
			['Password', 85],
			['Create a password', 85],
			['Choose a password', 85],
			['Set your password', 85],
			['Account password', 85]
		]
	},

	CONFIRM_PASSWORD: {
		type: [FIELD_TYPE.PASSWORD],
		dbAnswerKey: DB_KEY_MAP.PASSWORD,
		value: undefined,
		hint: undefined,
		labels: [
			['Confirm password', 85],
			['Re-enter your password', 85],
			['Verify your password', 85],
			['Confirm your account password', 85]
		]
	},


	// BASIC PERSONAL INFO

	FIRST_NAME: {
		type: [FIELD_TYPE.TEXT],
		dbAnswerKey: DB_KEY_MAP.FIRST_NAME,
		value: undefined,
		hint: undefined,
		labels: [
			['First name', 85],
			['Given name', 85],
			['Legal first name', 85],
			['Your first name', 85],
			['Enter your first name', 85]
		]
	},

	LAST_NAME: {
		type: [FIELD_TYPE.TEXT],
		dbAnswerKey: DB_KEY_MAP.LAST_NAME,
		value: undefined,
		hint: undefined,
		labels: [
			['Last name', 85],
			['Family name', 85],
			['Surname', 85],
			['Legal last name', 85],
			['Enter your last name', 85]
		]
	},

	FULL_NAME: {
		type: [FIELD_TYPE.TEXT],
		dbAnswerKey: undefined,
		value: (question, db) => {
			const first = (db[DB_KEY_MAP.FIRST_NAME] || "").trim();
			const last = (db[DB_KEY_MAP.LAST_NAME] || "").trim();
			if (!first && !last) return null;
			if (!first) return last;
			if (!last) return first;
			return `${first} ${last}`;
		},
		hint: undefined,
		labels: [
			['Full name', 85],
			['Legal name', 85],
			['Signature', 85],
			['Your full name', 85],
			['Applicant name', 85],
			['Name (First and Last)', 85],
		]
	},

	PREFERRED_NAME: {
		type: [FIELD_TYPE.TEXT],
		dbAnswerKey: DB_KEY_MAP.PREFERRED_NAME,
		value: undefined,
		hint: undefined,
		labels: [
			['Preferred name', 85],
			['Preferred first name', 85],
			['Name you prefer to be called', 85],
			['Preferred name (if different)', 85],
		]
	},

	PHONE_NUMBER: {
		type: [FIELD_TYPE.TEL, FIELD_TYPE.TEXT],
		dbAnswerKey: DB_KEY_MAP.PHONE_NUMBER,
		value: (question, db) => {
			const raw = resolveAnswerValue(db, DB_KEY_MAP.PHONE_NUMBER);
			if (!raw) return null;

			// 1️⃣ Normalize input
			let input = String(raw).trim();

			// 2️⃣ Remove common extensions
			input = input.replace(
				/(\s*(ext|extension|x|#|;)\s*\d+)$/i,
				''
			);

			// 3️⃣ Remove all non-digit characters
			let digits = input.replace(/\D/g, '');
			if (!digits) return null;

			// 4️⃣ Remove international call prefixes
			if (digits.startsWith('011')) {
				digits = digits.slice(3);
			} else if (digits.startsWith('00')) {
				digits = digits.slice(2);
			}

			// Inline national number validator (conservative)
			const isValidNationalNumber = (num) => {
				if (!/^\d+$/.test(num)) return false;

				const VALID_LENGTHS = [8, 9, 10];
				if (!VALID_LENGTHS.includes(num.length)) return false;

				if (/^(\d)\1+$/.test(num)) return false;

				if (num.length === 10 && num.startsWith('0')) return false;

				return true;
			};

			// 5️⃣ If already valid, return
			if (isValidNationalNumber(digits)) {
				return digits;
			}

			// 6️⃣ Try stripping country code (1–3 digits)
			for (let ccLen = 1; ccLen <= 3; ccLen++) {
				const national = digits.slice(ccLen);
				if (isValidNationalNumber(national)) {
					return national;
				}
			}

			return null;
		},
		hint: undefined,
		labels: [
			['Phone number', 85],
			['Primary phone', 85],
			['Mobile number', 85],
			['Contact number', 85],
			['Best phone number', 85],
			['Daytime phone', 85]
		]
	},

	ADDRESS_LINE_1: {
		type: [FIELD_TYPE.TEXT],
		dbAnswerKey: DB_KEY_MAP.ADDRESS_LINE_1,
		value: undefined,
		hint: undefined,
		labels: [
			['Address line 1', 85],
			['Street address', 85],
			['Primary address', 85],
			['Home address', 85],
			['Mailing address', 85]
		]
	},

	ADDRESS_LINE_2: {
		type: [FIELD_TYPE.TEXT],
		dbAnswerKey: DB_KEY_MAP.ADDRESS_LINE_2,
		value: undefined,
		hint: undefined,
		labels: [
			['Address line 2', 85],
			['Apartment/Suite', 85],
			['Apt, Suite, or Unit', 85],
			['Secondary address', 85],
			['Building/Apartment number', 85]
		]
	},

	CITY: {
		type: [FIELD_TYPE.TEXT, FIELD_TYPE.DROPDOWN],
		dbAnswerKey: DB_KEY_MAP.CITY,
		value: undefined,
		hint: undefined,
		labels: [
			['City', 85],
			['Town/City', 85],
			['Municipality', 85],
			['Your city', 85]
		]
	},

	STATE: {
		type: [FIELD_TYPE.TEXT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.SELECT],
		dbAnswerKey: DB_KEY_MAP.STATE,
		value: undefined,
		hint: undefined,
		labels: [
			['State', 85],
			['State/Province', 85],
			['Province', 85],
			['Region', 85]
		]
	},

	COUNTRY: {
		type: [FIELD_TYPE.TEXT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.SELECT],
		dbAnswerKey: DB_KEY_MAP.COUNTRY,
		value: undefined,
		hint: undefined,
		labels: [
			['Country', 85],
			['Country of residence', 85],
			['Current country', 85],
			['Select your country', 85]
		]
	},

	POSTAL_CODE: {
		type: [FIELD_TYPE.TEXT, FIELD_TYPE.NUMBER],
		dbAnswerKey: DB_KEY_MAP.POSTAL_CODE,
		value: undefined,
		hint: undefined,
		labels: [
			['Postal code', 85],
			['ZIP code', 85],
			['ZIP/Postal code', 85],
			['Postcode', 85],
			['Mailing code', 85]
		]
	},



	// WORK EXPERIENCE RELATED

	CURRENT_OR_MOST_RECENT_JOB_TITLE: {
		type: [FIELD_TYPE.TEXT],
		dbAnswerKey: undefined,
		value: (question, db) => {
			const experiences = db[DB_KEY_MAP.WORK_EXPERIENCES] || [];
			if (!experiences.length) return null;

			// Find the most recent by startDate (descending)
			const mostRecent = experiences.reduce((latest, current) => {
				if (!latest) return current;
				return new Date(current.startDate) > new Date(latest.startDate) ? current : latest;
			}, null);

			return (mostRecent.jobTitle || "").trim() || null;
		},
		hint: (question, db) => {
			const experiences = db[DB_KEY_MAP.WORK_EXPERIENCES] || [];
			if (!experiences.length) { 
				return (question?.required) ? "Answer the most relevant job title as per my profile, or from the role description of the position." : null;
			};

			// Find the most recent by startDate (descending)
			const mostRecent = experiences.reduce((latest, current) => {
				if (!latest) return current;
				return new Date(current.startDate) > new Date(latest.startDate) ? current : latest;
			}, null);

			if (question?.required) {
				return (mostRecent.jobTitle || "").trim() || "Answer the most relevant job title as per my profile, or from the role description of the position.";
			}
			return (mostRecent.jobTitle || "").trim() || null;
		},
		labels: [
			['What is your current job title?', 85],
			['What is your most recent job title?', 85],
			['Please enter your current position.', 85],
			['What is your present job title?', 85],
			['Job Title', 85],
			['Current Position', 85]
		]
	},

	PREVIOUS_JOB_TITLE: {
		type: [FIELD_TYPE.TEXT],
		dbAnswerKey: undefined,
		value: (question, db) => {
			const experiences = db[DB_KEY_MAP.WORK_EXPERIENCES] || [];
			if (!experiences.length) return null;

			// Find the most recent by startDate (descending)
			const mostRecent = experiences.reduce((latest, current) => {
				if (!latest) return current;
				return new Date(current.startDate) > new Date(latest.startDate) ? current : latest;
			}, null);

			return (mostRecent.jobTitle || "").trim() || null;
		},
		hint: (question, db) => {
			const experiences = db[DB_KEY_MAP.WORK_EXPERIENCES] || [];
			if (!experiences.length) { 
				return (question?.required) ? "Answer the most relevant job title as per my profile, or from the role description of the position." : null;
			};

			// Find the most recent by startDate (descending)
			const mostRecent = experiences.reduce((latest, current) => {
				if (!latest) return current;
				return new Date(current.startDate) > new Date(latest.startDate) ? current : latest;
			}, null);

			if (question?.required) {
				return (mostRecent.jobTitle || "").trim() || "Answer the most relevant job title as per my profile, or from the role description of the position.";
			}
			return (mostRecent.jobTitle || "").trim() || null;
		},
		labels: [
			['What was your previous job title?', 85],
			['Please enter your prior job title.', 85],
			['Most recent job title (previous employer)', 85],
			['Last held position', 85]
		]
	},

	COMPANY_NAME_CURRENT_OR_PREVIOUS: {
		type: [FIELD_TYPE.TEXT],
		dbAnswerKey: undefined,
		value: (question, db) => {
			const experiences = db[DB_KEY_MAP.WORK_EXPERIENCES] || [];
			if (!experiences.length) return null;

			// Find the most recent by startDate
			const mostRecent = experiences.reduce((latest, current) => {
				if (!latest) return current;
				return new Date(current.startDate) > new Date(latest.startDate) ? current : latest;
			}, null);

			return (mostRecent.company || "").trim() || null;
		},
		hint: (question, db) => {
			const experiences = db[DB_KEY_MAP.WORK_EXPERIENCES] || [];
			if (!experiences.length) {
				return (question?.required) ? "Answer a company most relevant to the position, or job role description." : null;
			}

			// Find the most recent by startDate
			const mostRecent = experiences.reduce((latest, current) => {
				if (!latest) return current;
				return new Date(current.startDate) > new Date(latest.startDate) ? current : latest;
			}, null);

			if (question?.required) {
				return (mostRecent.company || "").trim() || "Answer a company most relevant to the position, or job role description.";
			}
			return (mostRecent.company || "").trim() || null;
		},
		labels: [
			['What is your current employer?', 85],
			['What company do you currently work for?', 85],
			['Name of your current company.', 85],
			['Most recent employer', 85],
			['Previous employer name', 85],
			['Company name (previous role)', 85]
		]
	},

	YEARS_OF_EXPERIENCE_TOTAL: {
		type: [FIELD_TYPE.NUMBER, FIELD_TYPE.TEXT],
		dbAnswerKey: undefined,
		value: (question, db) => {
			const experiences = db[DB_KEY_MAP.WORK_EXPERIENCES] || [];
			if (!experiences.length) return 0;

			const totalMs = experiences.reduce((sum, job) => {
				const start = job.startDate ? new Date(job.startDate) : null;
				const end = job.endDate ? new Date(job.endDate) : new Date(); // ongoing job = current date
				if (!start) return sum; // skip if startDate missing
				return sum + (end - start);
			}, 0);

			const totalYears = totalMs / (1000 * 60 * 60 * 24 * 365.25); // convert ms → years
			return Math.round(totalYears * 10) / 10; // round to 1 decimal place
		},
		hint: (question, db) => {
			const experiences = db[DB_KEY_MAP.WORK_EXPERIENCES] || [];
			const totalMs = experiences.reduce((sum, job) => {
				const start = job.startDate ? new Date(job.startDate) : null;
				const end = job.endDate ? new Date(job.endDate) : new Date();
				if (!start) return sum;
				return sum + (end - start);
			}, 0);
			const totalYears = totalMs / (1000 * 60 * 60 * 24 * 365.25);
			const rounded = Math.round(totalYears * 10) / 10;

			// Construct a single sentence with instructions if missing info
			if (!experiences.length) {
				return "No work experience found; infer total professional experience from the job role description and provide an appropriate value, leaning towards the upper bound if uncertain.";
			}

			return `Calculated total professional experience: ${rounded} years; if the job description specifies a required level, adjust accordingly to meet expected experience.`;
		},
		labels: [
			['How many years of experience do you have?', 85],
			['What is your total professional experience?', 85],
			['Total years of work experience', 85],
			['How many years have you been working?', 85]
		]
	},

	YEARS_OF_RELEVANT_EXPERIENCE: {
		type: [FIELD_TYPE.NUMBER, FIELD_TYPE.TEXT],
		dbAnswerKey: undefined,
		value: (question, db) => {
			const experiences = db[DB_KEY_MAP.WORK_EXPERIENCES] || [];
			if (!experiences.length) return 0;

			const totalMs = experiences.reduce((sum, job) => {
				const start = job.startDate ? new Date(job.startDate) : null;
				const end = job.endDate ? new Date(job.endDate) : new Date(); // ongoing job = current date
				if (!start) return sum; // skip if startDate missing
				return sum + (end - start);
			}, 0);

			const totalYears = totalMs / (1000 * 60 * 60 * 24 * 365.25); // convert ms → years
			return Math.round(totalYears * 10) / 10; // round to 1 decimal place
		},
		hint: (question, db) => {
			const experiences = db[DB_KEY_MAP.WORK_EXPERIENCES] || [];
			const totalMs = experiences.reduce((sum, job) => {
				const start = job.startDate ? new Date(job.startDate) : null;
				const end = job.endDate ? new Date(job.endDate) : new Date();
				if (!start) return sum;
				// optionally: filter relevant roles if domain info available
				return sum + (end - start);
			}, 0);
			const totalYears = totalMs / (1000 * 60 * 60 * 24 * 365.25);
			const rounded = Math.round(totalYears * 10) / 10;

			if (!experiences.length) {
				return "No relevant work experience found; infer expected years of relevant experience from the job description and provide a value, considering the upper side if uncertain.";
			}

			return `Calculated relevant experience: ${rounded} years; adjust based on role requirements if domain-specific experience is emphasized in the job description.`;
		},
		labels: [
			['How many years of relevant experience do you have?', 85],
			['Years of experience in this field', 85],
			['Relevant work experience (years)', 85],
			['How many years have you worked in this domain?', 85]
		]
	},

	CURRENTLY_EMPLOYED: {
		type: [FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX, FIELD_TYPE.DROPDOWN, FIELD_TYPE.SELECT],
		dbAnswerKey: undefined,
		value: (question, db) => {
			const experiences = db[DB_KEY_MAP.WORK_EXPERIENCES] || [];
			if (!experiences.length) return false;

			// Find the most recent by startDate
			const mostRecent = experiences.reduce((latest, current) => {
				if (!latest) return current;
				return new Date(current.startDate) > new Date(latest.startDate) ? current : latest;
			}, null);

			// If endDate is empty or null, currently employed
			return !mostRecent.endDate;
		},
		hint: (question, db) => {
			const experiences = db[DB_KEY_MAP.WORK_EXPERIENCES] || [];
			if (!experiences.length) {
				return "I do not have any recorded work experience. You may indicate that I am not currently employed.";
			}

			const mostRecent = experiences.reduce((latest, current) => {
				if (!latest) return current;
				return new Date(current.startDate) > new Date(latest.startDate)
				? current
				: latest;
			}, null);

			return (!mostRecent.endDate)
				? "I am currently employed in my most recent role."
				: "I am not currently employed.";
		},
		labels: [
			['Are you currently employed?', 85],
			['Do you presently have a job?', 85],
			['Are you still working in this role?', 85],
			['Current employment status', 85]
		]
	},

	REASON_FOR_LEAVING: {
		type: [FIELD_TYPE.TEXT, FIELD_TYPE.TEXTAREA],
		dbAnswerKey: undefined,
		value: (question, db) => {

			// Pick latest completed job with endDate
			// Then:
			// If reasonForLeaving missing:
			// • required → "Career Growth"
			// • not required → null

			const experiences = db[DB_KEY_MAP.WORK_EXPERIENCES] || [];
			if (!experiences.length) return null;

			// Filter only completed jobs (with endDate)
			const completedJobs = experiences.filter(job => job.endDate && job.endDate.trim() !== "");
			if (!completedJobs.length) return null;

			// Find the latest completed job by endDate
			const latestCompleted = completedJobs.reduce((latest, current) => {
				if (!latest) return current;
				return new Date(current.endDate) > new Date(latest.endDate) ? current : latest;
			}, null);

			// Decide what to return
			if (latestCompleted.reasonForLeaving && latestCompleted.reasonForLeaving.trim() !== "") {
				return latestCompleted.reasonForLeaving.trim();
			} else {
				return question.required ? "Career Growth" : null;
			}
		},
		hint: (question, db) => {
			return "Use a neutral and professional reason for leaving."
		},
		labels: [
			['Why did you leave your last job?', 85],
			['Reason for leaving your previous employer', 85],
			['Why are you no longer with this company?', 85],
			['Please explain your reason for departure', 85]
		]
	},



	// EDUCATION RELATED

	SCHOOL_NAME: {
		type: [FIELD_TYPE.TEXT],
		dbAnswerKey: undefined,
		value: (question, db) => {

			// Pick the most recent education record
  			// Return its school name (identity field)

			const educationArray = db[DB_KEY_MAP.EDUCATION] || [];
			if (!educationArray.length) return null;

			// Pick the most recent education by startDate
			const mostRecent = educationArray.reduce((latest, current) => {
				if (!latest) return current;
				return new Date(current.startDate) > new Date(latest.startDate) ? current : latest;
			}, null);

			return (mostRecent.school || "").trim() || null;
		},
		hint: (question, db) => {
			const educationArray = db[DB_KEY_MAP.EDUCATION] || [];
			if (!educationArray.length) {
				return "I do not have formal education records. Infer a suitable institution name if required, based on my profile or job context.";
			}

			const mostRecent = educationArray.reduce((latest, current) => {
				if (!latest) return current;
				return new Date(current.startDate) > new Date(latest.startDate)
				? current
				: latest;
			}, null);

			return (mostRecent.school || "").trim() ||
				"The most recent institution name is unknown. Infer a reasonable or generic institution name if required by the form.";
		},
		labels: [
			['Name of your school or university', 85],
			['Educational institution', 85],
			['College/University name', 85],
			['Where did you study?', 85],
			['Institution name', 85]
		]
	},

	DEGREE_LEVEL: {
		type: [FIELD_TYPE.TEXT, FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN],
		dbAnswerKey: undefined,
		value: (question, db) => {

			// Pick the most recent education record
			// Extract degree level (handle array or string)

			const educationArray = db[DB_KEY_MAP.EDUCATION] || [];
			if (!educationArray.length) return null;

			const mostRecent = educationArray.reduce((latest, current) => {
				if (!latest) return current;
				return new Date(current.startDate) > new Date(latest.startDate) ? current : latest;
			}, null);

			// Some degrees are arrays, pick first if array
			const degree = Array.isArray(mostRecent.degree) ? mostRecent.degree[0] : mostRecent.degree;
			return (degree || "").trim() || null;
		},
		hint: (question, db) => {
			const educationArray = db[DB_KEY_MAP.EDUCATION] || [];
			if (!educationArray.length) {
				return "I do not have formal education records. Infer an appropriate degree level (e.g., Bachelor's, Master's) based on my profile or work experience.";
			}

			const mostRecent = educationArray.reduce((latest, current) => {
				if (!latest) return current;
				return new Date(current.startDate) > new Date(latest.startDate)
				? current
				: latest;
			}, null);

			// Some degrees are arrays, pick first if array
			const degree = Array.isArray(mostRecent.degree)
				? mostRecent.degree[0]
				: mostRecent.degree;

			return (degree || "").trim() ||
				"The most recent degree level is unknown. Infer an appropriate degree level based on my education history, experience, or the job requirements.";
		},
		labels: [
			['What is your highest degree?', 85],
			['Degree obtained', 85],
			['Highest level of education', 85],
			['Please select your degree level', 85],
			['What is your highest level of education?', 85],
			['What is the highest degree you have completed?', 85],
			['What is your highest academic qualification?', 85],
			['Please select your highest education level.', 85],
			['What degree do you hold?', 85]
		]
	},

	DEGREE_TITLE: {
		type: [FIELD_TYPE.TEXT, FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN],
		dbAnswerKey: undefined,
		value: (question, db) => {

			// Pick the most recent education record
			// Extract degree title (handle array or string)

			const educationArray = db[DB_KEY_MAP.EDUCATION] || [];
			if (!educationArray.length) return null;

			const mostRecent = educationArray.reduce((latest, current) => {
				if (!latest) return current;
				return new Date(current.startDate) > new Date(latest.startDate) ? current : latest;
			}, null);

			// Some degrees are arrays, pick first if array
			const degree = Array.isArray(mostRecent.degree) ? mostRecent.degree[0] : mostRecent.degree;
			return (degree || "").trim() || null;
		},
		hint: (question, db) => {
			const educationArray = db[DB_KEY_MAP.EDUCATION] || [];
			if (!educationArray.length) {
				return "I do not have formal education records. Infer a suitable degree title based on my profile, work experience, or the job description.";
			}

			const mostRecent = educationArray.reduce((latest, current) => {
				if (!latest) return current;
				return new Date(current.startDate) > new Date(latest.startDate)
				? current
				: latest;
			}, null);

			// Some degrees are arrays, pick first if array
			const degree = Array.isArray(mostRecent.degree)
				? mostRecent.degree[0]
				: mostRecent.degree;

			return (degree || "").trim() ||
				"The most recent degree title is unknown. Infer a closely related or appropriate degree title based on my education history, work experience, or the job role.";
		},
		labels: [
			['What degree did you earn?', 85],
			['Degree awarded', 85],
			['Name of your degree', 85],
		]
	},

	MAJOR_FIELD_OF_STUDY: {
		type: [FIELD_TYPE.TEXT, FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN],
		dbAnswerKey: undefined,
		value: (question, db) => {

			// Pick the most recent education record
			// Extract major field of study (handle array or string)

			const educationArray = db[DB_KEY_MAP.EDUCATION] || [];
			if (!educationArray.length) return null;

			const mostRecent = educationArray.reduce((latest, current) => {
				if (!latest) return current;
				return new Date(current.startDate) > new Date(latest.startDate) ? current : latest;
			}, null);

			// Some majors are arrays, pick first if array
			const major = Array.isArray(mostRecent.major) ? mostRecent.major[0] : mostRecent.major;
			return (major || "").trim() || null;
		},
		hint: (question, db) => {
			const educationArray = db[DB_KEY_MAP.EDUCATION] || [];
			if (!educationArray.length) return "I don't have education experience, feel free to use any relevant field of study based on my profile or job details.";

			const mostRecent = educationArray.reduce((latest, current) => {
				if (!latest) return current;
				return new Date(current.startDate) > new Date(latest.startDate) ? current : latest;
			}, null);

			// Some majors are arrays, pick first if array
			const major = Array.isArray(mostRecent.major) ? mostRecent.major[0] : mostRecent.major;
			return (major || "").trim() || "Most recent major is unknown. Infer a closely related field field of study (for the job role) based on education history, work experience, or the job role description.";
		},
		labels: [
			['What was your major?', 85],
			['Field of study', 85],
			['Major/Concentration', 85],
			['Primary area of study', 85]
		]
	},

	GRADUATION_DATE: {
		type: [FIELD_TYPE.DATE, FIELD_TYPE.TEXT],
		dbAnswerKey: undefined,
		value: (question, db) => {

			// Check first education record
			// If endDate exists → use it
			// Else:
			// • If required === false → return null
			// • If required === true → find the latest education with endDate

			const educationArray = db[DB_KEY_MAP.EDUCATION] || [];
			if (!educationArray.length) return null;

			const firstItem = educationArray[0];
			if (firstItem.endDate && firstItem.endDate.trim() !== "") {
				return firstItem.endDate.trim();
			}

			if (!question.required) return null;

			// Fallback: most recent education
			const mostRecent = educationArray.reduce((latest, current) => {
				if (!latest) return current;
				return new Date(current.startDate) > new Date(latest.startDate) ? current : latest;
			}, null);

			return (mostRecent.endDate || "").trim() || null;
		},
		hint: undefined,
		labels: [
			['What is your graduation date?', 85],
			['Graduation year', 85],
			['Date of completion', 85],
			['When did you graduate?', 85],
			['Expected graduation date', 85],
			['What year did you graduate?', 85],

		]
	},

	GPA_OR_ACADEMIC_PERFORMANCE: {
		type: [FIELD_TYPE.NUMBER, FIELD_TYPE.TEXT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.SELECT],
		dbAnswerKey: undefined,
		value: (question, db) => {

			// Check first education record
			// If gpa exists → use it
			// Else:
			// • If required === false → return null
			// • If required === true → find the latest education with gpa

			const educationArray = db[DB_KEY_MAP.EDUCATION] || [];
			if (!educationArray.length) return null;

			const firstItem = educationArray[0];
			if (firstItem.gpa && firstItem.gpa.trim() !== "") {
				return firstItem.gpa.trim();
			}

			if (!question.required) return null;

			// Fallback: most recent education
			const mostRecent = educationArray.reduce((latest, current) => {
				if (!latest) return current;
				return new Date(current.startDate) > new Date(latest.startDate) ? current : latest;
			}, null);

			return (mostRecent.gpa || "").trim() || null;
		},
		hint: undefined,
		labels: [
			['What was your GPA?', 85],
			['Please provide your GPA', 85],
			['Academic performance (GPA)', 85],
			['Cumulative GPA', 85]
		]
	},



	// PREFERENCE QUESTIONS

	SALARY_EXPECTATION: { // LLM Handles from Job Description & set expectation as fallback.
		type: [FIELD_TYPE.NUMBER, FIELD_TYPE.TEXT, FIELD_TYPE.TEXTAREA],
		dbAnswerKey: undefined,
		value: undefined,
		hint: (question, db) => {
			const salary = db[DB_KEY_MAP.SALARY_EXPECTATIONS];
			if (!salary || salary.min == null || salary.max == null) {
				return "If the job description specifies a salary or range, use that value; otherwise infer a reasonable market-aligned compensation based on role seniority and location.";
			}

			const min = Number(salary.min);
			const max = Number(salary.max);

			if (Number.isNaN(min) || Number.isNaN(max)) {
				return "If the job description specifies a salary or range, use that value; otherwise infer a reasonable market-aligned compensation based on role seniority and location.";
			}

			// Static expectation
			if (min === max) {
				return `Preferred salary is ${min}; if the job description provides a different compensation range, align with it by adjusting up or down as appropriate, otherwise use this value as a fallback.`;
			}

			// Range expectation
			return `Preferred salary range is ${min}–${max}; if the job description specifies a compensation range, prioritize that and adjust this range accordingly, otherwise use this range as the fallback expectation.`;
		},
		labels: [
			['What are your salary expectations?', 85],
			['What is your expected salary?', 85],
			['What salary range are you targeting?', 85],
			['What is your desired salary compensation?', 85],
			['What is your desired Annual Salary?', 85],
			['What are your compensation expectations?', 85],
			['Please provide your expected annual salary.', 85]
		]
	},

	RELOCATION_PREFERENCE: {
		type: [FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX, FIELD_TYPE.DROPDOWN, FIELD_TYPE.SELECT],
		dbAnswerKey: DB_KEY_MAP.RELOCATION_PREFERENCE,
		value: undefined,
		hint: (question, db) => {
			const pref = db[DB_KEY_MAP.RELOCATION_PREFERENCE];
			if (pref === true) {
				return "I am open to relocating if the role requires a different location.";
			}
			if (pref === false) {
				return "I am not willing to relocate and prefer roles that align with my current location or remote options.";
			}
			return "If the role requires relocation, indicate openness based on the job location and work arrangement described. If not explicitly mentioned, answer like I am open to relocating as fallback.";
		},
		labels: [
			['Are you willing to relocate?', 85],
			['Are you open to relocation?', 85],
			['Would you consider relocating for this role?', 85],
			['Are you willing to move for this position?', 85],
			['Would you be open to working in a different location?', 85],
			['Are you flexible regarding your work location?', 85],
			['Would you be willing to relocate if required?', 85],
			['Are you able to work on-site?', 85],
			['Are you comfortable working from this location?', 85],
			['Are you willing to work from the office?', 85],
			['Are you able to work in-person?', 85],
			['Would you be open to hybrid work?', 85]
		]
	},

	RELOCATION_SUPPORT: {
		type: [FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX, FIELD_TYPE.DROPDOWN, FIELD_TYPE.SELECT],
		dbAnswerKey: DB_KEY_MAP.RELOCATION_SUPPORT,
		value: undefined,
		hint: (question, db) => {
			const support = db[DB_KEY_MAP.RELOCATION_SUPPORT];
			if (support === true) {
				return "I would require employer-provided relocation assistance if relocation is necessary for this role.";
			}
			if (support === false) {
				return "I am willing to relocate at my own expense and do not require relocation support.";
			}
			return "I am willing to relocate at my own expense and do not require relocation support.";
		},
		labels: [
			['Is relocation assistance required?', 85],
			['Will you need relocation support?', 85],
			['Would you require relocation reimbursement?', 85],
			['Do you expect relocation benefits?', 85],
			['Will you need help with relocation expenses?', 85],
			['Are you seeking relocation assistance?', 85],
			['Would relocation support influence your decision?', 85],
			['Do you require employer-sponsored relocation?', 85]
		]
	},

	REASONABLE_ACCOMMODATION: {
		type: [FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX, FIELD_TYPE.DROPDOWN, FIELD_TYPE.SELECT],
		dbAnswerKey: DB_KEY_MAP.ACCOMODATION_SUPPORT,
		value: undefined,
		hint: (question, db) => {
			const accommodation = db[DB_KEY_MAP.ACCOMODATION_SUPPORT];
			if (accommodation === true) {
				return "I require reasonable accommodation to perform essential job functions.";
			}
			if (accommodation === false) {
				return "I do not require any workplace accommodations support/assistance to perform this role.";
			}
			return "I do not require any workplace accommodations support/assistance to perform this role.";
		},
		labels: [
			['Do you require reasonable accommodation?', 85],
			['Will you need any workplace accommodations?', 85],
			['Do you need accommodation to perform job duties?', 85],
			['Please indicate if you require accommodation.', 85],
			['Do you need any assistance to perform essential job functions?', 85]
		]
	},

	REMOTE_WORK_PREFERENCE: {
		type: [FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX, FIELD_TYPE.DROPDOWN, FIELD_TYPE.SELECT],
		dbAnswerKey: DB_KEY_MAP.REMOTE_WORK_PREFERENCE,
		value: undefined,
		hint: (question, db) => {
			const remote = db[DB_KEY_MAP.REMOTE_WORK_PREFERENCE];
			if (remote === true) {
				return "I am open to or prefer remote or hybrid work arrangements for this role.";
			}
			if (remote === false) {
				return "I am comfortable working on-site and do not require a remote work option.";
			}
			return "Select the work arrangement that best aligns with the role’s remote, hybrid, or on-site expectations.";
		},
		labels: [
			['Are you able to work remotely?', 85],
			['Are you open to remote work?', 85],
			['Is this role suitable for remote work for you?', 85],
			['Are you willing to work from home?', 85],
			['Can you perform this role remotely?', 85],
			['Do you prefer remote, hybrid, or on-site work?', 85],
			['Would you consider a fully remote position?', 85]
		]
	},

	TRAVEL_REQUIREMENTS: {
		type: [FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX, FIELD_TYPE.DROPDOWN, FIELD_TYPE.SELECT],
		dbAnswerKey: undefined,
		value: undefined,
		hint: (question, db) => {
			return "Indicate high flexibility for travel (including frequent, domestic, and international travel if available). Select the most open or highest travel option to maximize role eligibility unless the job explicitly restricts travel.";
		},
		labels: [
			['Are you willing to travel for this position?', 85],
			['Are you able to travel for work?', 85],
			['What percentage of travel are you comfortable with?', 85],
			['Are you open to domestic travel?', 85],
			['Are you open to international travel?', 85],
		]
	},

	START_DATE_AVAILABILITY: {
		type: [FIELD_TYPE.DATE, FIELD_TYPE.TEXT],
		dbAnswerKey: 'today.date',
		value: undefined,
		hint: undefined,
		labels: [
			['When can you start?', 85],
			['What is your earliest available start date?', 85],
			['Are you available to start immediately?', 85],
			['How soon can you begin working?', 85],
			['Do you have any constraints on your start date?', 85],
			['What notice period do you require?', 85],
			['When would you be available to begin employment?', 85]
		]
	},

	SHIFT_AVAILABILITY: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.TEXT],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return true;
		},
		hint: (question, db) => {
			return "Indicate broad schedule flexibility, including evenings, weekends, rotating shifts, and occasional overtime, unless the role explicitly restricts working hours.";
		},
		labels: [
			['Are you willing to work evenings or weekends?', 85],
			['Are you available for night shifts?', 85],
			['Are you willing to work rotating shifts?', 85],
			['Do you have any restrictions on your work schedule?', 85],
			['Are you available to work overtime if required?', 85]
		]
	},

	WORK_SCHEDULE_PREFERENCE: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.TEXT, FIELD_TYPE.TEXTAREA],
		dbAnswerKey: undefined,
		value: undefined,
		hint: (question, db) => {
			return "Select full-time availability as the primary preference and indicate openness to contract, temporary, or alternative arrangements if offered, to maximize role eligibility.";
		},
		labels: [
			['Are you looking for full-time or part-time work?', 85],
			['What type of employment are you seeking?', 85],
			['Are you available for full-time work?', 85],
			['Are you available for part-time work?', 85],
			['Are you open to contract employment?', 85],
			['Are you open to temporary work?', 85]
		]
	},


	// LEGALITIES QUESTION (covered in EEO)

	VISA_SPONSORSHIP_REQUIREMENT: {
		type: [FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX, FIELD_TYPE.DROPDOWN, FIELD_TYPE.SELECT],
		dbAnswerKey: DB_KEY_MAP.VISA_SPONSORSHIP_REQUIREMENT,
		value: (question, db) => {
			return resolveAnswerValue(db, DB_KEY_MAP.VISA_SPONSORSHIP_REQUIREMENT) ?? false;
		},
		hint: (question, db) => {
			const requiresSponsorship = resolveAnswerValue(db, DB_KEY_MAP.VISA_SPONSORSHIP_REQUIREMENT);

			if (requiresSponsorship === true) {
				return "Visa sponsorship is required now or in the future; answer consistently with the current and expected immigration status.";
			}

			if (requiresSponsorship === false) {
				return "Visa sponsorship is not required now or in the future and that you are authorized to work without employer sponsorship.";
			}

			return "Visa sponsorship is not required now or in the future and that you are authorized to work without employer sponsorship.";
		},
		labels: [
			['Will you now or in the future require visa sponsorship?', 85],
			['Will you require visa sponsorship now or in the future?', 85],
			['Will you need visa sponsorship for employment?', 85],
			['Will you need visa or employment sponsorship to work here?', 85],
			['Do you now or in the future require sponsorship for employment visa status?', 85],
			['Do you require employment visa sponsorship?', 85],
			['Will you need the company to sponsor you for work employment?', 85],
			['Will you require employer sponsorship to work legally?', 85],
			['Will you need our organization to sponsor your visa?', 85],
			['Will you need immigration sponsorship to work in this role?', 85]
		]
	},

	VISA_SPONSORSHIP_REQUIREMENT_NEGATIVES: {
		type: [FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX, FIELD_TYPE.DROPDOWN, FIELD_TYPE.SELECT],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return !(resolveAnswerValue(db, DB_KEY_MAP.VISA_SPONSORSHIP_REQUIREMENT) ?? false);
		},
		hint: (question, db) => {
			const requiresSponsorship = resolveAnswerValue(db, DB_KEY_MAP.VISA_SPONSORSHIP_REQUIREMENT);

			if (requiresSponsorship === true) {
				return "I'm not authorized to work without employer sponsorship, as visa sponsorship is required.";
			}

			if (requiresSponsorship === false) {
				return "I'm authorized to work without employer or visa sponsorship, including both now and in the future.";
			}

			return "I'm authorized to work without employer or visa sponsorship, including both now and in the future.";
		},
		labels: [
			['Are you authorized to work in this country without employer sponsorship?', 85],
			['Are you authorized to work without requiring visa sponsorship?', 85],
			['Are you or will you be able to work without visa sponsorship?', 85],
			['Are you eligible to work without any need of employer or visa sponsorship?', 85],
			['Do you have independent work authorization (no sponsorship required)?', 85],
			['Do you currently have work authorization that does not require sponsorship?', 85],
			['Will you be able to work without company sponsorship?', 85]
		]
	},

	VISA_STATUS: {
		type: [FIELD_TYPE.TEXT, FIELD_TYPE.TEXTAREA, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX, FIELD_TYPE.DROPDOWN, FIELD_TYPE.SELECT],
		dbAnswerKey: DB_KEY_MAP.VISA_STATUS,
		value: undefined,
		hint: (question, db) => {
			const visaStatus = resolveAnswerValue(db, DB_KEY_MAP.VISA_STATUS);

			if (typeof visaStatus === "string" && visaStatus.trim() !== "") {
				return `My current immigration or visa status is "${visaStatus.trim()}".`;
			}

			return "Give answer that best maximizes hiring eligibility and is most commonly accepted, unless the role explicitly requires a specific visa category.";
		},
		labels: [
			['What is your current visa status?', 85],
			['What type of visa do you hold?', 85],
			['Please select your visa category.', 85],
			['What immigration status do you currently hold?', 85],
			['Please indicate your current work visa.', 85],
			['What is your current work authorization?', 85],
			['What is your present immigration status?', 85],
			['What is your current non-immigrant status?', 85]
		]
	},

	WORK_AUTHORIZATION: {
		type: [FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX, FIELD_TYPE.DROPDOWN, FIELD_TYPE.SELECT],
		dbAnswerKey: DB_KEY_MAP.WORK_AUTHORIZATION,
		value: (question, db) => {
			return resolveAnswerValue(db, DB_KEY_MAP.WORK_AUTHORIZATION) ?? true;
		},
		hint: (question, db) => {
			const authorized = resolveAnswerValue(db, DB_KEY_MAP.WORK_AUTHORIZATION);

			if (authorized === true) {
				return "I'm legally authorized to work in this country, consistent with my current immigration or employment authorization status.";
			}

			if (authorized === false) {
				return "I'm not currently authorized to work in this country without additional authorization or sponsorship.";
			}

			return "I'm legally authorized to work in this country, consistent with my current immigration or employment authorization status.";
		},
		labels: [
			['Are you legally authorized to work in the United States?', 85],
			['Are you legally authorized to work in this country?', 85],
			['Are you currently authorized to work in the U.S.?', 85],
			["Are you authorized to work in the country you're applying?", 85],
			['Do you have work authorization?', 85],
			['Are you eligible to work in this country?', 85],
			['Do you have unrestricted work authorization?', 85],
			['Are you authorized to work without restrictions?', 85],
			['Do you have long-term work authorization?', 85],
			['Are you legally permitted to work here?', 85],
			['Do you have valid work authorization for this role?', 85]
		]
	},

	RIGHT_TO_WORK: {
		type: [FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX, FIELD_TYPE.DROPDOWN, FIELD_TYPE.SELECT],
		dbAnswerKey: DB_KEY_MAP.RIGHT_TO_WORK,
		value: (question, db) => {
			return resolveAnswerValue(db, DB_KEY_MAP.RIGHT_TO_WORK) ?? true;
		},
		hint: (question, db) => {
			const rightToWork = resolveAnswerValue(db, DB_KEY_MAP.RIGHT_TO_WORK);

			if (rightToWork === true) {
				return "I meet legal employment eligibility requirements and can provide valid documentation to verify my right to work.";
			}

			if (rightToWork === false) {
				return "I may not currently meet all legal requirements to verify employment eligibility.";
			}

			return "I meet legal employment eligibility requirements and can provide valid documentation to verify my right to work.";
		},
		labels: [
			['Do you meet the legal requirements to work?', 85],
			['Are you legally eligible for employment?', 85],
			['Can you provide proof of work authorization?', 85],
			['Will you be able to provide employment eligibility documentation?', 85],
			['Are you compliant with employment eligibility requirements?', 85],
			['Can you present documentation verifying your right to work?', 85],
			['Will you be able to verify your legal right to work?', 85],
			['Can you submit Form I-9 documentation?', 85],
			['Are you able to satisfy employment eligibility verification?', 85]
		]
	},

	RIGHT_TO_WORK_NEGATIVE: {
		type: [FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX, FIELD_TYPE.DROPDOWN, FIELD_TYPE.SELECT],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return !(resolveAnswerValue(db, DB_KEY_MAP.RIGHT_TO_WORK) ?? true);
		},
		hint: (question, db) => {
			const rightToWork = resolveAnswerValue(db, DB_KEY_MAP.RIGHT_TO_WORK);

			if (rightToWork === true) {
				return "There are no legal restrictions preventing me from working in this country.";
			}

			if (rightToWork === false) {
				return "There may be legal or regulatory limitations affecting my ability to work.";
			}

			return "There are no legal restrictions preventing me from working in this country.";
		},
		labels: [
			['Is there anything that could prevent you from working in this country?', 85],
			['Are there any legal restrictions that would prevent your employment?', 85],
			['Are there any limitations on your ability to work?', 85]
		]
	},

	LEGAL_WORKING_AGE: {
		type: [FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX, FIELD_TYPE.DROPDOWN, FIELD_TYPE.SELECT],
		dbAnswerKey: undefined,
		value: (question, db, minimumAge = 18) => {

			// Ensure question type.
			const rawLabelText = question?.label?.textContent ?? '';
			if (!rawLabelText || !(rawLabelText.includes(minimumAge))) return null;

			const birthDateStr = db[DB_KEY_MAP.BIRTHDATE];
			if (!birthDateStr) return true; // Default Fallback: I qualify minimum age criteria

			const birthDate = new Date(birthDateStr);
			if (isNaN(birthDate)) return true; // Default Fallback: I qualify minimum age criteria

			const today = new Date();
			let age = today.getFullYear() - birthDate.getFullYear();

			const hasHadBirthdayThisYear =
				today.getMonth() > birthDate.getMonth() ||
				(today.getMonth() === birthDate.getMonth() &&
				today.getDate() >= birthDate.getDate());

			if (!hasHadBirthdayThisYear) age--;

			if (age >= minimumAge) {
				return true;
			} else {
				return false;
			}
		},
		hint: (question, db, minimumAge = 18) => {
			const birthDateStr = db[DB_KEY_MAP.BIRTHDATE];
			if (!birthDateStr) return "I qualify minimum age criteria"; // Default Fallback

			const birthDate = new Date(birthDateStr);
			if (isNaN(birthDate)) return "I qualify minimum age criteria"; // Default Fallback

			const today = new Date();
			let age = today.getFullYear() - birthDate.getFullYear();

			const hasHadBirthdayThisYear =
				today.getMonth() > birthDate.getMonth() ||
				(today.getMonth() === birthDate.getMonth() &&
				today.getDate() >= birthDate.getDate());

			if (!hasHadBirthdayThisYear) age--;

			if (age >= minimumAge) {
				return `Yes, I'm ${age} year's old`;
			} else {
				return `I'm ${age} year's old`;
			}
		},
		labels: [
			['Are you at least 18 years old?', 85],
			['Are you of legal working age?', 85],
			['Are you legally old enough to work?', 85]
		]
	},

	BACKGROUND_CHECK: {
		type: [FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX, FIELD_TYPE.DROPDOWN, FIELD_TYPE.SELECT],
		dbAnswerKey: DB_KEY_MAP.BACKGROUND_CHECK,
		value: (question, db) => {
			return resolveAnswerValue(db, DB_KEY_MAP.BACKGROUND_CHECK) ?? true;
		},
		hint: (question, db) => {
			if (resolveAnswerValue(db, DB_KEY_MAP.BACKGROUND_CHECK) === false) {
				return "I'm not willing to undergo any pre-employment background check or screening."
			}
			return "I'm willing and able to undergo and pass standard pre-employment background screening as required by the employer.";
		},
		labels: [
			['Are you able to pass a background check?', 85],
			['Are you willing to undergo a background check?', 85],
			['Do you consent to a background check?', 85],
			['Can you pass a pre-employment background screening?', 85],
			['Are you comfortable with a background investigation?', 85],
			['Will you agree to a background check?', 85],
			['Are you able to meet background screening requirements?', 85]
		]
	},

	EXPORT_CONTROL_OR_EMPLOYMENT_RESTRICTIONS: {
		type: [FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX, FIELD_TYPE.DROPDOWN, FIELD_TYPE.SELECT],
		dbAnswerKey: DB_KEY_MAP.EMPLOYMENT_RESTRICTIONS,
		value: (question, db) => {
			return resolveAnswerValue(db, DB_KEY_MAP.EMPLOYMENT_RESTRICTIONS) ?? false;
		},
		hint: (question, db) => {
			const restricted = resolveAnswerValue(db, DB_KEY_MAP.EMPLOYMENT_RESTRICTIONS);

			if (restricted === true) {
				return "I'm subject to employment, export control, or regulatory restrictions that may limit certain roles or work scopes.";
			}

			if (restricted === false) {
				return "I'm not subject to export control, ITAR/EAR, or other employment-related legal restrictions.";
			}

			return "I'm not subject to export control, ITAR/EAR, or other employment-related legal restrictions.";
		},
		labels: [
			['Are you subject to export control regulations?', 85],
			['Are there any restrictions on your employment?', 85],
			['Are you subject to ITAR/EAR restrictions?', 85],
			['Are there any legal limitations on your employment?', 85],
			['Are you currently restricted from working in this country?', 85],
			['Do you have any conditions limiting your employment?', 85],
			['Are you subject to any employment-related legal restrictions?', 85]
		]
	},

	NON_COMPETE_OR_CONTRACTUAL_OBLIGATIONS: {
		type: [FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX, FIELD_TYPE.DROPDOWN, FIELD_TYPE.SELECT],
		dbAnswerKey: DB_KEY_MAP.NON_COMPLETE_RESTRICTIONS,
		value: (question, db) => {
			return resolveAnswerValue(db, DB_KEY_MAP.NON_COMPLETE_RESTRICTIONS) ?? false;
		},
		hint: (question, db) => {
			const hasRestrictions = resolveAnswerValue(db, DB_KEY_MAP.NON_COMPLETE_RESTRICTIONS);

			if (hasRestrictions === true) {
				return "I have contractual or non-compete obligations that could affect employment with another organization.";
			}

			if (hasRestrictions === false) {
				return "I'm not bound by any non-compete or contractual restrictions affecting new employment.";
			}

			return "I'm not bound by any non-compete or contractual restrictions affecting new employment.";
		},
		labels: [
			['Are you subject to a non-compete agreement?', 85],
			['Do you have any contractual obligations that would prevent employment?', 85],
			['Are you bound by any restrictive covenants?', 85],
			['Do you have any legal commitments to your current employer?', 85],
			['Are you under any contractual restrictions?', 85]
		]
	},

	SECURITY_CLEARANCE: {
		type: [FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX, FIELD_TYPE.DROPDOWN, FIELD_TYPE.SELECT],
		dbAnswerKey: DB_KEY_MAP.SECURITY_CLEARANCE,
		value: (question, db) => {
			return resolveAnswerValue(db, DB_KEY_MAP.SECURITY_CLEARANCE) ?? false;
		},
		hint: (question, db) => {
			const clearance = resolveAnswerValue(db, DB_KEY_MAP.SECURITY_CLEARANCE);

			if (clearance === true) {
				return "Indicate possession or eligibility of relevant security clearance, if applicable.";
			}

			if (clearance === false) {
				return "I do not currently hold a security clearance.";
			}

			return "I do not currently hold a security clearance.";
		},
		labels: [
			['Do you have security clearance?', 85],
			['Do you have an active security clearance?', 85],
			['Are you eligible for security clearance?', 85],
			['Have you ever held security clearance?', 85],
			['Are you willing to undergo a security clearance process?', 85],
			['Do you currently possess government security clearance?', 85]
		]
	},

	CITIZENSHIP_OR_PERMANENT_RESIDENCY: {
		type: [FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX, FIELD_TYPE.DROPDOWN, FIELD_TYPE.SELECT],
		dbAnswerKey: DB_KEY_MAP.CITIZENSHIP_STATUS,
		value: (question, db) => {
			return resolveAnswerValue(db, DB_KEY_MAP.CITIZENSHIP_STATUS) ?? true;
		},
		hint: (question, db) => {
			const status = resolveAnswerValue(db, DB_KEY_MAP.CITIZENSHIP_STATUS);

			if (status === true) {
				return "I'm a citizen or lawful permanent resident and meet any associated employment eligibility requirements.";
			}

			if (status === false) {
				return "I'm not a citizen or permanent resident.";
			}

			return "I'm a citizen or lawful permanent resident and meet any associated employment eligibility requirements.";
		},
		labels: [
			['Are you a citizen or permanent resident?', 85],
			['Are you a lawful permanent resident?', 85],
			['Do you hold permanent residency?', 85],
			['Are you a green card holder?', 85],
			['Are you eligible for government employment?', 85],
			['Can you meet federal employment requirements?', 85],
			["Are you a citizen or permanent resident in the country you're applying?", 85],
			['Do you possess permanent work authorization?', 85],
			['Are you a naturalized citizen?', 85],
			['Do you hold citizenship in this country?', 85]
		]
	},

	GOVERNMENT_EMPLOYMENT_OR_AFFILIATION: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined, // TODO - Add question to website.
		value: false,
		hint: undefined,
		labels: [
			['Are you currently or have you ever been employed by a government agency?', 85],
			['Do you have any current or prior government employment?', 85],
			['Have you ever held a position with a government entity?', 85],
			['Are you or have you ever been a government employee?', 85],
			['Do you currently or previously work for any federal, state, or local government?', 85],
			['Have you ever been affiliated with a government organization?', 85],
			['Are you currently or have you been employed by the government?', 85],
			['Do you hold or have you held any government positions?', 85],
			['Please indicate any current or previous government employment.', 85],
			['Have you ever served in a government capacity?', 85]
		]
	},


	// Additional EEO QUESTIONS

	GENDER_IDENTITY: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: DB_KEY_MAP.GENDER,
		value: undefined,
		hint: (question, db) => {
			const gender = resolveAnswerValue(db, DB_KEY_MAP.GENDER);
			if (typeof gender === "string" && gender.trim() !== "") {
				return `Answer "${gender.trim()}" as my gender identity.`;
			}
			return "Answer 'Decline to state' or 'Prefer not to say' if possible; otherwise, answer that best represents most common gender identity.";
		},
		labels: [
			['How do you identify your gender?', 85],
			['Please select your gender identity.', 85],
			['What is your gender identity?', 85],
			['Voluntary self-identification of gender.', 85],
			['You may choose to disclose your gender identity.', 85],
			['Voluntary Self-Identification of Gender', 90],
			['Self-Identification: Gender Identity', 90],
			['Gender Identity (Voluntary)', 90],
			['Gender - Optional Self-Identification', 90]
		]
	},

	SEXUAL_ORIENTATION: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: DB_KEY_MAP.SEXUAL_ORIENTATION,
		value: undefined,
		hint: (question, db) => {
			const orientation = resolveAnswerValue(db, DB_KEY_MAP.SEXUAL_ORIENTATION);

			if (typeof orientation === "string" && orientation.trim() !== "") {
				return `Answer "${orientation.trim()}" as my sexual orientation.`;
			}

			return "Answer 'Decline to state' or 'Prefer not to say'; otherwise, answer to best describes most common sexual orientation (generally 'Heterosexual / Straight').";
		},
		labels: [
			['How do you describe your sexual orientation?', 85],
			['Please select your sexual orientation.', 85],
			['Which of the following best describes your sexual orientation?', 85],
			['What sexual orientation do you most closely identify with?', 85],
			['Voluntary self-identification of sexual orientation.', 85],
			['You may choose to disclose your sexual orientation.', 85],
			['Voluntary Self-Identification of Sexual Orientation', 90],
			['Self-Identification: Sexual Orientation', 90],
			['Sexual Orientation (Voluntary)', 90],
			['Sexual Orientation - Optional Disclosure', 90]
		]
	},

	LGBTQ_STATUS: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: DB_KEY_MAP.LGBTQ_STATUS,
		value: (question, db) => {
			return resolveAnswerValue(db, DB_KEY_MAP.LGBTQ_STATUS) ?? false;
		},
		hint: (question, db) => {
			const lgbtqStatus = resolveAnswerValue(db, DB_KEY_MAP.LGBTQ_STATUS);

			if (lgbtqStatus === true) {
				return "I identify as a member of the LGBTQ+ community.";
			}

			if (lgbtqStatus === false) {
				return "I do not identify as a member of the LGBTQ+ community.";
			}

			if (typeof lgbtqStatus === "string" && lgbtqStatus.trim() !== "") {
				return `Answer "${lgbtqStatus.trim()}" for LGBTQ+ status.`;
			}

			return "Answer 'Decline to state' or 'Prefer not to say'.";
		},
		labels: [
			['Do you identify as LGBTQ+?', 85],
			['Do you identify as a member of the LGBTQ+ community?', 85],
			['Please indicate whether you identify as LGBTQ+.', 85],
			['How do you identify with respect to LGBTQ+ status?', 85],
			['Voluntary self-identification of LGBTQ+ status.', 85],
			['You may choose to disclose your LGBTQ+ identity.', 85],
			['Voluntary Self-Identification of LGBTQ+ Status', 90],
			['Self-Identification: LGBTQ+ Identity', 90],
			['LGBTQ+ Status (Voluntary)', 90],
			['LGBTQ+ Identity - Optional Disclosure', 90]
		]
	},

	ETHNICITY_RACE: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: DB_KEY_MAP.ETHNICITY,
		value: undefined,
		hint: (question, db) => {
			const ethnicity = resolveAnswerValue(db, DB_KEY_MAP.ETHNICITY);

			if (Array.isArray(ethnicity) && ethnicity.length > 0) {
				// Join multiple selections
				const formatted = ethnicity.map(e => e.trim()).filter(Boolean).join(", ");
				if (formatted) return `Answer the following race/ethnicity: ${formatted}.`;
			}

			if (typeof ethnicity === "string" && ethnicity.trim() !== "") {
				return `Answer "${ethnicity.trim()}" as my race/ethnicity.`;
			}

			// Otherwise, voluntary disclosure guidance
			return "Answer 'Decline to state' or 'Prefer not to say'.";
		},
		labels: [
			['Race', 85],
			['Ethnicity', 85],
			['How do you identify your race or ethnicity?', 85],
			['Please select your race/ethnicity.', 85],
			['What is your ethnic background?', 85],
			['Voluntary self-identification of race and ethnicity.', 85],
			['Which of the following best describes your race or ethnicity?', 85],
			['Please select all that apply for your race/ethnicity.', 85],
			['Voluntary Self-Identification of Race/Ethnicity', 90],
			['Self-Identification: Race and Ethnicity', 90],
			['Race/Ethnicity (Voluntary)', 90],
			['EEO Race/Ethnicity Self-Identification', 90]

		]
	},


	HISPANIC_OR_LATINO: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: DB_KEY_MAP.HISPANIC_OR_LATINO,
		value: (question, db) => {
			return resolveAnswerValue(db, DB_KEY_MAP.HISPANIC_OR_LATINO) ?? false;
		},
		labels: [
			['Are you Hispanic or Latino?', 85],
			['Do you identify as Hispanic or Latino?', 85],
			['Please indicate whether you are Hispanic or Latino.', 85],
			['Are you of Hispanic or Latino origin?', 85],
			['Do you consider yourself Hispanic or Latino?', 85],
			['Voluntary self-identification of Hispanic or Latino ethnicity.', 85],
			['You may choose to disclose whether you are Hispanic or Latino.', 85],
			['Voluntary Self-Identification of Hispanic or Latino Ethnicity', 85],
			['Self-Identification: Hispanic or Latino', 85],
			['Hispanic or Latino Ethnicity (Voluntary)', 85],
			['Hispanic/Latino Origin - Optional Disclosure', 85]
		]

	},

	MILITARY_SERVICE: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: DB_KEY_MAP.MILITARY_SERVICE,
		value: (question, db) => {
			return resolveAnswerValue(db, DB_KEY_MAP.MILITARY_SERVICE) ?? false;
		},
		hint: (question, db) => {
			const served = resolveAnswerValue(db, DB_KEY_MAP.MILITARY_SERVICE);

			if (served === true) return "I do have prior military service.";
			if (served === false) return "I have not served in the military.";
			return "I have not served in the military.";
		},
		labels: [
			['Have you served in the military?', 85],
			['Do you have prior military service?', 85],
			['Have you ever served in the armed forces?', 85],
			['Please indicate any prior military service.', 85]
		]
	},

	VETERAN_STATUS: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: DB_KEY_MAP.VETERAN_STATUS,
		value: (question, db) => {
			return resolveAnswerValue(db, DB_KEY_MAP.VETERAN_STATUS) ?? false;
		},
		hint: (question, db) => {
			const status = resolveAnswerValue(db, DB_KEY_MAP.VETERAN_STATUS);

			if (status === true || status === "Yes") return "I am a veteran.";
			if (status === false || status === "No") return "I'm not a veteran.";
			if (typeof status === "string" && status.trim()) return `Answer '${status.trim()}' as my veteran status if possible; otherwise, answer like I'm not a veteran`;
			return "Answer like 'Decline to state' if possible; otherwise, answer like I'm not a veteran.";
		},
		labels: [
			['Do you identify as a protected veteran?', 85],
			['Are you a U.S. military veteran?', 85],
			['Please indicate your veteran status.', 85],
			['Do you have veteran status?', 85],
			['What is your veteran status?', 85],
			['Voluntary self-identification of veteran status.', 85],
			['Are you a protected veteran under federal law?', 85],
			['Voluntary Self-Identification of Veteran Status', 90],
			['Protected Veteran Status Self-Identification', 90],
			['Veteran Status (Voluntary)', 90],
			['Self-Identification: Veteran Status', 90]
		]
	},

	DISABILITY_STATUS: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: DB_KEY_MAP.DISABILITY_STATUS,
		value: (question, db) => {
			return resolveAnswerValue(db, DB_KEY_MAP.DISABILITY_STATUS) ?? false;
		},
		hint: (question, db) => {
			const disability = resolveAnswerValue(db, DB_KEY_MAP.DISABILITY_STATUS);

			if (disability === true || disability === "Yes") return "I do have a disability.";
			if (disability === false || disability === "No") return "I do not have a disability.";
			if (typeof disability === "string" && disability.trim()) return `Answer '${disability.trim()}' as my disability status if possible; otherwise, answer like I do not have a disability.`;
			return "Answer like I prefer not to disclose, select 'Decline to state' or 'Prefer not to say' if possible; otherwise, answer like I do not have a disability.";
		},
		labels: [
			['Do you have a disability?', 85],
			['What is your disability status?', 85],
			['Do you classify yourself as a person with disability?', 85],
			['Do you identify as an individual with a disability?', 85],
			['Voluntary self-identification of disability.', 85],
			['Please indicate whether you have a disability.', 85],
			['Please indicate your disability status.', 85],
			['Do you consider yourself to have a disability?', 85],
			['Voluntary Self-Identification of Disability', 90],
			['Disability Status Self-Identification', 90],
			['Disability (Voluntary Disclosure)', 90],
			['Self-Identification: Disability Status', 90]
		]
	},



	// ALWAYS FALSE

	REFERRAL_SOURCE: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return false;
		},
		hint: (question, db) => {
			return "I was not referred by an employee."
		},
		labels: [
			['Were you referred by a current employee?', 85],
			['Do you have an employee referral?', 85],
		]
	},

	PREVIOUS_EMPLOYMENT_WITH_COMPANY: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return false;
		},
		hint: (question, db) => {
			return "I have not worked for this company before."
		},
		labels: [
			['Have you previously worked for this company?', 85],
			['Are you a former employee of this organization?', 85],
			['Have you ever been employed by us before?', 85],
			['Have you worked here in the past?', 85]
		]
	},

	CRIMINAL_BACKGROUND_DISCLOSURE: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return false;
		},
		hint: (question, db) => {
			return "I've have no criminal convictions."
		},
		labels: [
			['Have you ever been convicted of a crime?', 85],
			['Do you have any criminal convictions?', 85],
			['Have you been convicted of a felony?', 85],
			['Please disclose any criminal convictions.', 85],
			['Have you been convicted of a crime related to employment?', 85]
		]
	},

	CONFLICT_OF_INTEREST: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return false;
		},
		hint: (question, db) => {
			return "I have no conflicts of interest with the company."
		},
		labels: [
			['Do you have any conflicts of interest?', 85],
			['Are there any relationships that could present a conflict of interest?', 85],
			['Do you have any personal or professional conflicts?', 85],
			['Please disclose any potential conflicts of interest.', 85]
		]
	},

	RELATIVES_IN_COMPANY: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return false;
		},
		hint: (question, db) => {
			return "I have no relatives working at this company."
		},
		labels: [
			['Do you have any relatives working at this company?', 85],
			['Are any of your family members employed here?', 85],
			['Do you have any personal relationships with current employees?', 85],
			['Do you have a close relative working for this organization?', 85]
		]
	},

	PREVIOUS_DISCIPLINARY_ACTION: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return false;
		},
		hint: (question, db) => {
			return "I have never faced disciplinary action at work."
		},
		labels: [
			['Have you ever been subject to disciplinary action at work?', 85],
			['Have you ever been terminated for cause?', 85],
			['Have you ever been dismissed from a job?', 85],
			['Have you ever been asked to resign from a position?', 85]
		]
	},

	BANKRUPTCY_DISCLOSURE: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return false;
		},
		hint: (question, db) => {
			return "I have never declared bankruptcy."
		},
		labels: [
			['Have you ever declared bankruptcy?', 85],
			['Are you currently in bankruptcy proceedings?', 85]
		]
	},

	PROFESSIONAL_LICENSE_SUSPENSION: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return false;
		},
		hint: (question, db) => {
			return "I have never had a professional license or certification suspended."
		},
		labels: [
			['Has your professional license ever been suspended?', 85],
			['Have you ever had a professional certification revoked?', 85]
		]
	},

	EMPLOYMENT_LITIGATION_HISTORY: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return false;
		},
		hint: (question, db) => {
			return "I have never been involved in employment-related litigation."
		},
		labels: [
			['Have you ever filed a lawsuit against an employer?', 85],
			['Have you ever been involved in employment litigation?', 85]
		]
	},


	// ALWAYS TRUE

	PROFESSIONAL_REFERENCES: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return true;
		},
		hint: (question, db) => {
			return "I can provide professional references if requested."
		},
		labels: [
			['Can you provide professional references?', 85],
			['Are you able to provide references upon request?', 85],
			['Do you have references available?', 85],
			['Will you be able to share references if selected?', 85]
		]
	},

	WILLINGNESS_TO_SIGN_CONFIDENTIALITY_AGREEMENT: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return true;
		},
		hint: (question, db) => {
			return "I'm comfortable or willing to sign a confidentiality or non-disclosure agreement."
		},
		labels: [
			['Are you willing to sign a confidentiality agreement?', 85],
			['Will you agree to a non-disclosure agreement?', 85],
			['Are you comfortable signing an NDA?', 85]
		]
	},

	ABILITY_TO_PERFORM_JOB_FUNCTIONS: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return true;
		},
		hint: (question, db) => {
			return "I confirm that I'm able to perform the essential functions of this job."
		},
		labels: [
			['Are you able to perform the essential functions of this job?', 85],
			['Can you perform the core duties of this role with or without accommodation?', 85],
			['Are you capable of fulfilling the responsibilities of this position?', 85]
		]
	},

	DRIVER_LICENSE_STATUS: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return true;
		},
		hint: (question, db) => {
			return "I have a valid driver's license and can drive if required for the role."
		},
		labels: [
			["Do you have a valid driver's license?", 85],
			["Are you able to drive for work purposes?", 85],
			["Do you possess a current driver's license?", 85],
			['Are you willing to use your vehicle for work if required?', 85],
			["Is your driver's license current and valid?", 85],
			["Are you able to provide proof of a valid driver's license?", 85]
		]
	},

	DRUG_TEST_CONSENT: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return true;
		},
		hint: (question, db) => {
			return "I consent to pre-employment drug testing."
		},
		labels: [
			['Are you willing to undergo a drug test?', 85],
			['Do you consent to a pre-employment drug screening?', 85],
			['Are you able to pass a drug test?', 85],
			['Are you comfortable with drug testing?', 85],
			['Will you agree to a drug screening if required?', 85]
		]
	},

	CONSENT_TO_DATA_PROCESSING: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return true;
		},
		hint: (question, db) => {
			return "I agree to the processing and use of my personal data."
		},
		labels: [
			['Do you consent to the processing of your personal data?', 85],
			['Do you agree to the collection and use of your data?', 85],
			['Do you consent to data privacy terms?', 85],
			['Do you accept the privacy policy for your application?', 85]
		]
	},

	CONSENT_TO_PRE_EMPLOYMENT_CHECKS: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return true;
		},
		hint: (question, db) => {
			return "I agree to undergo pre-employment checks and verification."
		},
		labels: [
			['Do you consent to pre-employment checks?', 85],
			['Are you willing to undergo employment screening?', 85],
			['Do you agree to verification of your information?', 85]
		]
	},

	ACCURACY_OF_INFORMATION: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return true;
		},
		hint: (question, db) => {
			return "I certify that all information provided in the application is accurate and truthful."
		},
		labels: [
			['I certify that the information provided is true and correct.', 85],
			['I confirm that all information in this application is accurate.', 85],
			['I attest that the details submitted are truthful to the best of my knowledge.', 85]
		]
	},

	ACKNOWLEDGMENT_OF_TERMS: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return true;
		},
		hint: (question, db) => {
			return "I acknowledge and agree to the terms and conditions of the application."
		},
		labels: [
			['I have read and agree to the terms and conditions.', 85],
			['I accept the terms of this application.', 85],
			['I acknowledge and agree to the application terms.', 85]
		]
	},

	CONSENT_TO_REFERENCE_CHECK: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return true;
		},
		hint: (question, db) => {
			return "I authorize the company to contact my references."
		},
		labels: [
			['I authorize the company to contact my references.', 85],
			['I consent to reference verification.', 85]
		]
	},

	CONSENT_TO_BACKGROUND_VERIFICATION: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return true;
		},
		hint: (question, db) => {
			return "I authorize the company to verify my employment, education, and background."
		},
		labels: [
			['I consent to verification of my employment history.', 85],
			['I authorize the company to verify my education and employment records.', 85]
		]
	},

	CONSENT_TO_ELECTRONIC_COMMUNICATION: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return true;
		},
		hint: (question, db) => {
			return "I consent to receiving electronic communications regarding my application."
		},
		labels: [
			['I consent to receive electronic communications regarding my application.', 85],
			['I agree to be contacted via email regarding my application status.', 85]
		]
	},

	ACKNOWLEDGMENT_OF_AT_WILL_EMPLOYMENT: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return true;
		},
		hint: (question, db) => {
			return "I acknowledge that employment is at-will and may be terminated by either party."
		},
		labels: [
			['I understand that employment is at-will.', 85],
			['I acknowledge that employment may be terminated at any time by either party.', 85]
		]
	},

	ACKNOWLEDGMENT_OF_DATA_RETENTION: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return true;
		},
		hint: (question, db) => {
			return "I acknowledge that my application data may be retained for future opportunities."
		},
		labels: [
			['I understand my data may be stored for future opportunities.', 85],
			['I consent to my application being retained for future consideration.', 85]
		]
	},

	ACKNOWLEDGMENT_OF_PRE_EMPLOYMENT_REQUIREMENTS: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return true;
		},
		hint: (question, db) => {
			return "I acknowledge that my employment offer is contingent on successful pre-employment checks."
		},
		labels: [
			['I understand that this offer is contingent upon successful background checks.', 85],
			['I acknowledge that pre-employment checks are required.', 85]
		]
	},

	ACKNOWLEDGMENT_OF_EQUAL_OPPORTUNITY_POLICY: {
		type: [FIELD_TYPE.SELECT, FIELD_TYPE.DROPDOWN, FIELD_TYPE.RADIO, FIELD_TYPE.CHECKBOX],
		dbAnswerKey: undefined,
		value: (question, db) => {
			return true;
		},
		hint: (question, db) => {
			return "I acknowledge that this employer follows an equal opportunity employment policy."
		},
		labels: [
			['I acknowledge that this employer is an equal opportunity employer.', 85],
			["I understand the company's EEO policy.", 85]
		]
	}

};