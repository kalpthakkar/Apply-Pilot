// ./public/script.js

/* ----------------------------------------------------------
* ------------------ 🔹 Pre-Initialization ------------------
* -----------------------------------------------------------
*/
const sections = document.querySelectorAll(".form-section");
const steps = document.querySelectorAll(".progress-step");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const form = document.getElementById("multiStepForm");


/* ------------------------------------------------------------
* ------------------ 🔹 Initialize Constants ------------------
* -------------------------------------------------------------
*/
// --- Country → State map ---
const countries = {
  	"United States of America": [ 
		"Alabama (AL)", "Alaska (AK)", "Arizona (AZ)", "Arkansas (AR)", "California (CA)", "Colorado (CO)", "Connecticut (CT)", "Delaware (DE)", "District of Columbia (DC)", "Florida (FL)", 
		"Georgia (GA)", "Hawaii (HI)", "Idaho (ID)", "Illinois (IL)", "Indiana (IN)", "Iowa (IA)", "Kansas (KS)", "Kentucky (KY)", "Louisiana (LA)", "Maine (ME)", 
		"Maryland (MD)", "Massachusetts (MA)", "Michigan (MI)", "Minnesota (MN)", "Mississippi (MS)", "Missouri (MO)", "Montana (MT)", "Nebraska (NE)", "Nevada (NV)", "New Hampshire (NH)", 
		"New Jersey (NJ)", "New Mexico (NM)", "New York (NY)", "North Carolina (NC)", "North Dakota (ND)", "Ohio (OH)", "Oklahoma (OK)", "Oregon (OR)", "Pennsylvania (PA)", "Rhode Island (RI)", 
		"South Carolina (SC)", "South Dakota (SD)", "Tennessee (TN)", "Texas (TX)", "Utah (UT)", "Vermont (VT)", "Virginia (VA)", "Washington (WA)", "West Virginia (WV)", "Wisconsin (WI)", 
		"Wyoming (WY)"
	],
	"India": [ 
		"Andhra Pradesh (AP)", "Arunachal Pradesh (AR)", "Assam (AS)", "Bihar (BR)", "Chhattisgarh (CG)", "Goa (GA)", "Gujarat (GJ)", "Haryana (HR)", "Himachal Pradesh (HP)", "Jharkhand (JH)", 
		"Karnataka (KA)", "Kerala (KL)", "Madhya Pradesh (MP)", "Maharashtra (MH)", "Manipur (MN)", "Meghalaya (ML)", "Mizoram (MZ)", "Nagaland (NL)", "Odisha (OD)", "Punjab (PB)", 
		"Rajasthan (RJ)", "Sikkim (SK)", "Tamil Nadu (TN)", "Telangana (TS)", "Tripura (TR)", "Uttar Pradesh (UP)", "Uttarakhand (UK)", "West Bengal (WB)"
	],
	"Canada": [
		"Alberta (AB)", "British Columbia (BC)", "Manitoba (MB)", "New Brunswick (NB)", "Newfoundland and Labrador (NL)", "Northwest Territories (NT)", "Nova Scotia (NS)", "Nunavut (NU)", "Ontario (ON)", "Prince Edward Island (PE)", 
		"Quebec (QC)", "Saskatchewan (SK)", "Yukon (YT)"
	]
};


/* ------------------------------------------------------------
* --------------- 🔹 Section Transition Control ---------------
* ------------------------------------------------------------- */
let current = 0;

function showSection(index) {
    // Show the section corresponding to index
    sections.forEach((s, i) => s.classList.toggle("active", i === index));

    // Highlight current step
    steps.forEach((step, i) => step.classList.toggle("active", i === index));

    // Enable/disable buttons
    prevBtn.disabled = index === 0;
    nextBtn.textContent = index === sections.length - 1 ? "Submit" : "Next";

    // Update current index
    current = index;
}

// Step-by-step buttons
nextBtn.addEventListener("click", () => {
    if (current < sections.length - 1) {
        showSection(current + 1);
    } else {
        nextBtn.classList.add("loading"); // Start loading animation on Submit click
        form.dispatchEvent(new Event("submit")); // Let app.js handle JSON submission
    }
});

prevBtn.addEventListener("click", () => {
    if (current > 0) showSection(current - 1);
});

// Clicking on a progress step jumps to that section
steps.forEach((step, i) => {
    step.addEventListener("click", () => {
        showSection(i);
        // Optional: scroll to top of form
        // form.scrollIntoView({ behavior: "smooth" });
    });
});

// Initialize
showSection(current);


/* ------------------------------------------------------------
* ---------------------- 🔹 Popup Modal ----------------------
* -------------------------------------------------------------
*/
// Animate modal open/close
function animateModal(modal, type, open = true) {
	const content = modal.querySelector("div[role='dialog'], .bg-white");
	content.style.transition = "transform 300ms ease, opacity 300ms ease";

	if (open) {
		modal.classList.add("show");
		modal.setAttribute("aria-hidden", "false");
		content.style.opacity = "0";

		if (type === "fade") {
			setTimeout(() => content.style.opacity = "1", 20);
		} else if (type === "slide") {
			content.style.transform = "translateY(-50px)";
			setTimeout(() => {
				content.style.transform = "translateY(0)";
				content.style.opacity = "1";
			}, 20);
		} else if (type === "scale") {
			content.style.transform = "scale(0.7)";
			setTimeout(() => {
				content.style.transform = "scale(1)";
				content.style.opacity = "1";
			}, 20);
		}

		// Re-enable fields for focus/interaction
		modal.querySelectorAll("input, select, textarea").forEach(el => el.disabled = false);

	} else {

		// Blur any focused input before closing
		document.activeElement.blur();

		// Disable hidden inputs to avoid validation errors
		modal.querySelectorAll("input, select, textarea").forEach(el => el.disabled = true);

		if (type === "fade") content.style.opacity = "0";
		if (type === "slide") {
			content.style.transform = "translateY(-50px)";
			content.style.opacity = "0";
		}
		if (type === "scale") {
			content.style.transform = "scale(0.7)";
			content.style.opacity = "0";
		}
		setTimeout(() => {
			modal.classList.remove("show");
			modal.setAttribute("aria-hidden", "true");
		}, 300);
	}
}

