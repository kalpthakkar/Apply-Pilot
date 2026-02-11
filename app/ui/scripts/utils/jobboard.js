// app\ui\scripts\utils\jobboard.js
// ============================================================================
// 📁 Global Dependencies
// ============================================================================
import { getActiveTab, sendMessage } from './shared.js';

// ============================================================================
// 📁 JobBoard Dependencies
// ============================================================================
// ------------ JobRights ------------
import { JobRights } from '../jobboard/jobrights.js';
// ------------ HiringCafe ------------
import { HiringCafe } from '../jobboard/hiringcafe.js';


// ============================================================================
// 🧩 Config
// ============================================================================
/* --------------------------------------------------------------------------
 * 🎨 DOM REFERENCES
 * ------------------------------------------------------------------------ */
const fetchJobsBtn = () => document.getElementById('fetch-jobs-btn');
const typingSpan = () => fetchJobsBtn().querySelector('.typing-text');
/* --------------------------------------------------------------------------
 * 🎨 JOB-BOARD INSTANCE
 * ------------------------------------------------------------------------ */
let jobboard;


export function commitElement(el) {
    if (!(el instanceof HTMLElement)) return;
    if (!el.isConnected) return;

    el.dispatchEvent(new FocusEvent("focusout", {
        bubbles: true,
        composed: true,
        relatedTarget: document.body
    }));

    try { el.blur(); } catch {}
}

/* -------------------------------------------------------------
* ----------- Input Type Multi-select 🔹 Chip Logic -----------
* -------------------------------------------------------------- */
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
* ------- Input Type Multi-select 🔹 Options Independent -------
* -------------------------------------------------------------- */
export function initializeFreeMultiselect({ scope = document, maxChips = Infinity, onMaxReached } = {}) {

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

export function initializeMultiSelectDropdown(container) {
    const inputWrapper = container.querySelector('.multiselect-wrapper') || container;
    const input = inputWrapper.querySelector('input');
    if (!input) return;

    // Ensure chips container exists
    let chipsContainer = inputWrapper.querySelector('.chips-container');
    if (!chipsContainer) {
        chipsContainer = document.createElement('div');
        chipsContainer.className = 'chips-container flex flex-wrap gap-2 mb-1';
        inputWrapper.insertBefore(chipsContainer, input);
    }

    const optionsList = inputWrapper.querySelector('[data-options-list]');
    if (!optionsList) return;

    const allOptions = [...optionsList.querySelectorAll('li')];

    // Helper to update dropdown position
    const updateDropdownPosition = () => {
        const rect = input.getBoundingClientRect();
        optionsList.style.top = `${input.offsetTop + input.offsetHeight}px`;
        optionsList.style.left = `${input.offsetLeft}px`;
        optionsList.style.width = `${input.offsetWidth}px`;
    };

    // Show dropdown
    const showDropdown = () => {
        optionsList.style.display = 'block';    // force display
        optionsList.classList.remove('hidden'); // remove Tailwind hidden
        updateDropdownPosition();
    };

    // Hide dropdown
    const hideDropdown = () => {
        optionsList.style.display = 'none';     // force hide
        optionsList.classList.add('hidden');    // add Tailwind hidden
    };

    // Filter options based on input and existing chips
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

    // Handle option selection
    optionsList.addEventListener('mousedown', e => {
        if (e.target.tagName !== 'LI') return;
        e.preventDefault();

        const value = e.target.dataset.value;

        // Prevent duplicate chips
        if ([...chipsContainer.children].some(c => c.dataset.value === value)) return;

        // Create chip
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.dataset.value = value;
        chip.textContent = value;
        chip.addEventListener('click', () => {
            chip.remove();
            refreshOptions(); // show removed option again
        });
        chipsContainer.appendChild(chip);

        input.value = '';
        refreshOptions();
        hideDropdown(); // close dropdown after selection

        function commitElement(el) {
            if (!(el instanceof HTMLElement)) return;
            if (!el.isConnected) return;

            el.dispatchEvent(new FocusEvent("focusout", {
                bubbles: true,
                composed: true,
                relatedTarget: document.body
            }));

            try { el.blur(); } catch {}
        }
        commitElement(input);
    });

    input.addEventListener(
        'keydown',
        e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopImmediatePropagation();
                return false;
            }
        },
        true
    );

    // Input focus → show dropdown
    input.addEventListener('focus', showDropdown);

    // Input change → filter options
    input.addEventListener('input', refreshOptions);

    // Blur → hide dropdown (with small delay to allow click)
    input.addEventListener('blur', () => setTimeout(hideDropdown, 150));

    // Initial refresh
    refreshOptions();

    // ✅ Hide dropdown on init
    hideDropdown();

}

