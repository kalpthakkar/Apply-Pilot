// app\ui\scripts\jobboard\hiringcafe.js
import { commitElement, initOneWaySliders, initDualRangeSliders, initializeMultiSelectDropdown, getChipsValues, populateChips, populateRadioOrCheckboxFields } from '../utils/jobboard.js'


export class HiringCafe {

    loadPopup() {
        document.body.style.width = '460px';
        document.getElementById('jobboard').innerHTML = `
            <div id="jobboard-config" class="mt-3 space-y-4">

            <div id="jobboard-message"></div>


            <!-- Published Within -->
            <div class="flex flex-wrap gap-3 mb-3" style="margin-top: 1.5rem;">
                <input type="text" id="search" name="search" placeholder="Search" class="form-control" style="border-radius: 25px;" />
            </div>

            <!-- Location -->
            <div class="mb-2">
                <label class="block font-medium mb-1">Location</label>
                <div class="multi-select-container" 
                    id="locations" 
                    data-component="free-multiselect" 
                    data-dynamic-search="location">
                    <div class="multiselect-wrapper flex flex-wrap items-center" style="width:100%;">
                        <div class="chips-container flex flex-wrap gap-2"></div>
                        <input
                            type="text"
                            placeholder="Search locations..."
                            name="locations[]"
                            class="pl-0 py-0 border-none focus:ring-0 outline-none flex-1 min-w-[120px]"
                            style="width: 100%"
                            autocomplete="off"
                        />
                        <ul
                            class="absolute left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto hidden z-50"
                            style="position: absolute; list-style-type: none; padding-left: 0; margin-left: 0;"
                            data-options-list>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- ATS Filter -->
            <div class="flex flex-wrap gap-3 mb-1">
                <div class="text-xs mb-0">ATS PLatforms</div>
                <div data-component="free-multiselect" class="p-0">
                    <div class="multiselect-wrapper">
                        <input
                        type="text"
                        id="atsFilterInput"
                        name="atsFilter[]"
                        placeholder="e.g. workday... (optional)"
                        class="form-control"
                        autocomplete="off"
                        />
                        <div class="chips-container chips-container-floater flex flex-wrap gap-2"></div>
                    </div>
                </div>
            </div>

            <!-- Published Within -->
            <div class="flex flex-wrap gap-3 mb-1">
                <div class="text-xs mb-1">Published</div>
                <div class="input-inline-label" style="width: 60%;">
                    <span>Recent</span>
                    <div class="divider"></div>
                    <input type="number" id="publishedHours" class="form-control" style="outline: none; box-shadow: none;" value="48" min="0"  />
                    <span class="ml-2">&nbsp; hours</span>
                </div>
            </div>

            <!-- Preferences -->
            <div class="space-y-3">

                <div class="flex flex-wrap gap-3">
                
                    <div class="mb-1">
                        <label class="block font-medium mb-2">Seniority</label>
                        <div class="multi-select-container" id="seniorityLevel" data-component="free-multiselect" data-multiselect-options>
                            <!-- Wrap chips + input together -->
                            <div class="multiselect-wrapper flex flex-wrap items-center" style="width:100%;">
                                <div class="chips-container flex flex-wrap gap-2"></div>
                                <input type="text" placeholder="Select..." name="seniorityLevel[]" class="pl-0 py-0 border-none focus:ring-0 outline-none flex-1 min-w-[120px]" autocomplete="off" style="cursor: pointer; width:100%;" />
                                <!-- Dropdown options list -->
                                <ul class="absolute left-0 right-0 mt-1 bg-white rounded-md shadow-lg max-h-40 overflow-y-auto hidden z-50" style="position: absolute; list-style-type: none; padding-left: 0; margin-left: 0;" data-options-list>
                                    <li class="px-3 py-2 cursor-pointer hover:bg-blue-100 hover-element" style="cursor: pointer;" data-value="No Prior Experience Required">No Prior Experience Required</li>
                                    <li class="px-3 py-2 cursor-pointer hover:bg-blue-100 hover-element" style="cursor: pointer;" data-value="Entry Level">Entry Level</li>
                                    <li class="px-3 py-2 cursor-pointer hover:bg-blue-100 hover-element" style="cursor: pointer;" data-value="Mid Level">Mid Level</li>
                                    <li class="px-3 py-2 cursor-pointer hover:bg-blue-100 hover-element" style="cursor: pointer;" data-value="Senior Level">Senior Level</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!--
                    <div class="mb-4">
                        <label class="block font-medium mb-2">Clearance</label>
                        <div class="multi-select-container" id="securityClearances" data-component="free-multiselect" data-multiselect-options>
                            <div class="multiselect-wrapper flex flex-wrap items-center" style="width:100%;">
                                <div class="chips-container flex flex-wrap gap-2"></div>
                                <input type="text" placeholder="Select..." name="securityClearances[]" class="pl-0 py-0 border-none focus:ring-0 outline-none flex-1 min-w-[120px]" autocomplete="off" style="cursor: pointer; width:100%;" />
                                <ul class="absolute left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto hidden z-50" style="position: absolute;" data-options-list>
                                    <li class="px-3 py-2 cursor-pointer hover:bg-blue-100" style="cursor: pointer;" data-value="None">None</li>
                                    <li class="px-3 py-2 cursor-pointer hover:bg-blue-100" style="cursor: pointer;" data-value="Confidential">Confidential</li>
                                    <li class="px-3 py-2 cursor-pointer hover:bg-blue-100" style="cursor: pointer;" data-value="Public Trust">Public Trust</li>
                                    <li class="px-3 py-2 cursor-pointer hover:bg-blue-100" style="cursor: pointer;" data-value="Other">Other</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    -->

                
                    <div id="securityClearances">
                        <div class="text-xs mb-1">Clearance</div>
                        <div class="toggle-btn">
                            <input type="checkbox" id="securityClearances-none" name="securityClearances" value="None">
                            <label for="securityClearances-none">None</label>
                            <input type="checkbox" id="securityClearances-confidential" name="securityClearances" value="Confidential">
                            <label for="securityClearances-confidential">Confidential</label>
                            <input type="checkbox" id="securityClearances-public-trust" name="securityClearances" value="Public Trust">
                            <label for="securityClearances-public-trust">Public Trust</label>
                            <input type="checkbox" id="securityClearances-other" name="securityClearances" value="Other">
                            <label for="securityClearances-other">Other</label>
                        </div>
                    </div>


                    <div>
                        <div class="text-xs mb-1">Visa Sponsor</div>
                        <div class="toggle-btn" data-pref="isVisaSponsor"></div>
                    </div>

                    <div>
                        <div class="text-xs mb-1">Remote</div>
                        <div class="toggle-btn" data-pref="isRemote"></div>
                    </div>


                    <div>
                        <div class="text-xs mb-0">Role & Industry Experience</div>
                        <div class="dual-range" id="roleExperienceRange" style="justify-self: center; width: 90%;">
                            <!-- Track (the background line) -->
                            <div class="track"></div>
                            <!-- The range (the area between the two thumbs) -->
                            <div class="range"></div>
                            <!-- Left thumb -->
                            <div class="thumb left custom-tooltip" data-tooltip="0" tabindex="0"></div>
                            <!-- Right thumb -->
                            <div class="thumb right custom-tooltip" data-tooltip="20" tabindex="0"></div>
                        </div>
                    </div>

                    <div>
                        <div class="text-xs mb-0">Management & Leadership Experience</div>
                        <div class="dual-range" id="managementExperienceRange" style="justify-self: center; width: 90%;">
                            <!-- Track (the background line) -->
                            <div class="track"></div>
                            <!-- The range (the area between the two thumbs) -->
                            <div class="range"></div>
                            <!-- Left thumb -->
                            <div class="thumb left custom-tooltip" data-tooltip="0" tabindex="0"></div>
                            <!-- Right thumb -->
                            <div class="thumb right custom-tooltip" data-tooltip="20" tabindex="0"></div>
                        </div>
                    </div>


                    <div>
                        <div class="text-xs mb-1">Max Jobs</div>

                        <div class="one-way-range" id="maxJobs">
                            <!-- Track (the background line) -->
                            <div class="track"></div>

                            <!-- The range (the area between the thumb and right boundary) -->
                            <div class="range"></div>

                            <!-- Left thumb (draggable) -->
                            <div class="thumb left custom-tooltip" data-tooltip="0" tabindex="0"></div>
                        </div>
                    </div>


                
                </div>

            </div>

            <!-- Fetch Button -->
            <button id="fetch-jobs-btn" class="btn w-100 mt-4 mb-4" style="background-color: #ff9bcc;">
                <div class="ball-pulse" style="display: none;">
                    <div></div>
                    <div></div>
                    <div></div>
                </div>
                <span>FETCH JOBS</span>
                <span class="typing-text"></span>
            </button>

        </div>
        `

        document.getElementById('search').addEventListener("keydown", function(event) {
            // Check if the key pressed is 'Enter' (key code 13)
            if (event.key === "Enter") {
                event.preventDefault(); // Optional: Prevent the default action (e.g., form submission if inside a form)
                commitElement(document.getElementById('search'));
            }
        });


        const locationContainer = document.getElementById('locations');
        if (locationContainer) {
            initializeLocationSearchField(locationContainer);
        }

        document.getElementById('publishedHours').addEventListener("keydown", function(event) {
            // Check if the key pressed is 'Enter' (key code 13)
            if (event.key === "Enter") {
                event.preventDefault(); // Optional: Prevent the default action (e.g., form submission if inside a form)
                commitElement(document.getElementById('publishedHours'));
            }
        });
        
        // Initialize all multi-selects
        document.querySelectorAll('[data-multiselect-options]').forEach(container => {
            initializeMultiSelectDropdown(container);
        });

        initDualRangeSliders();
        initOneWaySliders();

    }

