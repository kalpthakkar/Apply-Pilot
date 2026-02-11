from difflib import SequenceMatcher
import json
import time
from pathlib import Path
import fitz  # PyMuPDF
import random
import string
import ast
import re
import requests
from urllib.parse import urlparse
from typing import Any, Iterable, List, Optional, Literal, overload
from difflib import SequenceMatcher

def generate_random_string(length=10, use_letters=True, use_digits=True, use_special=False):
    """
    Generate a random string based on character type selection.

    Parameters:
    - length (int): Total length of the string.
    - use_letters (bool): Include a-zA-Z if True.
    - use_digits (bool): Include 0-9 if True.
    - use_special (bool): Include special characters if True.

    Returns:
    - str: Randomly generated string.

    # Examples
    print(generate_random_string(length=12))                      # letters + digits
    print(generate_random_string(length=8, use_special=True))     # letters + digits + special
    print(generate_random_string(length=6, use_letters=False, use_digits=True))  # digits only
    """
    characters = ''
    if use_letters:
        characters += string.ascii_letters
    if use_digits:
        characters += string.digits
    if use_special:
        characters += string.punctuation

    if not characters:
        raise ValueError("At least one type of character must be selected!")

    return ''.join(random.choices(characters, k=length))

def string_match_percentage(str1: str, str2: str) -> int:
    """
    Returns a similarity percentage (0 to 100) between two strings.

    Args:
        str1 (str): First string.
        str2 (str): Second string.

    Returns:
        int: Match percentage (0 = no match, 100 = exact match).
    """
    ratio = SequenceMatcher(None, str1.lower(), str2.lower()).ratio()
    return int(round(ratio * 100))

def find_first_best_match(iter, value, threshold=90) -> str | None:
    for val in iter:
        if string_match_percentage(val, value) > threshold:
            return val
    return  # Default case if no match is found

# Helper function for string matching with ranking
# def find_best_match(available_categories: Iterable[str], match_category: str, threshold: float = 0) -> str | None:
#     # List to hold matches and their corresponding match percentage
#     matching_categories = []
    
#     # Iterate over available categories and find matches above the threshold
#     for role_category in available_categories:
#         match_percentage = string_match_percentage(role_category, match_category)
        
#         if match_percentage > threshold:
#             matching_categories.append((role_category, match_percentage))
    
#     # Sort by match percentage in descending order (best match first)
#     matching_categories.sort(key=lambda x: x[1], reverse=True)
    
#     # Return the best match if any matches exist, otherwise default to `None``
#     if matching_categories:
#         return matching_categories[0][0]  # Return the category with highest match percentage
#     else:
#         return  # Default case if no match is found

def find_best_match(candidates: Iterable[str], query: str, threshold: int = 90) -> str | None:
    best_match = None
    best_score = threshold

    for candidate in candidates:
        score = string_match_percentage(candidate, query)
        if score > best_score:
            best_score = score
            best_match = candidate

    return best_match

def fuzzy_contains(
    query: str,
    candidates: List[str],
    threshold: int = 100,
    case_sensitive: bool = False,
    return_mode: Literal["bool", "candidate"] = "bool",
) -> bool | Optional[str]:
    """
    Determines whether `query` matches any string in `candidates`
    using exact, substring, or fuzzy matching.

    Matching behavior:
        threshold == 100 -> exact match only
        threshold < 100  -> substring OR fuzzy match allowed

    return_mode:
        "bool"  -> returns True / False
        "value" -> returns matched candidate or None
    """

    if not case_sensitive:
        query_cmp = query.lower()
        candidates_cmp = [c.lower() for c in candidates]
    else:
        query_cmp = query
        candidates_cmp = candidates

    # 1. Exact or substring match (fast path)
    for original, candidate in zip(candidates, candidates_cmp):
        if threshold == 100:
            if query_cmp == candidate:
                return True if return_mode == "bool" else original
        else:
            if query_cmp in candidate:
                return True if return_mode == "bool" else original

    # 2. Fuzzy matching
    if threshold < 100:
        for original, candidate in zip(candidates, candidates_cmp):
            similarity = SequenceMatcher(None, query_cmp, candidate).ratio() * 100
            if similarity >= threshold:
                return True if return_mode == "bool" else original

    return False if return_mode == "bool" else None

