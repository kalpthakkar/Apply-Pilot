from typing import Literal
import json
import re

functions_db = {
    "querySelector": {
        "script" : r"""
/****************************
 *  Shadow DOM Deep Selector
 ****************************/
function deepQuerySelectorAll(selector, root = document) {
    const result = [];

    // Split selector by spaces
    const parts = selector.trim().split(/\s+/);

    function recursiveSearch(root, parts) {
        if (!root || parts.length === 0) return [];

        const [first, ...rest] = parts;
        const matches = [];

        // Find all elements matching the first part
        const candidates = root.querySelectorAll(first);

        for (const el of candidates) {
            if (rest.length === 0) {
                // Last part matched
                matches.push(el);
            } else {
                // Recurse into child shadowRoot if exists
                if (el.shadowRoot) {
                    matches.push(...recursiveSearch(el.shadowRoot, rest));
                }
                // Also recurse into children normally
                matches.push(...recursiveSearch(el, rest));
            }
        }

        // Also check shadowRoots of all children (in case first part is inside shadow DOM)
        for (const child of root.querySelectorAll('*')) {
            if (child.shadowRoot) {
                matches.push(...recursiveSearch(child.shadowRoot, parts));
            }
        }

        return matches;
    }

    return recursiveSearch(root, parts);
}

function deepQuerySelector(selector, root = document) {
    return deepQuerySelectorAll(selector, root)[0] || null;
}
""",
        "functions": ["deepQuerySelectorAll", "deepQuerySelector"]
    },
    "click": {
        "script": r"""
/***********************************************
 * Helper: Click element safely
 ***********************************************/
function safeClick(el) {
    if (el) el.click();
}
""",
        "functions": ["safeClick"]
    },
    "setCheckbox": {
        "script": r"""
/***********************************************
 * Helper: Set checkbox state smartly
 ***********************************************/
function setCheckbox(root, label, shouldEnable) {
    const allCheckboxes = deepQuerySelectorAll(root);

    // Find by a custom attribute (adjust to your actual label source)
    const target = allCheckboxes.find(cb => cb.label === label);

    if (!target) return console.warn("Checkbox not found:", label);

    target.checked = Boolean(shouldEnable);
}

""",
        "functions": ["setCheckbox"]
    },
    "dropdown": {
        "script": r"""
/***********************************************
 * Helper: Select dropdown value smartly
 ***********************************************/
function selectDropdownValue(selector, valueToSelect) {
    const select = deepQuerySelector(selector);
    if (!select) return console.warn("Dropdown not found:", selector);
    for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].text === valueToSelect) {
            select.selectedIndex = i;
            break;
        }
    }
}
""",
        "functions": ["selectDropdownValue"]
    },

}

def import_js_functions(functions: list[str]) -> dict[Literal["script", "functions"], str | list[str]]:
    
    res = {"script":"", "functions":[]}

    for fxn in functions:
        fxn_entry = functions_db.get(fxn, {})
        script_part = fxn_entry.get("script", "")
        if isinstance(script_part, list):
            script_part = "\n".join(script_part)  # Convert list of lines to string
        res["script"] += script_part

        functions_part = fxn_entry.get("functions", [])
        if isinstance(functions_part, str):
            functions_part = [functions_part]  # Ensure list
        res["functions"].extend(functions_part)

    return res

def inject_dictionary(script: str, placeholder: str, dictionary: dict) -> str:
    return script.replace(placeholder, json.dumps(dictionary, indent=4))

def append_dictionary(script: str, var_name: str, dictionary: dict) -> str:
    return script + f"\n{var_name} = {json.dumps(dictionary, indent=4)}\n"

def inject_sleep(script: str, placeholder_map: dict[str, float | int] = {}, auto_map: list[str] = []) -> str:
    """
    Replaces sleep placeholders in a script with JavaScript `setTimeout` await expressions.

    This function supports two types of placeholder injection:
      1. auto_map: placeholders of the form "__SLEEP_<ms>__"
         Example: "__SLEEP_200__" → inserts 200 ms sleep
      2. placeholder_map: custom placeholders mapped to seconds
         Example: {"${WAIT}": 2.5} → inserts 2500 ms sleep

    Parameters
    ----------
    script : str
        The original script containing placeholders to be replaced.
        Example: "console.log('start'); __SLEEP_200__; console.log('end');"

    placeholder_map : dict[str, float | int], optional
        A mapping of custom placeholder strings to sleep durations in seconds.
        Each value is converted to milliseconds (value * 1000).
        Example:
            {
                "${WAIT_SHORT}": 1.5,   # → 1500 ms
                "${WAIT_LONG}": 5       # → 5000 ms
            }

    auto_map : list[str], optional
        List of built-in sleep placeholders of the form "__SLEEP_<milliseconds>__".
        These are parsed automatically via regex and inserted as-is.
        Example:
            ["__SLEEP_200__", "__SLEEP_800__"]

    Returns
    -------
    str
        A new script string where all recognized placeholders are replaced with:
            await new Promise(resolve => setTimeout(resolve, <ms>));

    Notes
    -----
    - Sleep units
        • auto_map → milliseconds  
        • placeholder_map → seconds (converted internally)
    - auto_map replacements occur first, then placeholder_map replacements.
    - Placeholders not found or not matching expected formats are ignored.
    """
    pattern = re.compile(r"^__SLEEP_(\d+)__$")
    for placeholder in auto_map: # Example: ["__SLEEP_200__", "__SLEEP_800__"]
        match = pattern.match(placeholder)
        if match:
            script = script.replace(placeholder, f"await new Promise(resolve => setTimeout(resolve, {int(match.group(1))}));")
    for placeholder, seconds in placeholder_map.items():
        script = script.replace(placeholder, f"await new Promise(resolve => setTimeout(resolve, {seconds*1000}));")
    return script

def append_sleep(script: str, seconds: float|int) -> str:
    return script + f"\nawait new Promise(resolve => setTimeout(resolve, {seconds*1000}));\n"

def sync_sleep(script: str) -> str:
    """
    Replaces all placeholders of the form __SLEEP_<milliseconds>__
    with: await new Promise(resolve => setTimeout(resolve, <milliseconds>));
    
    Parameters
    ----------
    script : str
        The full JavaScript script containing sleep placeholders.
    
    Returns
    -------
    str
        Script with all sleep placeholders replaced.
    """
    SLEEP_PATTERN = re.compile(r"__SLEEP_(\d+)__")
    def replace_sleep(match: re.Match) -> str:
        ms = int(match.group(1))
        return f"await new Promise(resolve => setTimeout(resolve, {ms}));"

    return SLEEP_PATTERN.sub(replace_sleep, script) 

if __name__ == "__main__":

    res = import_js_functions(functions=["querySelector"])
    print(res)


