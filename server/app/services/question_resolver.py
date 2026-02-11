from app.services.shared import automation_controller
from config.env_config import USER_DATA_FILE, USE_TOR
from typing import List, Dict, TypedDict, Optional, Any
import json
import time
import re

CHAR_NORMALIZATION_TABLE  = str.maketrans({
    '—': '-',
    '–': '-',
    '’': "'",
    '“': '"',
    '”': '"'
})

_PATH_REGEX = re.compile(r"\[(.*?)\]")

def _parse_path(path: str) -> list:
    """
    Convert:
      "a.b[0].c" → ["a", "b", 0, "c"]
      "work[experience][0].title" → ["work", "experience", 0, "title"]
    """
    if not isinstance(path, str):
        raise TypeError("Path must be a string")

    # Convert bracket notation to dot notation
    # e.g. a[b][0].c → a.b.0.c
    normalized = _PATH_REGEX.sub(lambda m: f".{m.group(1)}", path)

    parts = []
    for part in normalized.split("."):
        if not part:
            continue
        if part.isdigit():
            parts.append(int(part))
        else:
            parts.append(part)

    return parts

def resolve_nested_key( obj: Dict[str, Any], path: str, *, fallback: Optional[Any] = None, value: Optional[Any] = None ) -> Any:
    """
    Universal helper to GET or SET deeply nested values.

    Supports:
      - Dot + bracket notation: "a.b[0].c"
      - Dynamic indices
      - Safe GET with fallback
      - Optional SET mode (disabled by default in your pipeline)

    Args:
        obj: Root dictionary
        path: Path string
        fallback: Returned if GET fails
        value: If provided → SET mode

    Returns:
        Resolved value (GET) or assigned value (SET)
    """
    keys = _parse_path(path)
    acc = obj

    for i, key in enumerate(keys):
        is_last = i == len(keys) - 1
        next_key = keys[i + 1] if not is_last else None

        # Broken path → GET fallback
        if acc is None:
            return fallback

        # ---------- SET MODE ----------
        if value is not None and is_last:
            if isinstance(acc, (dict, list)):
                try:
                    acc[key] = value
                except Exception:
                    return fallback
            return value

        # ---------- TRAVERSAL ----------
        try:
            if isinstance(acc, list) and isinstance(key, int):
                acc = acc[key]
            elif isinstance(acc, dict):
                acc = acc.get(key)
            else:
                return fallback
        except (KeyError, IndexError, TypeError):
            return fallback

    return acc if acc is not None else fallback

def delete_nested_key(obj: Dict[str, Any], path: str) -> None:
    """
    Safely delete a deeply nested key using dot + bracket notation.

    Examples:
      delete_nested_key(db, "profile_html_card")
      delete_nested_key(db, "resumes.resumeStoredPath")
      delete_nested_key(db, "addresses[0].postalCode")

    Behavior:
      • Dict key → removed
      • List index → replaced with None (preserves indices)
      • Missing path → no-op
    """
    keys = _parse_path(path)
    acc = obj

    for i, key in enumerate(keys):
        is_last = i == len(keys) - 1

        if acc is None:
            return

        if is_last:
            try:
                if isinstance(acc, dict):
                    acc.pop(key, None)
                elif isinstance(acc, list) and isinstance(key, int):
                    acc[key] = None
            except Exception:
                pass
            return

        try:
            if isinstance(acc, list) and isinstance(key, int):
                acc = acc[key]
            elif isinstance(acc, dict):
                acc = acc.get(key)
            else:
                return
        except Exception:
            return

def extract_db_snippets(user_db: Dict, keys: List[str]) -> Dict[str, Any]:
    snippets = {}

    for key in keys or []:
        try:
            # You already have similar logic elsewhere
            value = resolve_nested_key(user_db, key)
            snippets[key] = value
        except Exception:
            continue

    return snippets


# ============================================================
# System Prompt (Injected Once)
# ============================================================

