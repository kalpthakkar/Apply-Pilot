import cv2
import pyautogui
import pytesseract
import numpy as np
import os
import math
import shutil
import time
from typing import Tuple, List, Dict, Optional, Literal
from dataclasses import dataclass
from rapidfuzz import fuzz
from skimage.metrics import structural_similarity as ssim
from config.env_config import SERVER_ROOT

# Configuring Tesseract location for pytesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'  # Modify based on your system.



from dataclasses import dataclass, field
from typing import Dict, Tuple, Optional, Callable, Any

@dataclass
class DesktopConfig:
    """
    Unrestricted, extensible virtual desktop configuration.
    """

    # Logical actions → hotkeys
    keymap: Dict[str, Tuple[str, ...]] = field(default_factory=lambda: {
        "left": ("ctrl", "win", "left"),
        "right": ("ctrl", "win", "right"),
        "new": ("ctrl", "win", "d"),
        "close": ("ctrl", "win", "f4"),
        "task_view": ("win", "tab"),
    })

    # Timing behavior
    delays: Dict[str, float] = field(default_factory=lambda: {
        "key_interval": 0.05,
        "after_switch": 0.25,
        "after_create": 0.4,
        "after_task_view": 0.6,
    })

    # Retry & robustness
    retries: int = 1
    retry_delay: float = 0.1

    # Optional constraints (None = unrestricted)
    max_desktops: Optional[int] = None
    min_desktop: int = 1

    # Optional intelligence hooks (plug-ins)
    detect_current_desktop: Optional[Callable[[], int]] = None
    on_before_switch: Optional[Callable[[Dict[str, Any]], None]] = None
    on_after_switch: Optional[Callable[[Dict[str, Any]], None]] = None