// Attach event listeners to open buttons
document.querySelectorAll(".open-modal").forEach(button => {
  button.addEventListener("click", e => {
    // Ignore programmatic/synthetic clicks — only allow real user action
    if (!e.isTrusted) {
      // helpful debug line if you want to see when synthetic clicks occur
      // console.warn('Ignored synthetic click for open-modal', button);
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const modalId = button.dataset.modal;
    const transition = button.dataset.transition || "fade";
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.dataset.transition = transition;
      animateModal(modal, transition, true);
    }
  });
});

// Handle close button + backdrop click
document.querySelectorAll(".custom-modal").forEach(modal => {
	modal.addEventListener("click", e => {
		if (e.target === modal)
		animateModal(modal, modal.dataset.transition || "fade", false);
	});
	modal.querySelectorAll(".close-modal").forEach(btn => {
			btn.addEventListener("click", e => {
			e.preventDefault(); // 🧩 Prevent form submission from close button
			e.stopPropagation();
			animateModal(modal, modal.dataset.transition || "fade", false);
		});
	});
});

// ESC key closes currently open modal
document.addEventListener("keydown", e => {
	if (e.key === "Escape") {
		document.querySelectorAll(".custom-modal.show").forEach(openModal => {
			animateModal(openModal, openModal.dataset.transition || "fade", false);
		});
	}
});



/* ------------------------------------------------------------
* ------------------ 🔹 Input Type Password ------------------
* -------------------------------------------------------------
*/