def build_system_prompt(job_details: Dict[str, Any]) -> str:
    system_prompt = f"""
You are an LLM-based form answering engine for job applications (ATS systems).

You are provided with:
1. A structured user profile database (ground truth)
2. A list of job application questions
3. Optional hints and optional database mappings derived from RAG (may or may not be relevant signal)
4. Optional selectable options (For question types like 'dropdown', 'checkbox', 'radio' etc.)

Your goal:
• Produce the most accurate answer for each question
• Maximize my chances of being shortlisted and hired
• Align answers with the job context when reasonable
• Use the database as the primary source of truth
• Use hints only if relevant
• Never hallucinate facts not supported by database or hints
• If data is missing or ambiguous, infer conservatively

Answer Optimization Priority (highest to lowest):

1. Legal / compliance truth (citizenship, work authorization, criminal records, age, disability, visa status)
   → MUST be factually correct and never optimized or inferred.

2. Job eligibility constraints (location, remote eligibility, availability, start date, relocation willingness)
   → Optimize for eligibility when multiple truthful answers exist.
   → Prefer answers that satisfy job requirements if they do not violate legal truth.

3. Job alignment and role fit
   → Favor answers that align most closely with the job title, description, and required skills.
   → Emphasize relevant experience and de-emphasize irrelevant history.

4. User database truth
   → Use as factual backing, not necessarily verbatim output.
   → Summarize, select, or contextualize information when appropriate.

5. Hints and inferred signals
   → Use only if they improve clarity or eligibility.
"""
    
    if any(key in job_details for key in ["title", "description", "location"]):
        system_prompt += """
---

=== [START] Job Details ===
"""
    
    if "jobTitle" in job_details:
        system_prompt += f"""
Job Title:
{job_details['title']}
"""
    
    if "jobDescription" in job_details:
        system_prompt += f"""
Job Description:
{job_details['description']}
"""
        
    if "jobLocation" in job_details:
        system_prompt += f"""
Job Location:
{job_details['location']}
"""
    if any(key in job_details for key in ["title", "description", "location"]):
        system_prompt += """
=== [END] Job Details ===

"""
    
    system_prompt += """
Avoid introducing unnecessary negative or limiting signals, including:
• Unrequested location mismatches
• Unrelated past roles
• Over-qualification or under-qualification signals
• Ambiguous availability or uncertainty
• Excessive honesty that reduces eligibility when multiple valid truths exist

Before finalizing your answer, internally verify:
• Does this answer reduce eligibility unnecessarily?
• Is there a more job-aligned truthful alternative?
• Does it satisfy the job's explicit constraints?

Critical Output Rules:
• Every response MUST be valid JSON
• Follow the provided JSON schema EXACTLY
• Do NOT include explanations, markdown, or extra keys
• Do NOT repeat the question text
• NEVER write template-style, example-style, instructional, or advisory language
• NEVER include brackets [] or angle brackets <> in outputs
• If a concrete value is unavailable:
  - Select the best real alternative from the database.
  - Or return the minimal truthful value by infering best real alternative (never a template)
• Do NOT include disclaimers, prefaces, boilerplate, meta-writing, preamble/lead-in, instructional echo, self-referential commentary, epilogue, or closing niceties
"""
        
    system_prompt += """
END OF SYSTEM PROMPT - Keep these rules, instructions, and information (all context) in mind for reference and future usage. Currently, do not respond to this.
"""

    return system_prompt.strip()

# ============================================================
# Context Prompt (Injected Once)
# ============================================================

def build_user_context_prompt(user_db: Dict[str, Any]) -> str:
    return f"""
You are now given the full user profile database.
This database is the PRIMARY source of truth.

User Profile Database:
{json.dumps(user_db, indent=2)}

END OF CONTEXT PROMPT — Keep this information (available user context) in mind along with system instructions for reference and future usage. Currently, do not respond to this.
""".strip()

    

# ============================================================
# Prompt Builders
# ============================================================

def _common_context(label: str, hints: List[str], db_snippets: Dict[str, Any]) -> str:
    shared_prompt = f"""
Question:

--- START OF QUESTION ---

{label}

--- END OF QUESTION ---
"""
    
    if hints:
        shared_prompt += f"""
Hints (may or may not be useful):
{json.dumps(hints or [], indent=2)}
"""
        
    if db_snippets:
        shared_prompt += f"""
Database information (may or may not be useful):
{json.dumps(db_snippets or {}, indent=2)}
"""
    
    return shared_prompt.strip()