    populateForm() {
        populateChips(
            document.querySelector(`[id="jobboard"]`),
            "atsFilter[]",
            ['workday', 'greenhouse']
        )
        populateRadioOrCheckboxFields({
            "isVisaSponsor": "null",
            "isRemote": "null"
        });
        document.getElementById('maxJobs').querySelector('.range').style.width = "5%"
        document.getElementById('maxJobs').querySelector('.thumb').style.left = "5%"
        document.getElementById('maxJobs').querySelector('.thumb').dataset.tooltip = "50"

    }

    /* ------------------------------------------------------------------ */
    /* 🧾 Collect Job Board Config                                         */
    /* ------------------------------------------------------------------ */
    collectJobBoardConfig() {
        const preferences = {};
        document.querySelectorAll('[data-pref]').forEach(el => {
            const key = el.dataset.pref;
            const selected = el.querySelector('input:checked')?.value;
            preferences[key] =
            selected === 'true' ? true :
            selected === 'false' ? false :
            null;
        });

        const getLocationChips = () => {
            const chips = document
                .getElementById('locations')
                ?.querySelectorAll('.chip');

            if (!chips || !chips.length) return null;

            return Array.from(chips).map(c => JSON.parse(c.dataset.value));
        };

        const getDropdownChips = (container) => {
            const seniorityChips = container.querySelectorAll('.multiselect-wrapper .chips-container .chip');
            if (seniorityChips.length) return Array.from(seniorityChips).map(c => c.dataset.value);
        }
        const getClearancePreference = () => {
            const clearanceSelections = Array.from(document.getElementById('securityClearances').querySelectorAll('input[type="checkbox"]:checked')).map(checkbox => checkbox.value);
            let securityClearances;
            if (clearanceSelections.length > 0) securityClearances = clearanceSelections;
            else securityClearances = null;  // No checkboxes selected, store null
            return securityClearances
        }

        return {
            search: document.getElementById('search').value,
            locations: getLocationChips(),
            ats: getChipsValues('atsFilterInput'),
            publishedWithinHours: Number(document.getElementById('publishedHours').value || 0),
            seniority: getDropdownChips(document.getElementById('seniorityLevel')),
            securityClearances: getClearancePreference(),
            isVisaSponsor: preferences['isVisaSponsor'],
            isRemote: preferences['isRemote'],
            roleYoeRange: [
                Number(document.querySelector(`#roleExperienceRange .left`).getAttribute('data-tooltip')),
                Number(document.querySelector(`#roleExperienceRange .right`).getAttribute('data-tooltip')),
            ],
            managementYoeRange: [
                Number(document.querySelector(`#managementExperienceRange .left`).getAttribute('data-tooltip')),
                Number(document.querySelector(`#managementExperienceRange .right`).getAttribute('data-tooltip')),
            ],
            maxJobs: Number(document.querySelector(`#maxJobs .left`).getAttribute('data-tooltip')),
        };
    }

}