function togglePassword(inputId, icon) {
  const input = document.getElementById(inputId);

  if (input.type === "password") {
    input.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    input.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
}



/* ------------------------------------------------------------
* ---------------- 🔹 Input Type Multi-select ----------------
* -------------------------------------------------------------
*/

/* -------------------------------------------------------------
* ----------- Input Type Multi-select 🔹 Chip Logic -----------
* --------------------------------------------------------------
*/
// Create a chip element for a given wrapper (no synthetic event required)
function createChipForWrapper(wrapper, value) {
  if (!value || !wrapper) return;
  const input = wrapper.querySelector('input');
  let chipsContainer = wrapper.querySelector('.chips-container');
  if (!chipsContainer) {
    chipsContainer = document.createElement('div');
    chipsContainer.className = 'chips-container flex flex-wrap gap-2 mb-1';
    input.parentNode.insertBefore(chipsContainer, input);
  }

  // Avoid duplicates
  if ([...chipsContainer.children].some(c => c.dataset.value === value)) return;

  const chip = document.createElement('span');
  chip.className = 'chip';
  chip.dataset.value = value;
  chip.innerHTML = `${value}`;
  chip.addEventListener('click', () => chip.remove());
  chipsContainer.appendChild(chip);

  // clear input after adding chip
  if (input) input.value = '';
}

/* -------------------------------------------------------------
* -------- Input Type Multi-select 🔹 Options Dependent --------
* --------------------------------------------------------------
*/
document.querySelectorAll('[data-multiselect-options]').forEach(container => {
	const inputWrapper = container.querySelector('.multiselect-wrapper') || container;
	const input = inputWrapper.querySelector('input');
	
	// Ensure chips container exists
	let chipsContainer = inputWrapper.querySelector('.chips-container');
	if (!chipsContainer) {
		chipsContainer = document.createElement('div');
		chipsContainer.className = 'chips-container flex flex-wrap gap-2 mb-1';
		inputWrapper.insertBefore(chipsContainer, input);
	}
	
	const optionsList = inputWrapper.querySelector('[data-options-list]');
	const allOptions = [...optionsList.querySelectorAll('li')];
	
	// Update dropdown position dynamically
	const updateDropdownPosition = () => {
		optionsList.style.top = `${input.offsetTop + input.offsetHeight}px`;
		optionsList.style.left = `${input.offsetLeft}px`;
		optionsList.style.width = `${input.offsetWidth}px`;
	};
	
	// Show dropdown
	const showDropdown = () => {
		optionsList.classList.remove('hidden');
		updateDropdownPosition();
	};
	
	// Hide dropdown
	const hideDropdown = () => {
		optionsList.classList.add('hidden');
	};
	
	// Filter options based on input and selected chips
	const refreshOptions = () => {
		const inputVal = input.value.toLowerCase();
		const selectedValues = [...chipsContainer.children].map(c => c.dataset.value);
		allOptions.forEach(li => {
		const val = li.dataset.value;
		if (selectedValues.includes(val)) {
			li.style.display = 'none';
		} else {
			li.style.display = val.toLowerCase().includes(inputVal) ? 'block' : 'none';
		}
		});
	};
	
	input.addEventListener('focus', showDropdown);
	input.addEventListener('input', refreshOptions);
	
	// Handle selection
	optionsList.addEventListener('mousedown', e => {
		if (e.target.tagName === 'LI') {
		e.preventDefault();
		const value = e.target.dataset.value;
	
		// Create chip
		const chip = document.createElement('span');
		chip.className = 'chip';
		chip.dataset.value = value;
		chip.innerHTML = `${value}`;
		chip.onclick = () => {
			chip.remove();
			refreshOptions(); // Re-show removed option in dropdown
		};
		chipsContainer.appendChild(chip);
	
		input.value = '';
		refreshOptions();
		hideDropdown(); // Close after selection
		}
	});
	
	// Hide dropdown on blur
	input.addEventListener('blur', () => setTimeout(hideDropdown, 150));
	
	// Initial options refresh
	refreshOptions();
});

/* -------------------------------------------------------------
* ------- Input Type Multi-select 🔹 Options Independent -------
* --------------------------------------------------------------
*/

function initializeFreeMultiselect({ scope = document, maxChips = Infinity, onMaxReached } = {}) {

	// 🔔 Default hint behavior if maxChips is set but no custom handler is provided
    if (Number.isFinite(maxChips) && typeof onMaxReached !== "function") {
        onMaxReached = (wrapper, max) => {
            let hint = wrapper.querySelector('.chip-limit-hint');
            if (!hint) {
                hint = document.createElement('div');
                hint.className = 'chip-limit-hint text-xs text-red-500 mt-1';
                wrapper.appendChild(hint);
            }
            hint.textContent = `Maximum ${max} items allowed`;
            setTimeout(() => hint.remove(), 2000);
        };
    }

	// Safe no-op fallback
    if (typeof onMaxReached !== "function") {
        onMaxReached = () => {};
    }

    scope.querySelectorAll('[data-component="free-multiselect"]').forEach(container => {
        const inputWrapper = container.querySelector('.multiselect-wrapper') || container;
        const input = inputWrapper.querySelector('input');
        if (!input) return;

        let chipsContainer = inputWrapper.querySelector('.chips-container');
        if (!chipsContainer) {
            chipsContainer = document.createElement('div');
            chipsContainer.className = 'chips-container flex flex-wrap gap-2 mb-1';
            inputWrapper.insertBefore(chipsContainer, input);
        }

        // Prevent duplicate initialization
        if (input.dataset.initialized === 'true') return;
        input.dataset.initialized = 'true';

        input.addEventListener('keydown', e => {

            if (e.key !== 'Enter') return;
            const value = input.value.trim();
            if (!value) return;
			
            e.preventDefault();

            // 🔒 Max chip cap check
            if (chipsContainer.children.length >= maxChips) {
                onMaxReached(inputWrapper, maxChips);
                return;
            }

            // Prevent duplicates
            if ([...chipsContainer.children].some(c => c.dataset.value === value)) {
                input.value = '';
                return;
            }

            createChipForWrapper(inputWrapper, value);
            input.value = '';
        });
    });
}



/* ------------------------------------------------------------
* ------------- 🔹 Helper → Prefill Input Values -------------
* -------------------------------------------------------------
*/
function setFieldValue(el, value) {
  if (!el) return;
  if (el.type === "checkbox") el.checked = !!value;
  else if (el.tagName === "SELECT") el.value = value || "";
  else if (el.type === "file") return; // skip file population
  else el.value = value ?? "";
}
// Helper → Prefill Chips
const populateChips = (parent, nameOfInput, values) => {
	const wrapper = parent.querySelector(`[name='${nameOfInput}']`)?.closest(".multiselect-wrapper");
	const chipsContainer = wrapper?.querySelector(".chips-container");
	if (!chipsContainer) return;

	chipsContainer.innerHTML = ""; // clear existing
	(values || []).forEach(val => {
		const chip = document.createElement("span");
		chip.className = "chip";
		chip.dataset.value = val;
		chip.innerHTML = `${val}`;
		chipsContainer.appendChild(chip);
		// Remove chip on click
		chip.addEventListener('click', () => chip.remove());
	});
};

function generateBlockId() {
  return crypto.randomUUID();
}

function setPrimaryResume(targetBlock) {
    const blocks = document.querySelectorAll("#resumeContainer > div");

    blocks.forEach((block, index) => {
        const star = block.querySelector(".star-btn");
        const isPrimary = block === targetBlock;

        star.classList.toggle("active", isPrimary);
        star.setAttribute("aria-pressed", isPrimary);
        block.dataset.primary = isPrimary ? "true" : "false";
    });
}

function setPrimaryAddress(targetBlock) {
    const blocks = document.querySelectorAll("#addressContainer > div");

    blocks.forEach((block, index) => {
        const star = block.querySelector(".star-btn");
        const isPrimary = block === targetBlock;

        star.classList.toggle("active", isPrimary);
        star.setAttribute("aria-pressed", isPrimary);
        block.dataset.primary = isPrimary ? "true" : "false";
    });
}



/* -------------------------------------------------------------------------------------------------
* --------------------------- 🔹 Dynamic • Add / Remove Sections [START] ---------------------------
* --------------------------------------------------------------------------------------------------
*/
/* -------------------------------------------------------------
* ----------------- 🔹 Add/Delete "Other URLs" -----------------
* --------------------------------------------------------------
*/
// Function to create one URL field block
function createUrlField(url = "") {
	// Wrapper (to allow Delete button next to it)
	const wrapper = document.createElement('div');
	wrapper.style.display = 'flex';
	wrapper.style.alignItems = 'center';
	wrapper.style.gap = '0.5rem';

	// URL field block
	const urlField = document.createElement('div');
	urlField.className = 'url-field';
	urlField.style.display = 'flex';
	urlField.style.alignItems = 'center';
	urlField.style.gap = '0.75rem';
	urlField.style.border = '1px solid #ddd';
	urlField.style.borderRadius = '6px';
	urlField.style.padding = '0.5rem 0.75rem';
	urlField.style.background = '#fff';
	urlField.style.flex = '1';

	// Icon
	const icon = document.createElement('i');
	icon.className = 'fas fa-globe text-gray-600';
	icon.style.fontSize = '1.25rem';

	// Divider
	const divider = document.createElement('div');
	divider.className = 'divider';
	divider.style.width = '1px';
	divider.style.height = '1.5rem';
	divider.style.background = '#ddd';

	// Input
	const input = document.createElement('input');
	input.type = 'url';
	input.name = 'otherURLs[]'; // use [] to handle multiple dynamically
	input.placeholder = 'Other URL';
	input.style.flex = '1';
	input.style.border = 'none';
	input.style.outline = 'none';
	input.style.background = 'transparent';
	input.style.fontSize = '0.95rem';

	// Assemble
	urlField.appendChild(icon);
	urlField.appendChild(divider);
	urlField.appendChild(input);

	// Delete button
	const delBtn = document.createElement('button');
	delBtn.type = 'button';
	delBtn.innerText = 'Delete';
	delBtn.classList.add("btn", "btn-outline-danger");
	delBtn.style.padding = '0.4rem 0.75rem';

	delBtn.addEventListener('click', () => wrapper.remove());

	// Append both to wrapper
	wrapper.appendChild(urlField);
	wrapper.appendChild(delBtn);

	wrapper.querySelector('input[name="otherURLs[]"]').value = url;

	return wrapper;
}

(function() {
	// Select main elements
	const linksModule = document.querySelector('.links-module');
	const linksContainer = linksModule.querySelector('.links-fields-container');

	// Add initial field
	linksContainer.appendChild(createUrlField());

})();

/* -------------------------------------------------------------
* ----------------- 🔹 Address Section -----------------
* --------------------------------------------------------------
*/
// Function to create a new address block
function createAddressBlock(data = {}) {
	const div = document.createElement('div');
	div.className = 'border rounded-md p-3 mb-3 bg-white address-block';
	div.innerHTML = `
		<div class="grid md:grid-cols-2 gap-3">
			<input type="text" name="addressLine1[]" placeholder="Address Line 1" class="form-control">
			<input type="text" name="addressLine2[]" placeholder="Address Line 2" class="form-control">
			<input type="text" name="city[]" placeholder="City" class="form-control">
			<select name="state[]" class="form-control state-select" disabled>
				<option value="">Select State/Province</option>
			</select>
			<input type="text" name="postalCode[]" placeholder="Postal Code" class="form-control">
			<select name="country[]" class="form-control country-select">
				<option value="">Select Country</option>
			</select>
		</div>

		<div class="flex items-center justify-between mt-3">
  
			<button type="button" class="btn btn-outline-danger remove-btn">
				Remove
			</button>
			
			<button type="button" class="mr-2 mt-1 star star-btn" 
					aria-pressed="false" 
					aria-label="Mark as primary address"
					data-tooltip="Mark as primary address">
				<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>
				</svg>
			</button>

		</div>
	`;
	
	// Remove button functionality
	div.querySelector('.remove-btn').onclick = () => {
		
		let shouldMarkFirstBlockPrimary = false;
		if ( // Current block is primary.
			(
				div.querySelector('.star-btn').classList.contains('active') 
				&& div.querySelector('.star-btn').hasAttribute('aria-pressed') == true
			)
			// More blocks might exists after delition.
			&& document.getElementById('addressContainer').children.length > 1
		) {
			shouldMarkFirstBlockPrimary = true;
		}
		div.remove()
		// Update primary block if required after only deletion.
		if (shouldMarkFirstBlockPrimary) setPrimaryAddress(document.getElementById('addressContainer').children[0]);
	};
	
	// Populate country & state dropdown
	const countrySelect = div.querySelector('.country-select');
	const stateSelect = div.querySelector('.state-select');
	const starBtn = div.querySelector(".star-btn");
	
	Object.keys(countries).forEach(abbr => {
		const opt = document.createElement('option');
		opt.value = abbr;
		opt.textContent = abbr;
		countrySelect.appendChild(opt);
	});
	
	// Handle country change → populate states
	countrySelect.addEventListener('change', e => {
		const selectedCountry = e.target.value;
		stateSelect.innerHTML = '<option value="">Select State/Province</option>';
		stateSelect.disabled = true;
		
		if (countries[selectedCountry]) {
			countries[selectedCountry].forEach(state => {
				const opt = document.createElement('option');
				opt.value = state;
				opt.textContent = state;
				stateSelect.appendChild(opt);
			});
			stateSelect.disabled = false;
		}
	});

	starBtn.addEventListener("click", () => {
		setPrimaryAddress(div);
	});
	
	// Prefill values if provided
	if (Object.keys(data).length) {
		setFieldValue(div.querySelector('[name="addressLine1[]"]'), data.addressLine1);
		setFieldValue(div.querySelector('[name="addressLine2[]"]'), data.addressLine2);
		setFieldValue(div.querySelector('[name="city[]"]'), data.city);
		setFieldValue(div.querySelector('[name="postalCode[]"]'), data.postalCode);
		setFieldValue(countrySelect, data.country);
		countrySelect.dispatchEvent(new Event("change"));
		setTimeout(() => setFieldValue(stateSelect, data.state), 50);
	}


	return div;
}

/* -------------------------------------------------------------
* ----------------- 🔹 Work Experience Section -----------------
* --------------------------------------------------------------
*/
function createWorkBlock(data = {}) {
	const div = document.createElement('div');
	div.className = 'border rounded-md p-3 mb-3 bg-white workExperience-block';
	div.innerHTML = `
		<div class="space-y-2">
			<input type="text" name="jobTitle[]" placeholder="Job Title" class="form-control">
			<input type="text" name="company[]" placeholder="Company" class="form-control">
			<div class="grid md:grid-cols-2 gap-3">
				<div class="flex gap-2">
					<select name="jobLocationType[]" class="form-control form-select w-1/3 jobLocationType-select">
						<option value="Hybrid" selected>Hybrid</option>
						<option value="On-site">On-site</option>
						<option value="Remote">Remote</option>
					</select>
					<input type="text" name="location[]" placeholder="Location" class="form-control">
				</div>
				<select name="jobType[]" class="form-control jobType-select">
					<option value="Full Time" selected>Full Time</option>
					<option value="Part Time">Part Time</option>
					<option value="Contract">Contract</option>
				</select>
			</div>
			<textarea name="roleDescription[]" placeholder="Describe" class="form-control"></textarea>
			<div class="grid grid-cols-2 gap-3">
				<div class="date-field">
					<span>Start</span>
					<div class="divider"></div>
					<input type="date" name="startDate[]" class="" style="width: 100%;" />
				</div>
				<div class="date-field">
					<span>End</span>
					<div class="divider"></div>
					<input type="date" name="endDate[]" class="end-date-input" style="width: 100%;" />
				</div>
			</div>
			<div class="reason-for-leaving mt-0"></div>
		</div>
		<button type="button" class="btn btn-outline-danger mt-3 remove-btn">Remove</button>
	`;

	const endDateInput = div.querySelector('.end-date-input');
	const reasonForLeavingContainer = div.querySelector('.reason-for-leaving');
	endDateInput.addEventListener('input', () => {
		if (endDateInput.value) {
			if (!reasonForLeavingContainer.hasChildNodes()) {
				const input = document.createElement('input');
				input.type = 'text';
				input.name = 'reasonForLeaving[]';
				input.placeholder = 'Reason for leaving (optional)';
				input.className = 'form-control mt-2';
				reasonForLeavingContainer.appendChild(input);
			}
		} else {
			reasonForLeavingContainer.innerHTML = '';
		}
	});

	div.querySelector(".remove-btn").onclick = () => div.remove();

	// Prefill if available
	if (Object.keys(data).length) {
		setFieldValue(div.querySelector('[name="jobTitle[]"]'), data.jobTitle);
		setFieldValue(div.querySelector('[name="company[]"]'), data.company);
		setFieldValue(div.querySelector('[name="jobLocationType[]"]'), data.jobLocationType);
		setFieldValue(div.querySelector('[name="location[]"]'), data.location);
		setFieldValue(div.querySelector('[name="jobType[]"]'), data.jobType);
		setFieldValue(div.querySelector('[name="roleDescription[]"]'), data.roleDescription);
		setFieldValue(div.querySelector('[name="startDate[]"]'), data.startDate);
		setFieldValue(div.querySelector('[name="endDate[]"]'), data.endDate);
		if (data.endDate) {
			endDateInput.dispatchEvent(new Event('input'));
			setFieldValue(div.querySelector('[name="reasonForLeaving[]"]'), data.reasonForLeaving);
		}
	}

	return div;
}

/* --------------------------------------------------------------
* -------------------- 🔹 Education Section --------------------
* ---------------------------------------------------------------
*/
function createEducationBlock(data = {}) {
	const div = document.createElement('div');
	div.className = 'border rounded-md p-3 mb-3 bg-white education-block';
	div.innerHTML = `
		<div class="space-y-2">
			<input type="text" name="school[]" placeholder="School/University" class="form-control" />
			<div class="multi-select-container" data-component="free-multiselect" style="border: 1px solid #dee2e6; border-radius: 6px;">
				<div class="multiselect-wrapper flex flex-wrap items-center gap-2 flex-1">
					<div class="chips-container flex flex-wrap gap-2"></div>
					<input type="text" placeholder="Degree" name="degree[]" class="form-control pl-0 py-0 border-none focus:ring-0 outline-none flex-1 min-w-[120px]" style="padding-left: 0;" autocomplete="off" />
				</div>
			</div>
			<div class="multi-select-container" data-component="free-multiselect" style="border: 1px solid #dee2e6; border-radius: 6px;">
				<div class="multiselect-wrapper flex flex-wrap items-center gap-2 flex-1">
					<div class="chips-container flex flex-wrap gap-2"></div>
					<input type="text" placeholder="Major" name="major[]" class="form-control pl-0 py-0 border-none focus:ring-0 outline-none flex-1 min-w-[120px]" style="padding-left: 0;" autocomplete="off" />
				</div>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 auto-rows-auto">
				<div class="date-field">
					<span>Start</span>
					<div class="divider"></div>
					<input type="date" name="startDate[]" class="w-full" />
				</div>
				<div class="date-field">
					<span>End</span>
					<div class="divider"></div>
					<input type="date" name="endDate[]" class="w-full" />
				</div>
				<div>
					<input type="number" name="gpa[]" step="0.01" placeholder="GPA" class="form-control w-full" />
				</div>
			</div>
		</div>
		<button type="button" class="btn btn-outline-danger mt-3 remove-btn">Remove</button>
	`;
	div.querySelector(".remove-btn").onclick = () => div.remove();

	// Populate regular fields
	setFieldValue(div.querySelector("[name='school[]']"), data.school);
	setFieldValue(div.querySelector("[name='gpa[]']"), data.gpa);
	setFieldValue(div.querySelector('[name="startDate[]"]'), data.startDate);
	setFieldValue(div.querySelector('[name="endDate[]"]'), data.endDate);

	// Prefill Degree and Major chips if available
	initializeFreeMultiselect({scope: div});
	// Populate chips for degree & major
	populateChips(div, "degree[]", Array.isArray(data.degree) ? data.degree : [data.degree].filter(Boolean));
	populateChips(div, "major[]", Array.isArray(data.major) ? data.major : [data.major].filter(Boolean));

	return div;
}

/* -------------------------------------------------------------
* --------------------- 🔹 Resume Section ---------------------
* -------------------------------------------------------------- */
function createResumeBlock(data = {}) {
    const div = document.createElement('div');
    div.className = 'border rounded-md p-3 mb-3 bg-white resume-block';

    div.innerHTML = `
        <div class="space-y-2">
            
			<div class="grid grid-cols-2 gap-3">
				<div>
					<input type="text" name="resumeCategory[]" placeholder="Category" class="form-control resume-title" />
				</div>
				<div>
					<select name="resumeCountry[]" class="form-control country-select">
						<option value="">Select Country</option>
					</select>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-3">
				<div>
					<select name="resumeState[]" class="form-control state-select" disabled>
						<option value="">Select State/Province</option>
					</select>
				</div>

				<div>
					<input type="text" name="resumeCity[]" placeholder="City" class="form-control resume-city" />
				</div>
			</div>

			<div>
                <input type="file" name="resume[]" accept=".pdf,.doc,.docx" class="form-control resume-file" />
                <div class="text-sm text-gray-500 uploaded-resume-file" style="display:none;"></div>
            </div>
        </div>

		
		<div class="flex items-center justify-between mt-3">
  
			<button type="button" class="btn btn-outline-danger remove-btn">
				Remove
			</button>

			<button type="button" class="mr-2 mt-1 star star-btn" 
					aria-pressed="false" 
					aria-label="Mark as primary resume" 
					data-tooltip="Mark as primary resume">
				<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>
				</svg>
			</button>

		</div>
    `;

    // Remove block
    div.querySelector('.remove-btn').onclick = () => {
		let shouldMarkFirstBlockPrimary = false;
		if ( // Current block is primary.
			(
				div.querySelector('.star-btn').classList.contains('active') 
				&& div.querySelector('.star-btn').hasAttribute('aria-pressed') == true
			)
			// More blocks might exists after delition.
			&& document.getElementById('resumeContainer').children.length > 1
		) {
			shouldMarkFirstBlockPrimary = true;
		}
		div.remove()
		// Update primary block if required after only deletion.
		if (shouldMarkFirstBlockPrimary) setPrimaryResume(document.getElementById('resumeContainer').children[0]);
	};

    // Country & state logic
    const countrySelect = div.querySelector('.country-select');
    const stateSelect = div.querySelector('.state-select');
	const starBtn = div.querySelector(".star-btn");

    Object.keys(countries).forEach(country => {
        const opt = document.createElement('option');
        opt.value = country;
        opt.textContent = country;
        countrySelect.appendChild(opt);
    });
    countrySelect.addEventListener('change', e => {
        const selectedCountry = e.target.value;
        stateSelect.innerHTML = '<option value="">Select State/Province</option>';
        stateSelect.disabled = true;
        if (countries[selectedCountry]) {
            countries[selectedCountry].forEach(state => {
                const opt = document.createElement('option');
                opt.value = state;
                opt.textContent = state;
                stateSelect.appendChild(opt);
            });
            stateSelect.disabled = false;
        }
    });
	starBtn.addEventListener("click", () => {
		setPrimaryResume(div);
	});

    // Prefill data
    if (Object.keys(data).length) {
        setFieldValue(div.querySelector('.resume-title'), data.resumeCategory);
        setFieldValue(countrySelect, data.resumeCountry);
        countrySelect.dispatchEvent(new Event("change"));
        setTimeout(() => setFieldValue(stateSelect, data.resumeState), 50);
		setFieldValue(div.querySelector('.resume-city'), data.resumeCity);
        if (data.resumeStoredPath) {
            const uploadedDiv = div.querySelector('.uploaded-resume-file');
            uploadedDiv.textContent = `Uploaded: ${data.resumeStoredPath}`;
            uploadedDiv.style.display = "block";
			uploadedDiv.classList.add('mt-1.5', 'ml-1.5');
        }
    }

    return div;
}

/* -------------------------------------------------------------
* --------------------- 🔹 Project Section ---------------------
* -------------------------------------------------------------- */
function createProjectBlock(data = {}) {
    const div = document.createElement("div");
    div.className = "border rounded-md p-3 mb-3 bg-white project-block";

	div.innerHTML = `
        <div class="space-y-2">
            <div class="grid grid-cols-2 gap-3">
				<div class="input-inline-label">
					<span>Name</span>
					<div class="divider"></div>
					<input type="text" class="form-control project-title" style="outline: none; box-shadow: none;" placeholder="" />
				</div>
				<div class="input-inline-label">
					<span>URL</span>
					<div class="divider"></div>
					<input type="url" class="form-control project-url" style="outline: none; box-shadow: none;" placeholder="https://..." />
				</div>
            </div>

            <div class="md:col-span-2">
                <textarea class="form-control project-description" rows="3" placeholder="Describe the project..."></textarea>
            </div>

			<div data-component="free-multiselect" class="p-0">
				<div class="w-full multiselect-wrapper">
					<input type="text" placeholder="Topics" name="projectTopics[]" class="project-topics form-control pl-3 flex-1 min-w-[120px]" autocomplete="off" />
					<div class="chips-container chips-container-floater flex flex-wrap gap-2"></div>
				</div>
			</div>

            <div class="md:col-span-2">
                <input type="file" class="form-control project-file" />
                <div class="text-sm text-gray-500 uploaded-project-file" style="display:none;"></div>
            </div>
        </div>

        <button type="button" class="btn btn-outline-danger mt-3 remove-btn">Remove</button>
    `;

    div.querySelector(".remove-btn").onclick = () => div.remove();

	// Prefill chips if available
	initializeFreeMultiselect({scope: div});

    // Prefill data
    if (Object.keys(data).length) {
        setFieldValue(div.querySelector(".project-title"), data.title);
        setFieldValue(div.querySelector(".project-url"), data.url);
        setFieldValue(div.querySelector(".project-description"), data.description);

		
		// Populate chips for degree & major
		populateChips(div, "projectTopics[]", Array.isArray(data.topics) ? data.topics : [data.topics].filter(Boolean));

        if (data.projectStoredPath) {
            const uploadedDiv = div.querySelector('.uploaded-project-file');
            uploadedDiv.textContent = `Uploaded: ${data.projectStoredPath}`;
            uploadedDiv.style.display = "block";
			uploadedDiv.classList.add('mt-1.5', 'ml-1.5');
        }
    }

    return div;
}

/* -------------------------------------------------------------
* --------------------- 🔹 Achievement Section -----------------
* -------------------------------------------------------------- */
function createAchievementBlock(data = {}) {
    const div = document.createElement("div");
    div.className = "border rounded-md p-3 mb-3 bg-white achievement-block";

    div.innerHTML = `
        <div class="space-y-2">

			<div class="grid grid-cols-2 gap-3">
				<div class="input-inline-label">
					<span>Name</span>
					<div class="divider"></div>
					<input type="text" class="form-control achievement-title" style="outline: none; box-shadow: none;" placeholder="" />
				</div>
				<div class="input-inline-label">
					<span>URL</span>
					<div class="divider"></div>
					<input type="url" class="form-control achievement-url" style="outline: none; box-shadow: none;" placeholder="https://..." />
				</div>
            </div>

            <div class="md:col-span-2">
                <textarea class="form-control achievement-description" rows="3" placeholder="Describe the achievement"></textarea>
            </div>

            <div class="md:col-span-2">
                <input type="file" class="form-control achievement-file" />
                <div class="text-sm text-gray-500 uploaded-achievement-file" style="display:none;"></div>
            </div>
        </div>

        <button type="button" class="btn btn-outline-danger mt-3 remove-btn">Remove</button>
    `;

    div.querySelector(".remove-btn").onclick = () => div.remove();

    // Prefill data
    if (Object.keys(data).length) {
        setFieldValue(div.querySelector(".achievement-title"), data.title);
        setFieldValue(div.querySelector(".achievement-description"), data.description);
        setFieldValue(div.querySelector(".achievement-url"), data.url);

        if (data.achievementStoredPath) {
            const uploadedDiv = div.querySelector('.uploaded-achievement-file');
            uploadedDiv.textContent = `Uploaded: ${data.achievementStoredPath}`;
            uploadedDiv.style.display = "block";
			uploadedDiv.classList.add('mt-1.5', 'ml-1.5');
        }
    }

    return div;
}


/* --------------------------------------------------------------------------------------------------
* ---------------------------- 🔹 Dynamic • Add / Remove Sections [END] ----------------------------
* ---------------------------------------------------------------------------------------------------
*/




/* --------------------------------------------------------------------------------------------------
* --------------------------------- 🔹 Other Dynamic Fields [START] ---------------------------------
* ---------------------------------------------------------------------------------------------------
*/

/* -------------------------------------------------------------
* ---------------- 🔹 Salary Toggle (Single/Range) ------------
* -------------------------------------------------------------- */

const expectedSalaryToggle = document.getElementById("salaryRangeToggle");
const expectedSalarySingle = document.getElementById("salarySingle");
const expectedSalaryRange = document.getElementById("salaryRange");
const expectedSalaryRangeMin = document.getElementById("salaryRangeMin");
const expectedSalaryRangeMax = document.getElementById("salaryRangeMax");
expectedSalaryToggle.addEventListener("change", () => {
	if (expectedSalaryToggle.checked) {
		expectedSalarySingle.classList.add("hidden");
		expectedSalarySingle.value = "";
		expectedSalaryRange.classList.remove("hidden");
	} else {
		expectedSalaryRange.classList.add("hidden");
		expectedSalaryRange.querySelectorAll("input").forEach(i => (i.value = ""));
		expectedSalarySingle.classList.remove("hidden");
	}
});




/* --------------------------------------------------------------------------------------------------
* ---------------------------------- 🔹 Other Dynamic Fields [END] ----------------------------------
* ---------------------------------------------------------------------------------------------------
*/



/* -------------------------------------------------------------------------------------------------
* ---------------------------------------- 🔹 Populate Form ----------------------------------------
* --------------------------------- Exported Data(data) for app.js ---------------------------------
* --------------------------------------------------------------------------------------------------
*/
// Containers and Add buttons
const linksContainer = document.querySelector('.links-fields-container');
const employmentModal = document.getElementById('employmentInfo');
const addressContainer = document.getElementById('addressContainer');
const workContainer = document.getElementById('workContainer');
const educationContainer = document.getElementById('educationContainer');
const resumeContainer = document.getElementById('resumeContainer');
const projectsContainer = document.getElementById("projectsContainer");
const achievementsContainer = document.getElementById("achievementsContainer");
const skillsContainer = document.getElementById("skillsContainer");
document.getElementById('addLink').onclick = () => linksContainer.appendChild(createUrlField());
document.getElementById('addAddress').onclick = () => {
	const block = createAddressBlock();
	addressContainer.appendChild(block);
	if (addressContainer.children.length === 1) setPrimaryAddress(block);
}
document.getElementById('addWork').onclick = () => workContainer.appendChild(createWorkBlock());
document.getElementById('addEducation').onclick = () => educationContainer.appendChild(createEducationBlock());
document.getElementById('addResume').onclick = () => {
	const block = createResumeBlock();
	resumeContainer.appendChild(block);
	if (resumeContainer.children.length === 1) setPrimaryResume(block);
}
document.getElementById("addProject").onclick = () => projectsContainer.appendChild(createProjectBlock());
document.getElementById("addAchievement").onclick = () => achievementsContainer.appendChild(createAchievementBlock());

initializeFreeMultiselect({scope: skillsContainer, maxChips: 50})

// 🔹 Populate Form from JSON
window.populateData = function(data) {
  	if (!data) return;

	Object.entries(data).forEach(([key, value]) => {
		if (value === null || value === undefined) return;

		// 1️⃣ Find element(s) by name
		const el = document.querySelector(`[name='${key}']`);

		// Skip if element not found or value is an object (we can handle nested later if needed)
		if (!el) return;

		// 2️⃣ Handle checkboxes
		if (el.type === "checkbox") {
			el.checked = !!value;

		// 3️⃣ Handle radios
		} else if (el.type === "radio") {
			const radios = document.querySelectorAll(`input[name='${key}']`);
			const valueStr = typeof value === "boolean" ? String(value) : value;
			radios.forEach(radio => {
				radio.checked = radio.value === valueStr;
			});

		// 4️⃣ Handle text / number / date / url etc.
		} else {
			el.value = value;
		}
	});


	/**
	 * Populate radio/checkbox fields from database
	 * @param {Object} data - database object containing additionalInfo
	 * @param {string[]} fields - list of field names to populate
	 */
	function populateRadioOrCheckboxFieldsFromDB(data, nameAttributeValues) {

		nameAttributeValues.forEach(nameAttributeValue => {
			const dbValue = data[nameAttributeValue];

			if (dbValue === undefined || dbValue === null) return;

			// Convert boolean to string for matching value attributes in HTML
			const valueToMatch = typeof dbValue === 'boolean' ? String(dbValue) : dbValue;

			// Find the radio/checkbox input with matching value
			const input = document.querySelector(`input[name="${nameAttributeValue}"][value="${valueToMatch}"]`);
			
			if (input) input.checked = true;
		});
	}


	// ----- Populate Form from JSON 🔹 Other URLs -----
	if (Array.isArray(data.otherURLs)) {
		linksContainer.innerHTML = ""; // clear existing block
		data.otherURLs.forEach(url => { linksContainer.appendChild(createUrlField(url)); });
		// [Optional] If no URLs, add at least one empty field
		if (!data.otherURLs.length)  linksContainer.appendChild(createUrlField());
	}

	// ----- Populate Form from JSON 🔹 EEO (Employment Info) Modal -----
	if (employmentModal && data.employmentInfo) {

		populateRadioOrCheckboxFieldsFromDB(
			data.employmentInfo, 
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
			]
		);

		// Text Input Fields (inside Employment Info modal) 
		if (data.employmentInfo.visaStatus != null) employmentModal.querySelector('input[name="visaStatus"]').value = data.employmentInfo.visaStatus;


		// Ethnicity chips (multi-select)
		const ethnicityValues = Array.isArray(data.employmentInfo.ethnicity) ? data.employmentInfo.ethnicity : [data.employmentInfo.ethnicity].filter(Boolean);
		if (ethnicityValues) {
			populateChips(employmentModal, "ethnicity[]", ethnicityValues);
		}
		// Hide <li> (using display:none property) that are chipped.
		document.querySelectorAll('#ethnicity [data-options-list] li').forEach(li => {
			if (ethnicityValues.includes(li.dataset.value)) {
				li.style.setProperty('display', 'none');
				const input = document.querySelector('#ethnicity input');
				const chipsContainer = document.querySelector('#ethnicity .chips-container');
				const refreshOptions = () => {
					const inputVal = input.value.toLowerCase();
					const selectedValues = [...chipsContainer.children].map(c => c.dataset.value);
					document.querySelectorAll('#ethnicity [data-options-list] li').forEach(li => {
						const val = li.dataset.value;
						if (selectedValues.includes(val)) {
							li.style.display = 'none';
						} else {
							li.style.display = val.toLowerCase().includes(inputVal) ? 'block' : 'none';
						}
					});
				};
				chipsContainer.querySelector(`span[data-value="${CSS.escape(li.dataset.value)}"]`)?.addEventListener('click', refreshOptions);
			}
		});
	}

	// ----- Populate Form from JSON 🔹 Addresses -----
	if (Array.isArray(data.addresses)) {
		addressContainer.innerHTML = "";
		
		data.addresses.forEach((address, idx) => {
			const block = createAddressBlock(address);
			addressContainer.appendChild(block);

			// 🔹 Step 1: Restore Primary Address
			// If userData has primaryAddressContainerIdx, mark that block as primary
			if (typeof data.primaryAddressContainerIdx === "number" &&
				data.primaryAddressContainerIdx === idx) {
				setPrimaryAddress(block);
			}
		});

		// 🔹 Step 2: Ensure at least one primary exists
		const anyPrimary = addressContainer.querySelector("[data-primary='true']");
		if (!anyPrimary && addressContainer.children.length) {
			setPrimaryAddress(addressContainer.children[0]);
		}

	}

	// ----- Populate Form from JSON 🔹 Work Experience -----
	if (Array.isArray(data.workExperiences)) {
		workContainer.innerHTML = "";
		data.workExperiences.forEach(w => workContainer.appendChild(createWorkBlock(w)));
	}

	// ----- Populate Form from JSON 🔹 Education -----
	if (Array.isArray(data.education)) {
		educationContainer.innerHTML = "";
		data.education.forEach(e => { educationContainer.appendChild(createEducationBlock(e)); });
	}

	// ----- Populate Form from JSON 🔹 Resumes -----
	if (Array.isArray(data.resumes)) {
		resumeContainer.innerHTML = "";

		data.resumes.forEach((resume, idx) => {
			const block = createResumeBlock({
				resumeCategory: resume.resumeCategory || "",
				resumeCountry: resume.resumeCountry || "",
				resumeState: resume.resumeState || "",
				resumeCity: resume.resumeCity || "",
				resumeStoredPath: resume.resumeStoredPath || "",
			});

			resumeContainer.appendChild(block);

			// 🔹 Step 1: Restore Primary Resume
			// If userData has primaryResumeContainerIdx, mark that block as primary
			if (typeof data.primaryResumeContainerIdx === "number" &&
				data.primaryResumeContainerIdx === idx) {
				setPrimaryResume(block);
			}
		});

		// 🔹 Step 2: Ensure at least one primary exists
		const anyPrimary = resumeContainer.querySelector("[data-primary='true']");
		if (!anyPrimary && resumeContainer.children.length) {
			setPrimaryResume(resumeContainer.children[0]);
		}
	}

    // ----- Populate Form from JSON 🔹 Projects -----
    if (data.projects && typeof data.projects === "object") {
        projectsContainer.innerHTML = "";
        Object.entries(data.projects).forEach(([title, project]) => {
            projectsContainer.appendChild(createProjectBlock({
                title: title,
                description: project.description || "",
                topics: project.topics || [],
                url: project.url || "",
                projectStoredPath: project.file || "", // new consistent field
            }));
        });

        // // Ensure one empty block if none exist
        // if (!Object.keys(data.projects).length) projectsContainer.appendChild(createProjectBlock());
    }

    // ----- Populate Form from JSON 🔹 Achievements -----
    if (data.achievements && typeof data.achievements === "object") {
        achievementsContainer.innerHTML = "";
        Object.entries(data.achievements).forEach(([title, achievement]) => {
            achievementsContainer.appendChild(createAchievementBlock({
                title: title,
                description: achievement.description || "",
                url: achievement.url || "",
                achievementStoredPath: achievement.file || "", // new consistent field
            }));
        });

        // // Ensure one empty block if none exist
        // if (!Object.keys(data.achievements).length) achievementsContainer.appendChild(createAchievementBlock());
    }

	// ----- Populate Form from JSON 🔹 Additional Information -----
	populateChips(skillsContainer, "skills[]", Array.isArray(data.skills) ? data.skills : [data.skills].filter(Boolean));
	document.querySelector('#enabledUserSkillsSelection').checked = data.enabledUserSkillsSelection;
	document.querySelector('#enabledJobSkillsSelection').checked = data.enabledJobSkillsSelection;
	document.querySelector('#enabledRelatedSkillsSelection').checked = data.enabledRelatedSkillsSelection;
	expectedSalaryToggle.dispatchEvent(new Event('change'));
	if (data.useSalaryRange) {
		setFieldValue(expectedSalaryRangeMin, data?.salaryExpectation?.min || '')
		setFieldValue(expectedSalaryRangeMax, data?.salaryExpectation?.max || '')
	} else {
		setFieldValue(expectedSalarySingle, data?.salaryExpectation?.min || '')
	}


};