def build_scalar_prompt(meta: Dict, db_snippets: Dict) -> str:
    
    scalar_prompt = f"""{_common_context(meta["labelText"], meta.get("hints"), db_snippets)}

You are answering a short single-line input field.

Rules:
• Output a single concise string
• No punctuation padding
• NEVER use markdown or link formatting - URLs must be plain text.
• No explanations
• Use database values if available, otherwise infer safely
"""
    
    if meta.get("required", True):
        scalar_prompt += """• This is a REQUIRED field — value must be a real, non-empty string (Empty string is NOT allowed)
"""

    scalar_prompt += """• Never return template-style, example-style, or instructional language
• Lookout provided system instructions, rules, information and user context for additional inference.

Response JSON schema:
response_format = {{
    "type": "json_schema",
    "schema": {{
        "type": "object",
        "properties": {{
            "value": {{ "type": "string" }}
        }},
        "required": ["value"]
    }}
}}

Example:
{{
  "value": "string"
}}

Return the most appropriate short and concise answer (strictly in JSON).
""".strip()
    
    return scalar_prompt


def build_textarea_prompt(meta: Dict, db_snippets: Dict) -> str:
    textarea_prompt = f"""{_common_context(meta["labelText"], meta.get("hints"), db_snippets)}

You are answering a long-form text question.

Rules:
• Be professional and ATS-safe
• Be concise but complete
• Avoid fluff and repetition
• Do not exceed 150 words (preferably 30-60 words) unless explicitly mentioned or required
• Prefer bullet-style sentences internally, but preferably output plain text
• Preferred answer would be realistic in nature as how I would give while answering this question (never as a template)
• Never return example-style, template-style, or instructional language
• NEVER use placeholders such as:
  "[your email]", "[phone number]", "[City]", "[State]", "[Country]", "XXX", "XYZ", "ABC", or similar
  it must be genuine, authentic, and realistic answer.
"""
    
    textarea_prompt += """• This is a REQUIRED question — response must not be empty
• You must provide a real, truthful answer even if brief
"""
    
    textarea_prompt += """• Lookout provided system instructions, rules, information and user context for additional inference.

Response JSON schema:
{{
    "type": "json_schema",
    "schema": {{
        "type": "object",
        "properties": {{
            "value": {{ "type": "string" }}
        }},
        "required": ["value"]
    }}
}}

Example:
{{
  "value": "string"
}}

Return the answer strictly in JSON.
""".strip()
    
    return textarea_prompt;


def build_single_choice_prompt(meta: Dict, db_snippets: Dict) -> str:
    single_choice_prompt =  f"""{_common_context(meta["labelText"], meta.get("hints"), db_snippets)}

You are selecting ONE option from a fixed list.

Rules:
• Select exactly one option from the provided list
• Match semantically, not lexically
• Never invent new values
• Prefer database-backed answers
• Must select at least one answer that increases my eligibility and hiring chance (incase actual context is missing in database).
• Lookout provided system instructions, rules, information and user context for additional inference.

Options:
{json.dumps(meta.get("options", []), indent=2)}

Choose exactly ONE option from the list above.
The value must match exactly (case-sensitive).

Response JSON schema:
{{
    "type": "json_schema",
    "schema": {{
        "type": "object",
        "properties": {{
            "value": {{
                "type": "string",
                "enum": options
            }}
        }},
        "required": ["value"]
    }}
}}

Example:
{{
  "value": "string"
}}

Return the answer strictly in JSON.
""".strip()
    
    return single_choice_prompt