export function initOneWaySliders() {
    // Find all elements with the class `one-way-range` in the DOM
    const sliders = document.querySelectorAll('.one-way-range');

    sliders.forEach(slider => {
        const leftThumb = slider.querySelector(".thumb.left");
        const range = slider.querySelector(".range");
        const track = slider.querySelector(".track");

        const MIN = 0; // default min value (customize as needed)
        const MAX = 1000; // default max value (customize as needed)

        let leftValue = MIN;

        // Convert value to percentage for positioning
        function valueToPercent(val) {
            return ((val - MIN) / (MAX - MIN)) * 100;
        }

        // Update the UI when value changes
        function updateUI() {
            const leftPct = valueToPercent(leftValue);

            // Position the thumb based on the percentage
            leftThumb.style.left = `${leftPct}%`;

            // Update the range (the line between the thumb and the right boundary)
            range.style.left = `${0}%`; // Range always starts from left
            range.style.width = `${leftPct}%`; // Range width is based on the thumb's position

            // Update tooltip dynamically
            leftThumb.setAttribute("data-tooltip", leftValue);
        }

        // Start dragging function
        function startDrag(e) {
            e.preventDefault();

            const onMove = (ev) => {
                const rect = track.getBoundingClientRect();
                const x = Math.min(Math.max(ev.clientX - rect.left, 0), rect.width);
                const value = Math.round(MIN + (x / rect.width) * (MAX - MIN));

                // Set left thumb value (value can be between MIN and MAX)
                leftValue = Math.min(value, MAX); // Ensure leftValue never exceeds MAX

                updateUI();
            };

            const stopDrag = () => {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", stopDrag);
            };

            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", stopDrag);
        }

        // Add mouse down event for the left thumb
        leftThumb.addEventListener("mousedown", startDrag);

        // Init slider
        updateUI();

        // Optional: Expose current value externally
        slider.getValue = () => ({ min: leftValue });
    });
}



export function initDualRangeSliders() {
    // Find all elements with the class `dual-range` in the DOM
    const sliders = document.querySelectorAll('.dual-range');

    sliders.forEach(slider => {
        const leftThumb = slider.querySelector(".thumb.left");
        const rightThumb = slider.querySelector(".thumb.right");
        const range = slider.querySelector(".range");
        const track = slider.querySelector(".track");

        const MIN = 0; // default min value (customize as needed)
        const MAX = 20; // default max value (customize as needed)
        const GAP = 0;  // default gap to prevent overlap (customize as needed)

        let leftValue = MIN;
        let rightValue = MAX;

        // Convert value to percentage for positioning
        function valueToPercent(val) {
            return ((val - MIN) / (MAX - MIN)) * 100;
        }

        // Update the UI when values change
        function updateUI() {
            const leftPct = valueToPercent(leftValue);
            const rightPct = valueToPercent(rightValue);

            // Correctly position the thumbs based on the percentages
            leftThumb.style.left = `${leftPct}%`;
            rightThumb.style.left = `${rightPct}%`;

            // Update the range (the line between the two thumbs)
            range.style.left = `${leftPct}%`;
            range.style.width = `${rightPct - leftPct}%`;

            // Update tooltips dynamically
            leftThumb.setAttribute("data-tooltip", leftValue);
            rightThumb.setAttribute("data-tooltip", rightValue);
        }

        // Start dragging function
        function startDrag(e, isLeft) {
            e.preventDefault();

            const onMove = (ev) => {
                const rect = track.getBoundingClientRect();
                const x = Math.min(Math.max(ev.clientX - rect.left, 0), rect.width);
                const value = Math.round(MIN + (x / rect.width) * (MAX - MIN));

                if (isLeft) {
                    leftValue = Math.min(value, rightValue - GAP);  // Prevent left thumb from crossing right thumb
                } else {
                    rightValue = Math.max(value, leftValue + GAP);  // Prevent right thumb from crossing left thumb
                }

                updateUI();
            };

            const stopDrag = () => {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", stopDrag);
            };

            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", stopDrag);
        }

        // Add mouse down events for both thumbs
        leftThumb.addEventListener("mousedown", (e) => startDrag(e, true));
        rightThumb.addEventListener("mousedown", (e) => startDrag(e, false));

        // Init slider
        updateUI();

        // Optional: Expose current values (left and right) externally
        slider.getValue = () => ({ min: leftValue, max: rightValue });
    });
}



