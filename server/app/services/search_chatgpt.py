from app.services.shared import chatgpt
from modules.chatgpt.chatgpt import PromptChainResponse, PromptInput
from config.env_config import USE_TOR
from typing import List

def invokeLLM(
    prompts: List[PromptInput], 
    timeout=None, 
    search_tor: bool = USE_TOR,
    search_incognito: bool = False, 
    is_session_already_open: bool = False, 
    leave_session_opened: bool = False, 
    enable_clipboard_permission_check: bool = True, 
    get_parsed_response: bool = False, 
    allow_retry: bool = True, 
    max_retry: int = 1
):
    response: PromptChainResponse = chatgpt.promptChain(
        prompts=prompts, 
        timeout=timeout, 
        search_tor=search_tor,
        search_incognito=search_incognito, 
        is_session_already_open=is_session_already_open, 
        leave_session_opened=leave_session_opened, 
        enable_clipboard_permission_check=enable_clipboard_permission_check, 
        get_parsed_response=get_parsed_response, 
        allow_retry=allow_retry, 
        max_retry=max_retry
    )
    return response