def build_multi_choice_prompt(meta: Dict, db_snippets: Dict) -> str:

    has_options = bool(meta.get("options"))

    items_schema = (
        {
            "type": "string",
            "enum": meta["options"]
        }
        if has_options
        else {
            "type": "string"
        }
    )

    return f"""
{_common_context(meta["labelText"], meta.get("hints"), db_snippets)}

{f"Options:\n{json.dumps(meta['options'], indent=2)}" if has_options else "No predefined options exist. Generate the most appropriate concise answer(s) that increase eligibility and hiring chance."}

Choose {"ONE" if meta.get("required", True) else "ZERO"} OR MORE options.

Rules:
• Return an array
• {"Every value must exist in the options list" if has_options else "Values may be inferred when no options are provided"}
• Infer from database if relevant context exists
• {"Return at least one answer in array" if meta.get("required", True) else "If none apply, return empty list"}
• Lookout provided system instructions, rules, information and user context for additional inference.

Response JSON schema:
{{
    "type": "json_schema",
    "schema": {{
        "type": "object",
        "properties": {{
            "values": {{
                "type": "array",
                "items": {json.dumps(items_schema, indent=4)}
            }}
        }},
        "required": ["values"]
    }}
}}

Example:
{{
  "values": ["string"]
}}

Return the answer strictly in JSON.
""".strip()


def build_date_prompt(meta: Dict, db_snippets: Dict) -> str:
    return f"""
{_common_context(meta["labelText"], meta.get("hints"), db_snippets)}

You are answering a date input field.

Rules:
• Output ISO-8601 format: YYYY-MM-DD
• Use database date if available
• If only year/month known, infer day as 01
• If no cluse is available, {"return today's date" if meta.get("required", True) else "the value in JSON must be null"}
• Lookout provided system instructions, rules, information and user context for additional inference.

Response JSON schema:
{{
    "type": "json_schema",
    "schema": {{
        "type": "object",
        "properties": {{
            "value": {{
                "type": {"string" if meta.get("required", True) else '["string", "null"]'},
                "pattern": "^\\d{{4}}-\\d{{2}}-\\d{{2}}$"
            }}
        }},
        "required": ["value"]
    }}
}}

Example:
{{
  "value": "YYYY-MM-DD"
}}

Return the answer strictly in JSON.
""".strip()


# ============================================================
# Prompt Router
# ============================================================

def build_question_prompt(meta: Dict, db_snippets: Dict) -> str:
    q_type = meta["type"]

    # ============================================================
    # Question Type Groups
    # ============================================================

    SCALAR_TYPES = {"text", "email", "number", "tel", "url", "search", "password"}

    TEXTAREA_TYPES = {"textarea"}

    SINGLE_CHOICE_TYPES = {"radio", "select", "dropdown"}

    MULTI_CHOICE_TYPES = {"checkbox", "multiselect"}

    DATE_TYPES = {"date"}

    # ============================================================
    # Prompt Dispatch
    # ============================================================

    if q_type in SCALAR_TYPES:
        return build_scalar_prompt(meta, db_snippets)

    if q_type in TEXTAREA_TYPES:
        return build_textarea_prompt(meta, db_snippets)

    if q_type in SINGLE_CHOICE_TYPES:
        return build_single_choice_prompt(meta, db_snippets)

    if q_type in MULTI_CHOICE_TYPES:
        return build_multi_choice_prompt(meta, db_snippets)

    if q_type in DATE_TYPES:
        return build_date_prompt(meta, db_snippets)

    raise ValueError(f"❌ Unsupported question type: {q_type}")


def build_prompt_chain( user_db: Dict[str, Any], job_details: Dict[str, Any], questions: List[Dict[str, Any]], add_system_prompt: bool = True, add_context_prompt: bool = True ) -> List[Dict[str, Any]]:

    prompts = []

    # 1️⃣ System Prompt — Job Context
    if add_system_prompt:
        prompts.append({ "prompt": build_system_prompt(job_details), "copy": False, "timeout": 60 })

    # 2️⃣ Context Prompt — User DB
    if add_context_prompt:
        prompts.append({ "prompt": build_user_context_prompt(user_db), "copy": False, "timeout": 60 })

    # 3️⃣ Question Prompts
    for question in questions:
        try:
            db_snippets = extract_db_snippets( user_db, question.get("relevantDBKeys", []) )
        except:
            db_snippets = {}
        
        prompts.append({ "prompt": build_question_prompt(question, db_snippets), "copy": True, "remove_unicode_punctuation": True, "timeout": 30 })

    return prompts


def filter_and_normalize(value):
    if value is None:
        return None

    if isinstance(value, str):
        if value == "string":
            return ""

        if "http" in value and "username" in value:
            return ""

    return value