class ScreenUtility:
    def __init__(self, screen_resolution: Optional[Tuple[int, int]] = None, desktop_config: Optional[DesktopConfig] = None):
        """
        Initialize the utility. If screen_resolution is not provided, detect dynamically.
        """
        if screen_resolution is None:
            screen_resolution = pyautogui.size()
        self.screen_width, self.screen_height = screen_resolution
        self.regions = {}
        self.desktop: DesktopConfig = desktop_config or DesktopConfig()
        self._last_snapshot_gray: Optional[np.ndarray] = None
    
    # -----------------------
    # 🖱️ Basic INTERACTION Actions
    # -----------------------

    def click(self, x: int = None, y: int = None, region: str = None):
        """ Click at any (x, y) or image/text """
        if region:
            region_coords = self.get_region(region)
            if region_coords:
                x = region_coords[0] + region_coords[2] // 2
                y = region_coords[1] + region_coords[3] // 2
        # if x is not None and y is not None:
        #     pyautogui.click(x, y)
        pyautogui.click(x, y)

    def double_click(self, x: int = None, y: int = None):
        """ Double click anywhere """
        pyautogui.doubleClick(x, y)

    def right_click(self, x: int = None, y: int = None):
        """ Right-click at any point """
        pyautogui.rightClick(x, y)

    def move_to(self, x: int = None, y: int = None, region: str = None, duration: float = 0.2):
        """ Move mouse to absolute or relative location """
        if region:
            region_coords = self.get_region(region)
            if region_coords:
                x = region_coords[0] + region_coords[2] // 2
                y = region_coords[1] + region_coords[3] // 2
        if x is not None and y is not None:
            pyautogui.moveTo(x, y, duration=duration)

    def drag_to(self, x: int, y: int, duration: float = 0.5):
        """ Drag the mouse to a specific location """
        pyautogui.dragTo(x, y, duration=duration)

    def scroll(self, amount: int):
        """ Scroll up/down with positive/negative values """
        pyautogui.scroll(amount)

    def hover(self, x: int = None, y: int = None, region: str = None, duration: float = 1.0):
        """ Move mouse to a point and stay for some time """
        self.move_to(x, y, region)
        time.sleep(duration)

    def type_text(self, text: str, interval: float = 0.1):
        """ Type text at current cursor or a location """
        pyautogui.write(text, interval=interval)

    def press_key(self, key: str):
        """ Simulate single or combo key presses """
        pyautogui.press(key)

    def hotkey(self, *keys):
        pyautogui.hotkey(*keys)

    def configure_desktop_control(self, config: DesktopConfig):
        """
        Override desktop configuration at runtime.
        """
        self.desktop = config

    def switch_desktop(self, direction: Literal["left", "right"], steps: int = 1):
        cfg = self.desktop

        keys = cfg.keymap[direction]
        key_interval = cfg.delays["key_interval"]
        after_switch = cfg.delays["after_switch"]

        context = {
            "direction": direction,
            "steps": steps
        }

        if cfg.on_before_switch:
            cfg.on_before_switch(context)

        for _ in range(steps):
            for _ in range(cfg.retries):
                pyautogui.hotkey(*keys, interval=key_interval)
                time.sleep(after_switch)

        if cfg.on_after_switch:
            cfg.on_after_switch(context)

    def go_to_desktop(self, target: int, current: int, wrap: bool = False):
        cfg = self.desktop

        if target == current:
            return

        if cfg.max_desktops and not (cfg.min_desktop <= target <= cfg.max_desktops):
            raise ValueError("Target desktop out of bounds")

        delta = target - current

        if wrap and cfg.max_desktops:
            delta %= cfg.max_desktops
            if delta > cfg.max_desktops // 2:
                delta -= cfg.max_desktops

        direction = "right" if delta > 0 else "left"
        self.switch_desktop(direction, abs(delta))

    def create_new_desktop(self):
        cfg = self.desktop

        if "new" not in cfg.keymap:
            raise RuntimeError("No hotkey configured for creating a new desktop")

        pyautogui.hotkey(
            *cfg.keymap["new"],
            interval=cfg.delays.get("key_interval", 0.05)
        )

        time.sleep(cfg.delays.get("after_create", 0.3))


    # -----------------------
    # 🖱️ Advanced INTERACTION Actions (Using Images & Text based detection)
    # -----------------------

    def get_screen_resolution(self):
        """Return screen resolution (width, height)."""
        return self.screen_width, self.screen_height
    
    def split_screen(self, rows: int, cols: int) -> None:
        """Split the screen into grid of regions based on rows and columns."""

        # Error handling
        rows = 1 if rows < 1 else int(rows)
        cols = 1 if cols < 1 else int(cols)

        self.regions = {}
        region_width = self.screen_width // cols
        region_height = self.screen_height // rows
        
        for row in range(rows):
            for col in range(cols):
                region_name = f"Row{row+1}_Col{col+1}"
                self.regions[region_name] = (
                    col * region_width, row * region_height, region_width, region_height
                )
        
    def locate_image(self, image_path: str, region: str = None) -> Tuple[int, int]:
        """Locate an image on the screen using pyautogui and return the center coordinates."""
        image = cv2.imread(image_path)
        screenshot = pyautogui.screenshot()
        screenshot = np.array(screenshot)
        screenshot = cv2.cvtColor(screenshot, cv2.COLOR_RGB2BGR)

        if region:
            region_coords = self.regions.get(region)
            if region_coords:
                x, y, w, h = region_coords
                screenshot = screenshot[y:y+h, x:x+w]
            else:
                raise ValueError(f"Region '{region}' not found.")
        
        result = cv2.matchTemplate(screenshot, image, cv2.TM_CCOEFF_NORMED)
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)
        
        # Get the center of the matched image
        img_height, img_width = image.shape[:2]
        center_x = max_loc[0] + img_width // 2
        center_y = max_loc[1] + img_height // 2

        if region:
            x_offset, y_offset, *_ = self.regions[region]
            center_x += x_offset
            center_y += y_offset
        
        return center_x, center_y
    
    def _configure_tesseract(self):
        """
        Attempts to locate the Tesseract executable and configure pytesseract.
        Tries:
        1. System PATH
        2. Common Windows install paths
        3. Warns user if not found
        """
        possible_paths = [
            shutil.which("tesseract"),  # Check if available in PATH
            r"C:\Program Files\Tesseract-OCR\tesseract.exe", # Example custom path
        ]

        for path in possible_paths:
            if path and os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                return

        print("[Warning] Tesseract executable not found. Please set it manually using `set_tesseract_path()`.")

    def set_tesseract_path(self, path: str):
        """
        Manually set the path to the tesseract executable.
        Example:
            util.set_tesseract_path(r"D:/Path/To/tesseract.exe")
        """
        if not os.path.exists(path):
            raise FileNotFoundError(f"Tesseract not found at: {path}")
        pytesseract.pytesseract.tesseract_cmd = path
        print(f"[Info] Tesseract path set to: {path}")

    def locate_text(self, text: str, region: str = None, fuzzy: bool = False, threshold: int = 90) -> Optional[Tuple[int, int]]:
        screenshot = pyautogui.screenshot()
        screenshot = np.array(screenshot)
        screenshot = cv2.cvtColor(screenshot, cv2.COLOR_RGB2BGR)

        if region:
            region_coords = self.regions.get(region)
            if region_coords:
                x, y, w, h = region_coords
                screenshot = screenshot[y:y+h, x:x+w]
            else:
                raise ValueError(f"Region '{region}' not found.")

        data = pytesseract.image_to_data(screenshot, output_type=pytesseract.Output.DICT)
        num_items = len(data['text'])

        search_text = text.strip().lower().split()
        num_words = len(search_text)

        for i in range(num_items - num_words + 1):
            words = [data['text'][j].strip() for j in range(i, i + num_words)]
            phrase = " ".join(words).lower()

            if not any(words):  # skip empty OCR results
                continue

            if (not fuzzy and phrase == text.lower()) or \
            (fuzzy and fuzz.ratio(phrase, text.lower()) >= threshold):
                x_vals = [data['left'][j] for j in range(i, i + num_words)]
                y_vals = [data['top'][j] for j in range(i, i + num_words)]
                w_vals = [data['width'][j] for j in range(i, i + num_words)]
                h_vals = [data['height'][j] for j in range(i, i + num_words)]

                x_min = min(x_vals)
                y_min = min(y_vals)
                x_max = max(x + w for x, w in zip(x_vals, w_vals))
                y_max = max(y + h for y, h in zip(y_vals, h_vals))

                center_x = (x_min + x_max) // 2
                center_y = (y_min + y_max) // 2

                if region:
                    x_offset, y_offset, *_ = self.regions[region]
                    center_x += x_offset
                    center_y += y_offset

                return center_x, center_y

        return None
    
    def get_region(self, region: str) -> Dict[str, int]:
        """Get the pixel coordinates for a specific region."""
        return self.regions.get(region, None)
    
    def display_region(self, region: str) -> None:
        """Highlight the region on the screen (for debugging)."""
        region_coords = self.regions.get(region)
        if region_coords:
            x, y, w, h = region_coords
            screenshot = pyautogui.screenshot()
            screenshot = np.array(screenshot)
            screenshot = cv2.cvtColor(screenshot, cv2.COLOR_RGB2BGR)
            
            cv2.rectangle(screenshot, (x, y), (x+w, y+h), (0, 255, 0), 2)
            cv2.imshow(f"Region: {region}", screenshot)
            cv2.waitKey(0)
            cv2.destroyAllWindows()
        else:
            raise ValueError(f"Region '{region}' not found.")

    def click_center_of_image(self, image_path: str, region: str = None) -> None:
        """Find the image and click its center."""
        center_x, center_y = self.locate_image(image_path, region)
        pyautogui.click(center_x, center_y)

    def click_center_of_text(self, text: str, region: str = None, fuzzy: bool = False, threshold: int = 90) -> None:
        """Find the text and click its center."""
        center_x, center_y = self.locate_text(text, region, fuzzy, threshold)
        if center_x and center_y:
            pyautogui.click(center_x, center_y)

    # -----------------------
    # 🖱️ Other Advanced Methods (Using Images & Text based detection)
    # -----------------------

    def get_centers_from_coordinates(self, coordinates: list) -> list:
        centers = []
        for coord in coordinates:
            # Check the format and normalize the coordinates to (x_min, y_min, x_max, y_max)
            
            # If it's a tuple or list of two tuples
            if isinstance(coord, (tuple, list)) and len(coord) == 2:
                (x_min, y_min), (x_max, y_max) = coord
            # If it's a tuple or list of four integers
            elif isinstance(coord, (tuple, list)) and len(coord) == 4:
                x_min, y_min, x_max, y_max = coord
            else:
                raise ValueError("Invalid coordinate format, must be a tuple/list of 2 or 4 elements.")

            # Calculate the center of the bounding box
            center_x = (x_min + x_max) // 2
            center_y = (y_min + y_max) // 2
            centers.append((center_x, center_y))
        
        return centers

    def is_image_present(self, image_path: str, region: str = None, confidence: float = 0.7) -> bool:
        try:
            image = cv2.imread(image_path)
            screenshot = pyautogui.screenshot()
            screenshot = np.array(screenshot)
            screenshot = cv2.cvtColor(screenshot, cv2.COLOR_RGB2BGR)

            if region:
                region_coords = self.regions.get(region)
                if region_coords:
                    x, y, w, h = region_coords
                    screenshot = screenshot[y:y+h, x:x+w]
                else:
                    raise ValueError(f"Region '{region}' not found.")

            result = cv2.matchTemplate(screenshot, image, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, _ = cv2.minMaxLoc(result)

            return max_val >= confidence
        except Exception as e:
            print(f"[Error] Image detection failed: {e}")
            return False

    def is_text_present(self, text: str, region: str = None, fuzzy: bool = False, threshold: int = 90) -> bool:
        try:
            screenshot = pyautogui.screenshot()
            screenshot = np.array(screenshot)
            screenshot = cv2.cvtColor(screenshot, cv2.COLOR_RGB2BGR)

            if region:
                region_coords = self.regions.get(region)
                if region_coords:
                    x, y, w, h = region_coords
                    screenshot = screenshot[y:y+h, x:x+w]
                else:
                    raise ValueError(f"Region '{region}' not found.")

            data = pytesseract.image_to_data(screenshot, output_type=pytesseract.Output.DICT)
            num_items = len(data['text'])

            search_text = text.strip().lower().split()
            num_words = len(search_text)

            for i in range(num_items - num_words + 1):
                words = [data['text'][j].strip() for j in range(i, i + num_words)]
                phrase = " ".join(words).lower()

                if not any(words):
                    continue

                if (not fuzzy and phrase == text.lower()) or \
                (fuzzy and fuzz.ratio(phrase, text.lower()) >= threshold):
                    return True

            return False
        except Exception as e:
            print(f"[Error] Text detection failed: {e}")
            return False

    def get_all_image_coordinates(self, image_path: str, region: str = None, confidence: float = 0.7) -> list:
        coordinates = []
        try:
            image = cv2.imread(image_path)
            screenshot = pyautogui.screenshot()
            screenshot = np.array(screenshot)
            screenshot = cv2.cvtColor(screenshot, cv2.COLOR_RGB2BGR)

            if region:
                region_coords = self.regions.get(region)
                if region_coords:
                    x, y, w, h = region_coords
                    screenshot = screenshot[y:y+h, x:x+w]
                else:
                    raise ValueError(f"Region '{region}' not found.")

            result = cv2.matchTemplate(screenshot, image, cv2.TM_CCOEFF_NORMED)
            locations = cv2.minMaxLoc(result)[3]  # All locations of max matches

            # Get all locations where matching occurs above the confidence threshold
            threshold_matches = np.where(result >= confidence)

            for pt in zip(*threshold_matches[::-1]):
                coordinates.append((pt[0] + x, pt[1] + y))

            return coordinates
        except Exception as e:
            print(f"[Error] Image coordinate retrieval failed: {e}")
            return []

    def get_all_text_coordinates(self, text: str, region: str = None, fuzzy: bool = False, threshold: int = 90) -> list:
        coordinates = []
        try:
            screenshot = pyautogui.screenshot() # # Load the screen image
            screenshot = cv2.cvtColor(np.array(screenshot), cv2.COLOR_RGB2BGR) #  Convert to grayscale for better OCR results

            # If region is provided, crop the screenshot to that region
            if region:
                region_coords = self.regions.get(region)
                if region_coords:
                    x, y, w, h = region_coords
                    screenshot = screenshot[y:y+h, x:x+w]
                else:
                    raise ValueError(f"Region '{region}' not found.")

            data = pytesseract.image_to_data(screenshot, output_type=pytesseract.Output.DICT)
            num_items = len(data['text'])

            search_text = text.strip().lower().split()
            num_words = len(search_text)

            for i in range(num_items - num_words + 1):
                words = [data['text'][j].strip() for j in range(i, i + num_words)]
                phrase = " ".join(words).lower()

                if not any(words):
                    continue

                if (not fuzzy and phrase == text.lower()) or \
                (fuzzy and fuzz.ratio(phrase, text.lower()) >= threshold):
                    x_vals = [data['left'][j] for j in range(i, i + num_words)]
                    y_vals = [data['top'][j] for j in range(i, i + num_words)]
                    w_vals = [data['width'][j] for j in range(i, i + num_words)]
                    h_vals = [data['height'][j] for j in range(i, i + num_words)]

                    x_min = min(x_vals)
                    y_min = min(y_vals)
                    x_max = max(x + w for x, w in zip(x_vals, w_vals))
                    y_max = max(y + h for y, h in zip(y_vals, h_vals))

                    if region:
                        x_offset, y_offset, *_ = self.regions[region]
                        x_min += x_offset
                        y_min += y_offset
                        x_max += x_offset
                        y_max += y_offset

                    coordinates.append(((x_min, y_min), (x_max, y_max)))

            return coordinates
        except Exception as e:
            print(f"[Error] Text coordinate retrieval failed: {e}")
            return []

    def take_snapshot(self, region: str = None) -> None:
        screenshot = pyautogui.screenshot()
        frame = cv2.cvtColor(np.array(screenshot), cv2.COLOR_RGB2BGR)

        if region:
            x, y, w, h = self.regions[region]
            frame = frame[y:y+h, x:x+w]

        self._last_snapshot_color = frame
        self._last_snapshot_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    def _screen_change_percentage(self, region: str = None) -> float:
        if self._last_snapshot_color is None:
            raise RuntimeError("No snapshot exists. Call take_snapshot() first.")

        screenshot = pyautogui.screenshot()
        current = cv2.cvtColor(np.array(screenshot), cv2.COLOR_RGB2BGR)

        if region:
            x, y, w, h = self.regions[region]
            current = current[y:y+h, x:x+w]

        if current.shape != self._last_snapshot_color.shape:
            current = cv2.resize(
                current,
                (self._last_snapshot_color.shape[1], self._last_snapshot_color.shape[0])
            )

        # -------------------------------------------------
        # 1️⃣ PER-PIXEL COLOR CHANGE (correctly normalized)
        # -------------------------------------------------
        delta = cv2.absdiff(self._last_snapshot_color, current)
        max_channel_delta = np.max(delta, axis=2)  # per pixel

        color_changed_pixels = np.count_nonzero(max_channel_delta > 25)
        total_pixels = max_channel_delta.size
        color_change_pct = (color_changed_pixels / total_pixels) * 100

        # -------------------------------------------------
        # 2️⃣ INTENSITY (LUMINANCE) CHANGE
        # -------------------------------------------------
        gray_prev = cv2.cvtColor(self._last_snapshot_color, cv2.COLOR_BGR2GRAY)
        gray_curr = cv2.cvtColor(current, cv2.COLOR_BGR2GRAY)

        intensity_delta = cv2.absdiff(gray_prev, gray_curr)
        intensity_change_pct = (
            np.count_nonzero(intensity_delta > 20) / intensity_delta.size
        ) * 100

        # -------------------------------------------------
        # FINAL SCORE (UI-sensitive, not OCR)
        # -------------------------------------------------
        final_change = (
            color_change_pct * 0.7 +
            intensity_change_pct * 0.3
        )

        return final_change

    def has_screen_significantly_changed(
        self,
        threshold: float,
        timeout: float = 5.0,
        poll_interval: float = 0.4,
        region: str = None
    ) -> bool:
        """
        Blocks execution until screen change exceeds threshold (%) or timeout.
        """
        start_time = time.time()

        while True:
            change = self._screen_change_percentage(region)

            if change >= threshold:
                return True

            if time.time() - start_time >= timeout:
                return False

            time.sleep(poll_interval)



# Example usage of the library

if __name__ == "__main__":

    # Initialize ScreenUtility with screen resolution
    screen_util = ScreenUtility(screen_resolution=(1920, 1080))

    screen_util.set_tesseract_path(r'D:\Kalp\Software\tesseract-ocr\tesseract.exe')

    time.sleep(4)
    screen_util.split_screen(3, 3)
    is_connected_img_path = os.path.join(SERVER_ROOT, "modules","utils","assets","tor_connected_successfully.png")
    if screen_util.is_image_present(image_path=is_connected_img_path, region="Row1_Col1", confidence=0.75):
        print("CONNECTED")
    else:
        print("NOT CONNECTED")
    # print(screen_util.is_text_present(text="Tor connected successfully", region="Row1_Col1", fuzzy=True, threshold=60))


    # screen_util.split_screen(3, 3)
    # if screen_util.is_text_present(text="Verify you are human", region="Row2_Col2", fuzzy=True, threshold=80):
    #     print("Human Verification Asked")
    #     img_path = os.path.join(SERVER_ROOT, "modules","utils","assets","human_verification_checkbox.png")
        # if screen_util.is_image_present(image_path=img_path, region="Row2_Col2", confidence=0.75):
        #     screen_util.click_center_of_image(image_path=img_path, region="Row2_Col2")
        # else:
        #     print("Verification Checkbox image not found")


    # time.sleep(5)
    # screen_util.take_snapshot(region="Row1_Col2")
    # pyautogui.hotkey("ctrl", "shift", "j")
    # print("Yoo")
    # if screen_util.has_screen_significantly_changed(threshold=38, region="Row1_Col2", timeout=3):
    #     print("✅ Screen changed")
    # else:
    #     print("❌ Screen did not change")

    # # Split the screen into 3 rows and 3 columns
    # screen_util.split_screen(3, 3)

    # # Locate an image on the screen
    # image_path = "image_to_locate.png"  # Example image
    # center = screen_util.locate_image(image_path)
    # print(f"Image center located at: {center}")

    # # Locate text on the screen
    # text_center = screen_util.locate_text("example_text")
    # print(f"Text center located at: {text_center}")

    # # Click on image center
    # screen_util.click_center_of_image(image_path)

    # # Click on text center
    # screen_util.click_center_of_text("example_text")