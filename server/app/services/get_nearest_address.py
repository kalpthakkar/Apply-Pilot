# get_best_address.py
from app.services.shared import automation_controller
from config.env_config import USER_DATA_FILE, USE_TOR
from typing import List, Dict, TypedDict, Optional
import json
import time
from modules.utils.helpers import find_best_match
import pyautogui

# ------------------------
# TypedDict for input
# ------------------------
class AddressMatchCluesDict(TypedDict):
    location: str  # User provided location string

# ------------------------
# Pydantic-like model for output (optional)
# ------------------------
class AddressModel(TypedDict):
    addressLine1: str
    addressLine2: str
    city: str
    state: str
    postalCode: str
    country: str

class GetNearestAddressResponse(TypedDict):
    success: bool                       # True if a matching address is found
    payload: Optional[AddressModel]     # The best matched address, None if not found
    errors: List[str]                   # List of error messages, empty if no errors

# ------------------------
# Helper: build inline address for prompt
# ------------------------
def build_inline_address(address: Dict) -> str:
    return "• " + ", ".join(
        filter(None, [
            address.get("addressLine1", ""),
            address.get("addressLine2", ""),
            address.get("city", ""),
            address.get("state", ""),
            address.get("postalCode", ""),
            address.get("country", "")
        ])
    )

# ------------------------
# Build ChatGPT prompt
# ------------------------
def _build_address_prompt(location_str: str, addresses: List[Dict]) -> List[Dict[str, str]]:
    address_lines = "\n".join(build_inline_address(addr) for addr in addresses)

    prompts: List[Dict[str, str]] = [
        {
            "system": f"""
You are an address matching assistant. Your task is to find the **nearest address** to a given location or list of locations.

The available addresses are:

{address_lines}

Return **only** a JSON object with the following keys exactly:
{{
  "addressLine1": <string>,
  "addressLine2": <string>,
  "city": <string>,
  "state": <string>,
  "postalCode": <string>,
  "country": <string>
}}

Do not add explanations or extra text. Only output valid JSON.
"""
        },
        {
            "user": f"""Find the address closest to the following location(s):
            
{location_str}

If there are multiple locations, select the **single address** from the database that is closest/most ideal to all given locations collectively.

Must return **exactly one JSON object** nearest to the provided location(s) from the addresses I shared earlier.
Do NOT include disclaimers, prefaces, boilerplate, meta-writing, preamble/lead-in, instructional echo, self-referential commentary, epilogue, or closing niceties.
Give direct answer as per the given JSON schema.
"""
        }
    ]
    return prompts

# ------------------------
# Get best address using ChatGPT
# ------------------------
def _get_nearest_address_chatgpt(location_str: str, addresses: List[Dict[str,str]], max_retry: int = 3, retry_delay: float = 5) -> AddressModel | None:
    
    for attempt in range(max_retry):
        if attempt > 0:
            time.sleep(retry_delay)

        prompts = _build_address_prompt(location_str, addresses)
        # Convert prompts to ChatGPT input
        chain_of_prompts = [{"prompt": next(iter(p.values())), "timeout": 12} for p in prompts]

        # Add schema enforcement for JSON
        chain_of_prompts[-1]["prompt"] += """
response_format = {
    "type": "json_schema",
    "schema": {
        "type": "object",
        "properties": {
            "addressLine1": { "type": "string" },
            "addressLine2": { "type": "string" },
            "city": { "type": "string" },
            "state": { "type": "string" },
            "postalCode": { "type": "string" },
            "country": { "type": "string" }
        },
        "required": ["addressLine1", "city", "state", "country"]
    }
}
"""

        response = automation_controller.chatgpt.promptChain(
            chain_of_prompts, 
            search_tor=USE_TOR, 
            search_incognito=True, 
            leave_session_opened = True, 
            enable_clipboard_permission_check = True if (
                not automation_controller.chatgpt.is_session_already_open 
                or automation_controller.chatgpt.reset_occured
            ) else False,
        )
        if not response.success:
            continue

        response_payload: list[str] = response.payload
        if len(response_payload) != 1:
            continue

        # Convert LLM output to dict
        try:
            response_dict: Dict = automation_controller.chatgpt.convert_jsonic_response_to_dict(response_payload[0])
        except Exception:
            continue

        if not response_dict:
            continue

        # Normalize by finding exact match from available addresses
        # (LLM may slightly modify formatting)
        inline_candidates = [build_inline_address(addr) for addr in addresses]
        candidate_strings = [", ".join(filter(None, [
            response_dict.get("addressLine1", ""),
            response_dict.get("addressLine2", ""),
            response_dict.get("city", ""),
            response_dict.get("state", ""),
            response_dict.get("postalCode", ""),
            response_dict.get("country", "")
        ]))]
        # Use find_best_match to pick closest address
        best_idx = inline_candidates.index(
            find_best_match(inline_candidates, candidate_strings[0], threshold=0)
        )
        return addresses[best_idx]

    return None

# ------------------------
# Public function
# ------------------------
def get_nearest_address(location: str | List) -> GetNearestAddressResponse:
    """
    Finds the best/nearest address to the provided location(s).
    - a single string, e.g., "Schaumburg, IL"
    - a list of strings, e.g., ["Schaumburg, IL", "Orlando, FL"]

    Output example:
    {
        "addressLine1": "1718 France Dr",
        "addressLine2": "Unit 100",
        "city": "Orlando",
        "state": "FL",
        "postalCode": "32826",
        "country": "United States of America"
    }
    """
    if not location:
        return {"success": False, "payload": None, "errors": ["No location provided"]}
    

    # ------------------------
    # Normalize location to a single string
    # ------------------------
    if isinstance(location, list):
        # Convert list to a JSON-style string with line breaks
        location_str = json.dumps([str(loc) for loc in location if loc], indent=4)
    else:
        location_str = str(location)


    if not location_str:
        return {"success": False, "payload": None, "errors": ["Location list was empty or invalid"]}

    
    # ------------------------
    # Load the JSON file
    # ------------------------
    with open(USER_DATA_FILE, "r", encoding="utf-8") as f:
        user_data = json.load(f)

    addresses: List[Dict] = user_data.get("addresses", [])

    if not addresses:
        return {"success": False, "payload": None, "errors": ["No addresses available in database"]}

    result = _get_nearest_address_chatgpt(location_str, addresses)

    if not result:
        return {"success": False, "payload": None, "errors": ["Unable to find a matching address"]}

    return {"success": True, "payload": result, "errors": []}

# ------------------------
# Test
# ------------------------
if __name__ == "__main__":
    # location_input = "Schaumburg, IL"
    location_input =[
        "Schaumburg, IL",
        "Orlando, FL"
    ]
    best_address = get_nearest_address(location_input)
    print(best_address if best_address else "❌ Not Found: Unable to find best address")