def resolve_questions_with_llm(questions: List[Dict[str, Any]], job_details: Dict[str, str | List[str] | None], max_retries: int = 2 ) -> List[Optional[Dict[str, Any]]]:

    '''

    questions --> List[QuestionDict]

    QuestionDict:
     {
        questionId: qId,
        labelText: question.labelText || "",
        type: question.type,
        required: question.required,
        options: options,
        hints: hints,
        relevantDBKeys: relevantDBKeys,
        reason: reason
    })
	
		
    '''
    print("\n[Question Resolver] 🚀 Starting LLM Question Resolution")

    with open(USER_DATA_FILE, "r", encoding="utf-8") as f:
        user_db: Dict[str, Any] = json.load(f)

    DROP_PATHS = [
        "password",
        "secondaryPassword",
        "profile_html_card",
        "addresses",
        "primaryAddressContainerIdx",
        "llmAddressSelectionEnabled",
        "resumes",
        "primaryResumeContainerIdx",
        "llmResumeSelectionEnabled",
        "enabledUserSkillsSelection",
        "enabledJobSkillsSelection",
        "enabledRelatedSkillsSelection",
        "useSalaryRange",
    ]

    for path in DROP_PATHS:
        delete_nested_key(user_db, path)

    # Initialize final results as a list of dicts with questionId keys
    final_results: List[Dict[str, Any]] = [{"questionId": q["questionId"], "response": None} for q in questions]

    base_prompts_required = False if (
        automation_controller.chatgpt.is_session_already_open 
        and automation_controller.last_active_service == 'resolve-questions-with-llm'
    ) else True

    if not automation_controller.open_llm_session('resolve-questions-with-llm'):
        print("[Question Resolver] ⚠️ Error Opening LLM Session")
        print(f"[Question Resolver] 💡 Returning Answers: 0 resolved / {len(questions)}\n")
        return final_results

    # Track unresolved questions
    remaining = list(enumerate(questions))
    attempt = 0
    while remaining and attempt <= max_retries:
        attempt += 1

        print(f"[Question Resolver] 🔁 LLM attempt {attempt} — resolving {len(remaining)} question(s)")

        if remaining:
            indices, retry_questions = zip(*remaining)
        else:
            break

        if (
            base_prompts_required == False
            and attempt > 1 
            and automation_controller.chatgpt.reset_occured
        ):
            base_prompts_required = True

        prompts = build_prompt_chain( 
            user_db = user_db, 
            job_details = job_details, 
            questions = list(retry_questions),
            add_system_prompt = True if base_prompts_required else False,
            add_context_prompt = True if base_prompts_required else False
        )
        
        response = automation_controller.chatgpt.promptChain( 
            prompts, 
            search_tor = USE_TOR, 
            search_incognito = True, 
            leave_session_opened = True, 
            enable_clipboard_permission_check = True if (
                not automation_controller.chatgpt.is_session_already_open 
                or automation_controller.chatgpt.reset_occured
            ) else False,
            allow_retry = False 
        )

        # ------------------------------------------------------------
        # Hard failure → retry everything
        # ------------------------------------------------------------
        if not response.success:
            print("[Question Resolver] ⚠️ promptChain failed — retrying remaining questions")
            time.sleep(1)
            continue

        # ------------------------------------------------------------
        # Parse question responses only
        # ------------------------------------------------------------
        payload = response.payload  # contains only copied prompts

        # ---------- SAFETY CHECK ----------
        if len(payload) != len(indices):
            print(f"[Question Resolver] ⚠️ Payload length mismatch: expected {len(indices)}, got {len(payload)}")
            time.sleep(1)
            continue

        new_remaining = []

        # Parse each response
        for idx, raw in zip(indices, payload):
            question_id = questions[idx]["questionId"]
            try:
                parsed = automation_controller.chatgpt.convert_jsonic_response_to_dict(raw)

                # Get value
                value = None
                if isinstance(parsed, dict) and len(parsed) == 1:
                    value = parsed[list(parsed.keys())[0]]
                # Translate
                if isinstance(value, str):
                    value = value.translate(CHAR_NORMALIZATION_TABLE)
                elif isinstance(value, list):
                    value = [str(val).translate(CHAR_NORMALIZATION_TABLE) for val in value]

                # Filter and Normalize:
                value = filter_and_normalize(value)

                # Set value
                final_results[idx]["response"] = value
            except Exception as e:
                print(f"[Question Resolver] ❌ Parsing failed for questionId {question_id}: {e}")
                print(f"[Question Resolver] Raw response: {raw}") # optional, useful for debugging/retrying
                new_remaining.append((idx, questions[idx]))   # retry only failed questions

        remaining = new_remaining

        if remaining:
            print(f"[Question Resolver] ⚠️ {len(remaining)} question(s) failed parsing — retrying")
            time.sleep(1)

    # ------------------------------------------------------------
    # Any still unresolved → None
    # ------------------------------------------------------------
    if remaining:
        print(f"[Question Resolver] ❌ {len(remaining)} question(s) failed after retries")

    
    print(f"[Question Resolver] 💡 Returning Answers: {len(questions) - len(remaining)} resolved / {len(questions)}\n")
    return final_results