async function searchLocations(query) {
    if (!query || query.length < 2) return [];
    try {
        const res = await fetch(
            `https://hiring.cafe/api/searchLocation?query=${encodeURIComponent(query)}`
        );
        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
}

export function initializeLocationSearchField(container) {
    const inputWrapper = container.querySelector('.multiselect-wrapper') || container;
    const input = inputWrapper.querySelector('input');
    if (!input) return;

    const optionsList = inputWrapper.querySelector('[data-options-list]');
    if (!optionsList) return;

    optionsList.classList.add('location-dropdown');

    // Ensure chips container exists
    let chipsContainer = inputWrapper.querySelector('.chips-container');
    if (!chipsContainer) {
        chipsContainer = document.createElement('div');
        chipsContainer.className = 'chips-container flex flex-wrap gap-2 mb-1';
        inputWrapper.insertBefore(chipsContainer, input);
    }

    let debounceTimer;

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    const updateDropdownPosition = () => {
        optionsList.style.top = `${input.offsetTop + input.offsetHeight}px`;
        optionsList.style.left = `${input.offsetLeft}px`;
        optionsList.style.width = `${input.offsetWidth}px`;
    };

    const showDropdown = () => {
        optionsList.style.display = 'block';
        optionsList.classList.remove('hidden');
        updateDropdownPosition();
    };

    const hideDropdown = () => {
        optionsList.style.display = 'none';
        optionsList.classList.add('hidden');
    };

    const commitElement = el => {
        if (!(el instanceof HTMLElement)) return;
        if (!el.isConnected) return;

        el.dispatchEvent(new FocusEvent('focusout', {
            bubbles: true,
            composed: true,
            relatedTarget: document.body
        }));

        try { el.blur(); } catch {}
    };

    const getSelectedValues = () =>
        [...chipsContainer.children].map(c => c.dataset.value);

    const clearOptions = () => {
        optionsList.innerHTML = '';
    };

    // ---------------------------------------------------------------------
    // Async search
    // ---------------------------------------------------------------------

    async function refreshOptions(query) {
        clearOptions();
        if (!query || query.length < 2) {
            hideDropdown();
            return;
        }

        const results = await searchLocations(query);
        if (!results?.length) {
            hideDropdown();
            return;
        }

        const selected = getSelectedValues();

        results.forEach(item => {
            const value = JSON.stringify(item.placeDetail);
            if (selected.includes(value)) return;

            const li = document.createElement('li');
            li.textContent = item.label;
            li.dataset.value = value;
            li.className =
                'px-3 py-2 cursor-pointer hover:bg-blue-100 whitespace-nowrap';

            optionsList.appendChild(li);
        });

        showDropdown();
    }

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    input.addEventListener('focus', () => {
        if (optionsList.children.length) showDropdown();
    });

    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            refreshOptions(input.value.trim());
        }, 250);
    });

    // IMPORTANT: mousedown so blur doesn't cancel selection
    optionsList.addEventListener('mousedown', e => {
        if (e.target.tagName !== 'LI') return;
        e.preventDefault();

        const value = e.target.dataset.value;
        const label = e.target.textContent;

        if (getSelectedValues().includes(value)) return;

        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.dataset.value = value;
        chip.textContent = label;

        // const close = document.createElement('span');
        // chip.classList.add('gap-2');
        // close.className = 'chip-close';
        // close.innerHTML = '&times;';
        chip.onclick = () => chip.remove();
        // chip.appendChild(close);

        chipsContainer.appendChild(chip);

        input.value = '';
        clearOptions();
        hideDropdown();
        commitElement(input);
    });

    // Blur → hide (fallback)
    input.addEventListener('blur', () => {
        setTimeout(hideDropdown, 150);
    });

    // ✅ HARD document-level close (this is what you were missing)
    document.addEventListener('mousedown', e => {
        if (!container.contains(e.target)) {
            hideDropdown();
            commitElement(input);
        }
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


    // Init
    hideDropdown();
}



