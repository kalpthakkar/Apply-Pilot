// app\ui\scripts\jobboard\jobrights.js
import { getChipsValues, populateChips, populateRadioOrCheckboxFields } from '../utils/jobboard.js'

export class JobRights {

    loadPopup() {

        document.body.style.width = '360px';
        document.getElementById('jobboard').innerHTML = `
            <div id="jobboard-config" class="mt-3 space-y-4">

            <div id="jobboard-message"></div>

            <!-- ATS Filter -->
            <div class="flex flex-wrap gap-3 mb-1">
                <div class="text-xs mb-1">ATS PLatforms</div>
                <div data-component="free-multiselect" class="p-0">
                    <div class="multiselect-wrapper">
                        <input
                        type="text"
                        id="atsFilterInput"
                        name="atsFilter[]"
                        placeholder="e.g. workday... (press Enter)"
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
                <div class="input-inline-label">
                    <span>Recent</span>
                    <div class="divider"></div>
                    <input type="number" id="publishedHours" class="form-control" style="outline: none; box-shadow: none;" value="48" min="0"  />
                    <span class="ml-2">&nbsp; hours</span>
                </div>
            </div>

            <!-- Preferences -->
            <div class="space-y-3">

                <div class="flex flex-wrap gap-3">
                
                    <div>
                        <div class="text-xs mb-1">Reposted</div>
                        <div class="toggle-btn" data-pref="isReposted"></div>
                    </div>

                    <div>
                        <div class="text-xs mb-1">H1B Sponsor</div>
                        <div class="toggle-btn" data-pref="isH1bSponsor"></div>
                    </div>

                    <div>
                        <div class="text-xs mb-1">Work Auth Required</div>
                        <div class="toggle-btn" data-pref="isWorkAuthRequired"></div>
                    </div>

                    <div>
                        <div class="text-xs mb-1">Citizen Only</div>
                        <div class="toggle-btn" data-pref="isCitizenOnly"></div>
                    </div>

                    <div>
                        <div class="text-xs mb-1">Clearance</div>
                        <div class="toggle-btn" data-pref="isClearanceRequired"></div>
                    </div>

                    <div>
                        <div class="text-xs mb-1">Remote</div>
                        <div class="toggle-btn" data-pref="isRemote"></div>
                    </div>
                
                </div>

            </div>

            <!-- Fetch Button -->
            <button id="fetch-jobs-btn" class="btn w-100 mt-4 mb-4" style="background-color: #00f0a0;">
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
    }

    populateForm() {
        populateChips(
            document.querySelector(`[id="jobboard"]`),
            "atsFilter[]",
            ['workday', 'greenhouse']
        )
        populateRadioOrCheckboxFields({
            "isReposted": "null",
            "isH1bSponsor": "null",
            "isWorkAuthRequired": "null",
            "isCitizenOnly": "null",
            "isClearanceRequired": "null",
            "isRemote": "null"
        });
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

        return {
            ats: getChipsValues('atsFilterInput'),
            publishedWithinHours: Number(
                document.getElementById('publishedHours').value || 0
            ),
            preferences,
            sort: [
                {
                    field: 'publishTime',
                    order: 'desc',
                    type: 'date',
                    format: 'DD-MM-YYYY HH:mm'
                },
                {
                    field: 'matchScore',
                    order: 'desc',
                    type: 'number'
                }
            ]
        };
    }

}