if __name__ == "__main__":

    # ============================================================
    # Test Harness for LLM Question Resolution
    # ============================================================

    print("\n[Question Resolver] 🚀 Starting LLM Question Resolution Test\n")

    import pprint

    # -------------------------
    # Mock User DB
    # -------------------------
    user_db = {
        "email": "kalp@example.com",
        "username": "kalp123",
        "firstName": "Kalp",
        "lastName": "Thakkar",
        "birthDate": "1997-08-15",
        "linkedin": "https://linkedin.com/in/kalpthakkar",
        "skills": ["Python", "Machine Learning", "React"],
        "workExperiences": [
            {
                "jobTitle": "Software Engineer",
                "company": "TechCorp",
                "startDate": "2022-01-01",
                "endDate": "2023-12-31",
                "roleDescription": "Developed backend services"
            }
        ]
    }

    # -------------------------
    # Mock Job Details
    # -------------------------
    job_details = {
        "title": "Full-Stack Developer",
        "description": "Build web applications using React and Python.",
        "jobURL": "https://example.com/jobs/fullstack",
        "location": "Orlando, FL"
    }

    # -------------------------
    # Mock Questions
    # -------------------------
    questions_pass_1 = [
        {
            "questionId": "q1",
            "labelText": "What is your first name?",
            "type": "text",
            "relevantDBKeys": ["firstName"]
        },
        {
            "questionId": "q2",
            "labelText": "What is your email address?",
            "type": "email",
            "relevantDBKeys": ["email"]
        },
        {
            "questionId": "q3",
            "labelText": "Select your primary skill",
            "type": "select",
            "options": ["Python", "Java", "C++", "JavaScript"],
            "relevantDBKeys": ["skills"]
        },
        {
            "questionId": "q4",
            "labelText": "Describe your recent work experience",
            "hints": ["I got research experience"],
            "type": "textarea",
            "relevantDBKeys": ["workExperiences"]
        }
    ]

    questions_pass_2 = [
        {
            "questionId": "q4",
            "labelText": "Describe your recent work experience",
            "hints": ["I got research experience"],
            "type": "textarea",
            "relevantDBKeys": ["workExperiences"]
        }
    ]

    # -------------------------
    # Resolve Questions with LLM
    # -------------------------
    results = resolve_questions_with_llm('dummy_session', questions_pass_1, job_details)
    # -------------------------
    # Pretty-print results
    # -------------------------
    print("\n===== LLM Responses =====")
    for res in results:
        question_id = res["questionId"]
        response = res["response"]
        print(f"\nQuestionId: {question_id}")
        pprint.pprint(response)


    print("Dummy action 6 seconds... (waiting)")
    time.sleep(6)


    # -------------------------
    # Resolve Questions with LLM
    # -------------------------
    results = resolve_questions_with_llm('dummy_session', questions_pass_2, job_details)
    # -------------------------
    # Pretty-print results
    # -------------------------
    print("\n===== LLM Responses =====")
    for res in results:
        question_id = res["questionId"]
        response = res["response"]
        print(f"\nQuestionId: {question_id}")
        pprint.pprint(response)

    
    print("Dummy action 6 seconds... (waiting)")
    time.sleep(6)

    print("\n🎯 Test Completed\n")