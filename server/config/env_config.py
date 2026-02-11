import os
import json
from pathlib import Path
from dotenv import load_dotenv
from typing import List, Dict

env_path = Path(__file__).resolve().parents[1] / '.env'
load_dotenv(dotenv_path=env_path)

# 🔗 Project root directory
PROJECT_ROOT = Path(__file__).resolve().parents[2]
SERVER_ROOT = Path(__file__).resolve().parents[1]

# 📁 User database directory
USER_DATABASE_DIR = Path(os.getenv("USER_DATABASE_ROOT")).resolve()
# 📄 User data file
USER_DATA_FILE = USER_DATABASE_DIR / os.getenv("USER_DATA_FILE")
# 📝 Upload directories
USER_RESUMES_ROOT = USER_DATABASE_DIR / os.getenv("USER_RESUMES_DIR")
USER_PROJECTS_ROOT = USER_DATABASE_DIR / os.getenv("USER_PROJECTS_DIR")
USER_ACHIEVEMENTS_ROOT = USER_DATABASE_DIR / os.getenv("USER_ACHIEVEMENTS_DIR")

# Host
RUNNER_ID = os.getenv("RUNNER_ID")

# 🔗 Tesseract OCR executable path
TESSERACT_PATH = os.getenv('TESSERACT_PATH')
# Get the browser name from the environment variable
BROWSER_NAME = os.getenv("BROWSER_NAME")
USE_TOR = (BROWSER_NAME == "Brave") and (os.getenv("USE_TOR", "false").lower() == "true")
# Based on the selected browser, set the appropriate path
if BROWSER_NAME == "Brave":
    BROWSER_PATH = Path(os.getenv("BRAVE_PATH", "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe"))
elif BROWSER_NAME == "Chrome":
    BROWSER_PATH = Path(os.getenv("CHROME_PATH", "C:/Program Files/Google/Chrome/Application/chrome.exe"))
else:
    raise ValueError("Unsupported browser selected in the environment configuration.")
BRAVE_PATH = Path(os.getenv("BRAVE_PATH", "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe"))
CHROME_PATH = Path(os.getenv("CHROME_PATH", "C:/Program Files/Google/Chrome/Application/chrome.exe"))
DRIVER_PATH = PROJECT_ROOT / os.getenv("DRIVER_PATH", "config/chromedriver-win64/chromedriver.exe")

# Make sure directories exist
USER_DATABASE_DIR.mkdir(parents=True, exist_ok=True)
USER_RESUMES_ROOT.mkdir(parents=True, exist_ok=True)
USER_PROJECTS_ROOT.mkdir(parents=True, exist_ok=True)
USER_ACHIEVEMENTS_ROOT.mkdir(parents=True, exist_ok=True)
assert BROWSER_NAME in ["Brave", "Chrome"], f"❌ BROWSER_NAME must be 'Brave' or 'Chrome', got: {BROWSER_NAME}"
assert DRIVER_PATH, "❌ DRIVER_PATH not set in .env"
assert USER_RESUMES_ROOT, "❌ RESUME_ROOT not set in .env"
if not BROWSER_PATH.exists(): raise FileNotFoundError(f"Browser executable not found at: {BROWSER_PATH}")