/* --------------------------------------------------------------------------------------------------
* ------------------------------------ 🔹 Adjust UI After Submit ------------------------------------
* ----------------------------------------------------------------------------------------------------
*/
// 🔹 Adjust UI After Submit
window.updateUIAfterSubmit = function(response) {

	if (response.success) {
		// Update Resume Container UI
        if (response.uploadedFiles && response.uploadedFiles.resumes) {
            // Iterate over all uploaded resumes
            Object.entries(response.uploadedFiles.resumes).forEach(([containerIdx, containerPayload]) => {
				 document.querySelectorAll("#resumeContainer > div").forEach((div, idx) => {
                    if (idx == parseInt(containerIdx)) {
                        const inputFile = div.querySelector("input[name='resume[]']");
                        const uploadedDiv = div.querySelector(".uploaded-resume-file");

                        // Clear the file input
                        inputFile.value = "";

                        // If the file is being replaced, remove the old path
                        if (containerPayload.method === "replace" && uploadedDiv) {
                            uploadedDiv.textContent = ""; // Clear old path
                            uploadedDiv.style.display = "none"; // Hide the old path
                        }

                        // Show the new file path
                        uploadedDiv.textContent = `Uploaded: ${containerPayload.resumeStoredPath}`;
                        uploadedDiv.style.display = "block"; // Show the new file path
                    }
                });
            });
        }

		// Update Projects Container UI
        if (response.uploadedFiles && response.uploadedFiles.projects) {
            Object.entries(response.uploadedFiles.projects).forEach(([containerIdx, containerPayload]) => {
                document.querySelectorAll("#projectsContainer > div").forEach((div, idx) => {
                    if (idx == parseInt(containerIdx)) {
                        const inputFile = div.querySelector("input[type='file']");
                        const uploadedDiv = div.querySelector(".uploaded-project-file");

                        // Clear the file input
                        inputFile.value = "";

                        // Show the new file path
                        uploadedDiv.textContent = `Uploaded: ${containerPayload.fileStoredPath}`;
                        uploadedDiv.style.display = "block"; // Show the new file path
                    }
                });
            });
        }

        // Update Achievements Container UI
        if (response.uploadedFiles && response.uploadedFiles.achievements) {
            Object.entries(response.uploadedFiles.achievements).forEach(([containerIdx, containerPayload]) => {
                document.querySelectorAll("#achievementsContainer > div").forEach((div, idx) => {
                    if (idx == parseInt(containerIdx)) {
                        const inputFile = div.querySelector("input[type='file']");
                        const uploadedDiv = div.querySelector(".uploaded-achievement-file");

                        // Clear the file input
                        inputFile.value = "";

                        // Show the new file path
                        uploadedDiv.textContent = `Uploaded: ${containerPayload.fileStoredPath}`;
                        uploadedDiv.style.display = "block"; // Show the new file path
                    }
                });
            });
        }

	}

	// ---- Animation handling ----
	const submitBtn = document.getElementById("nextBtn");
	const successIcon = document.querySelector(".done");
	const failIcon = document.querySelector(".failed");

	// Stop spinner
	submitBtn.classList.add("hide-loading");

	// Show icon based on response
	const targetIcon = response.success ? successIcon : failIcon;
	targetIcon.classList.add("finish");

	// Reset after animation
	setTimeout(() => {
		submitBtn.classList.remove("loading", "hide-loading");
		successIcon.classList.remove("finish");
		failIcon.classList.remove("finish");
	}, 1200);
}