def dynamic_polling(max_wait: float | None, sub_processes: dict):
    """
    Poll multiple sub-processes at their respective intervals for a maximum time.

    Args:
        max_wait (float | None): Maximum total wait time in seconds.
        sub_processes (dict): Dictionary of {function: interval_in_seconds}.
            Each function should be callable with no arguments.
            If a function returns a non-None value, it will be returned immediately.

    Returns:
        The first non-None value returned by any function, or None if timeout reached.
    """
    start_time = time.time()
    last_run_times = {func: start_time for func in sub_processes.keys()}

    while True:
        now = time.time()
        elapsed = now - start_time

        if max_wait and elapsed >= max_wait:
            break

        for func, interval in sub_processes.items():
            if now - last_run_times[func] >= interval:
                result = func()
                if result is not None:
                    return result
                # maintain interval steps
                last_run_times[func] += interval

        # sleep a reasonable interval to avoid busy waiting
        time.sleep(0.5)

    return None

def safe_load_json(json_string) -> tuple[bool, dict | None]:
    """
    Safely checks if a string is valid JSON.
    Returns a tuple (is_valid_json: bool, result: dict/list/None)

    # Example usage
    json_text = '{"name": "Alice", "age": 30}'
    is_valid, data = safe_load_json(json_text)

    if is_valid: print("Valid JSON:", data)
    else: print("Invalid JSON")
    """
    if not isinstance(json_string, str):
        return False, None

    try:
        parsed = json.loads(json_string)
        return True, parsed
    except json.JSONDecodeError:
        return False, None

def parse_literal(text: str, safe: bool = True) -> Any | None:
    """
    Safely converts a string representing a Python literal into the corresponding Python object.
    
    Handles:
        - Numbers (int, float)
        - Strings
        - Booleans
        - None
        - Lists, tuples
        - Dictionaries
        - Nested combinations of the above
    
    Args:
        text (str): The string containing the Python literal.
        safe (bool, optional): If True, return None on parse failure. 
                               If False, raise ValueError. Defaults to True.
        
    Returns:
        Any or None: The Python object represented by the string, or None if safe=True and parsing fails.
        
    Raises:
        ValueError: If safe=False and the input string cannot be parsed.
    """
    try:
        return ast.literal_eval(text)
    except (ValueError, SyntaxError) as e:
        if safe:
            return None
        else:
            raise ValueError(f"Failed to parse literal from string: {e}") from e

def is_number(s: str) -> bool:
    try:
        float(s)
        return True
    except (ValueError, TypeError):
        return False

def format_phone(phone_extension: Optional[str], phone_number: Optional[str]) -> str:
    """
    Convert phone extension and phone number into a standardized format.

    Examples:
        +1 (123) 456-7890   # when both are available
        (123) 456-7890      # when only phone number is available

    If the phone number is not 10 digits after cleaning, it is returned as-is
    (digits only), optionally prefixed by the extension.
    """

    def digits_only(value: Optional[str]) -> str:
        return re.sub(r"\D", "", value or "")

    ext_digits = digits_only(phone_extension)
    num_digits = digits_only(phone_number)

    # If no phone number, return empty string
    if not num_digits:
        return ""

    # Format standard US 10-digit numbers
    if len(num_digits) == 10:
        formatted_number = f"({num_digits[:3]}) {num_digits[3:6]}-{num_digits[6:]}"
    else:
        # Fallback for non-standard lengths
        formatted_number = num_digits

    # Add extension if available
    if ext_digits:
        return f"+{ext_digits} {formatted_number}"

    return formatted_number

def get_original_hostname(url: str, timeout: int = 10) -> str:
    """
    Takes a URL or domain and returns the final hostname after following redirects.
    
    Args:
        url (str): The URL or domain to check.
        timeout (int): Timeout for HTTP request in seconds.
    
    Returns:
        str: The final hostname (root domain) after redirects.

    ---

    Example:

    www.delltechnologies.com → www.dell.com
    www.microsoft.com → www.microsoft.com
    bit.ly → bitly.com
    """
    # Ensure URL has scheme
    if not url.startswith(("http://", "https://")):
        url = "https://" + url  # default to https

    try:
        # Make HEAD request to follow redirects without downloading body
        response = requests.head(url, allow_redirects=True, timeout=timeout)
        final_url = response.url
        parsed = urlparse(final_url)
        return parsed.hostname
    except requests.RequestException as e:
        print(f"Error resolving {url}: {e}")
        return urlparse(url).hostname