/* ------------------------------------------------------------------ */
/* 🧠 Extract Chips Values                                             */
/* ------------------------------------------------------------------ */
export function getChipsValues(inputId) {
  const wrapper = document.getElementById(inputId)
    .closest('.multiselect-wrapper');
  return [...wrapper.querySelectorAll('.chip')]
    .map(chip => chip.dataset.value);
}

/* ------------------------------------------------------------------ */
/* 🔘 Tri-state Toggle Generator                                      */
/* ------------------------------------------------------------------ */
function renderTriStateToggle(container, name) {
  const options = [
    { label: 'Yes', value: 'true' },
    { label: 'No', value: 'false' },
    { label: 'Any', value: 'null' }
  ];

  container.innerHTML = options.map(opt => `
    <input type="radio" id="${name}-${opt.value}" name="${name}" value="${opt.value}">
    <label for="${name}-${opt.value}">${opt.label}</label>
  `).join('');
}

/* ------------------------------------------------------------------ */
/* 🚀 Initialize UI                                                    */
/* ------------------------------------------------------------------ */
function initJobBoardUI() {

    // Chips
    initializeFreeMultiselect({
        scope: document.getElementById('jobboard-config'),
        maxChips: 20
    });

    // Tri-state toggles
    document.querySelectorAll('[data-pref]').forEach(el => {
        renderTriStateToggle(el, el.dataset.pref);
    });

    fetchJobsBtn().addEventListener('click', async () => {

        const tab = await getActiveTab();
        if (!tab?.id) return;

        document.querySelector(`[id="fetch-jobs-btn"] span`).style.display = "none";
        document.querySelector(`[class="ball-pulse"]`).style.display = "block";
        fetchJobsBtn().disabled = true;
        const config = jobboard.collectJobBoardConfig();
        console.log('[Popup] Job Board Config:', config);

        await sendMessage('startTabExecution', {
            tabId: tab.id,
            payload: config
        });
        return false;

    });

}


export function populateRadioOrCheckboxFields(name_value_map) {
    Object.entries(name_value_map).forEach(([name, value]) => {
        if (value == null) return;

        const valueToMatch = String(value);
        const input = document.querySelector(
        `input[name="${name}"][value="${valueToMatch}"]`
        );

        if (input) input.checked = true;
    });
}

export const populateChips = (parent, nameOfInput, values) => {
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


/* --------------------------------------------------------------------------
 * ▶️ FETCH BUTTON
 * ------------------------------------------------------------------------ */
async function animateButtonMessage(message, pause = 1500) {
	fetchJobsBtn().disabled = false;
	fetchJobsBtn().style.pointerEvents = "none";
    // Typing animation
    typingSpan().textContent = '';
    for (let i = 0; i < message.length; i++) {
        typingSpan().textContent += message[i];
        await new Promise(res => setTimeout(res, 50));
    }

    // Pause with full message
    await new Promise(res => setTimeout(res, pause));

    // Backspace animation
    for (let i = message.length; i > 0; i--) {
        typingSpan().textContent = message.slice(0, i - 1);
        await new Promise(res => setTimeout(res, 30));
    }

    // Restore original text
	document.querySelector(`[id="fetch-jobs-btn"] span`).style.display = "block";
	fetchJobsBtn().style.pointerEvents = "auto";
}

async function displayFetchResult(success, fetchCount) {
    document.querySelector(`[class="ball-pulse"]`).style.display = "none";
    if (success) await animateButtonMessage(`${fetchCount} jobs fetched`);
    else await animateButtonMessage('Something went wrong! Please try later.');
}

export async function updateJobBoardUI(tabState) {

    if (document.getElementById('jobboard').style.display != 'block' || jobboard == null) {

        // Fetch JobBoard Instance
        switch (tabState.platform.name) {
            case "JobRights": {
                jobboard = new JobRights();
                break;
            }
            case "HiringCafe": {
                jobboard = new HiringCafe();
                break;
            }
        }

        // Display Job board section
        document.getElementById('ats').style.display = 'none';
        jobboard.loadPopup();
        document.getElementById('jobboard').style.display = 'block';
        initJobBoardUI();
        jobboard.populateForm();
    }
    
    if (tabState.state === 'fetchCompleted') await displayFetchResult(tabState.fetchSuccess, tabState.fetchJobsCount);
 


}