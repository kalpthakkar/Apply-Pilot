# app/services/shared.py
import time
import pyautogui
from config.env_config import BROWSER_PATH, CHROME_PATH, ENFORCE_CONSOLE_PASTING
from modules.browser.browser_utils import BrowserUtils
from modules.chatgpt.chatgpt import ChatGPT
from modules.utils.pyautogui_utils import ScreenUtility
import threading
from urllib.parse import urlparse

CHATGPT_URL = "https://chatgpt.com"
_cleanup_lock = threading.Lock()
screen_util = ScreenUtility(screen_resolution=pyautogui.size())

class AutomationController:

    def __init__(self):
        self.current_window_num = 1
        self.is_automation_active = False
        self.last_active_service = None

        self.chatgpt = ChatGPT(browser=BrowserUtils(BROWSER_PATH))
        self.chatgpt.enforce_console_pasting = ENFORCE_CONSOLE_PASTING
        self.automation_browser = BrowserUtils(CHROME_PATH)

    def goto_automation_desktop(self) -> None:
        if self.current_window_num == 1:
            return
        elif self.current_window_num == 2:
            screen_util.switch_desktop("left", steps=1)
            self.current_window_num = 1
            time.sleep(1)
            return

    def goto_llm_desktop(self) -> None:
        if self.current_window_num == 1:
            screen_util.switch_desktop("right", steps=1)
            self.current_window_num = 2
            time.sleep(1)
            return
        elif self.current_window_num == 2:
            return
    
    def open_automation_session(self, apply_url) -> bool:
        
        # Base return
        if self.is_automation_active:
            print("[Automation Controller] ❌ Failed to open automation session - Automation already running.")
            return False
        
        
        self.goto_automation_desktop()
        if not self.automation_browser.open_url(apply_url, endWait=0):
            print('[Automation Controller] ❌ Failed to open automation session URL.')
            return False
        self.is_automation_active = True
        return True

    def close_automation_session(self) -> bool:

        # Base return
        if not self.is_automation_active:
            print("[Automation Controller] ❌ Failed to close automation session - Automation not running.")
            return False

        self.goto_automation_desktop()
        self.automation_browser.close_tab()
        self.is_automation_active = False
        return True

    def open_llm_session(self, service_name) -> bool:

        # Base return
        if not self.is_automation_active:
            self.is_automation_active = True # Start Automation
            # print("[Automation Controller] ❌ Failed to open new llm session - Automation not running.")
            # return False

        self.goto_llm_desktop()

        if self.chatgpt.is_session_already_open:
            if self.last_active_service == service_name: 
                pass
            else: # Was not open for this service
                # Reload the page
                pyautogui.press('f5')
                time.sleep(2)
                # Wait for page to settle
                self.chatgpt.browser.verifyDOMChangeOnToggle = True
                if not self.chatgpt.browser.dynamic_loader(urlparse(CHATGPT_URL).hostname, max_wait=20):
                    print("[Automation Controller] ❌ Dynamic Loader didn't settle on reload.")
                    return False # not settled within timeout
        else:
            if not self.chatgpt.open_chatgpt(search_incognito=True, search_tor=True):
                print('[Automation Controller] ❌ Failed to open LLM')
                return False
            if not self.chatgpt.browser.enable_clipboard_read_permission():
                print('[Automation Controller] ❌ Failed to enable clipboard read permission')
                return False
        
        self.last_active_service = service_name
        return True

    def close_llm_session(self) -> None:

        if automation_controller.is_automation_active:

            with _cleanup_lock:
                
                if not self.chatgpt.is_session_already_open:
                    self.last_active_service = None
                    return
                
                self.goto_llm_desktop()
                self.chatgpt.close_session()
                self.last_active_service = None


automation_controller = AutomationController()