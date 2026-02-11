import threading
import winsound
import tkinter as tk
import time
import os

# Inside breakpoint_notifier.py

# Get the directory where this file lives
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Build path to the sound file relative to this module
SOUND_FILE = os.path.join(BASE_DIR, "sounds", "radiant-sound.wav")



class BreakpointNotifier:
    def __init__(self, sound_file: str = SOUND_FILE, use_tkinter_ui: bool = True):
        self.sound_file = sound_file
        self.use_tkinter_ui = use_tkinter_ui
        self._sound_lock = threading.Lock()
        self._sound_playing = False

    # ---------- SOUND CONTROL ----------
    def _start_sound_loop(self):
        winsound.PlaySound(
            self.sound_file,
            winsound.SND_FILENAME | winsound.SND_ASYNC | winsound.SND_LOOP
        )

    def _stop_sound(self):
        winsound.PlaySound(None, winsound.SND_PURGE)
        self._sound_playing = False

    # ---------- TERMINAL STOP ----------
    def _terminal_stop_listener(self):
        print("\n⚠️ Automation breakpoint reached.")
        print("Type 'stop' and press Enter to silence the alert.\n")

        while self._sound_playing:
            try:
                user_input = input().strip().lower()
                if user_input == "stop":
                    self._stop_sound()
                    print("🔕 Alert silenced.")
                    break
            except EOFError:
                break

    # ---------- TKINTER STOP ----------
    def _tkinter_stop_listener(self):
        import tkinter as tk

        root = tk.Tk()
        root.title("Automation Alert")
        root.geometry("400x160")
        root.overrideredirect(True)  # remove title bar for modern popup
        root.attributes("-topmost", True)
        root.configure(bg="#f0f2f5")  # neutral background

        # Center the window
        root.update_idletasks()
        width, height = 400, 160
        x = (root.winfo_screenwidth() // 2) - (width // 2)
        y = (root.winfo_screenheight() // 2) - (height // 2)
        root.geometry(f"{width}x{height}+{x}+{y}")

        canvas = tk.Canvas(root, width=width, height=height, bg="#f0f2f5", highlightthickness=0)
        canvas.pack(fill="both", expand=True)

        # --- Rounded rectangle helper ---
        def create_rounded_rect(x1, y1, x2, y2, r=20, **kwargs):
            # Draw a rounded rectangle using polygons and arcs
            points = [
                x1+r, y1,
                x2-r, y1,
                x2, y1,
                x2, y1+r,
                x2, y2-r,
                x2, y2,
                x2-r, y2,
                x1+r, y2,
                x1, y2,
                x1, y2-r,
                x1, y1+r,
                x1, y1
            ]
            return canvas.create_polygon(points, **kwargs, smooth=True)

        # --- Main notification frame ---
        create_rounded_rect(10, 10, width-10, height-10, r=20, fill="white", outline="#d0d0d0")

        # --- Header ---
        canvas.create_text(30, 40, anchor="w", text="🚨 Automation Breakpoint Hit",
                        font=("Segoe UI", 13, "bold"), fill="#2c3e50")
        # --- Info ---
        canvas.create_text(30, 70, anchor="w", text="Click below to stop the alert sound.",
                        font=("Segoe UI", 11), fill="#34495e")

        # --- Rounded button ---
        btn_x, btn_y, btn_w, btn_h = width-150, height-60, 120, 35
        btn_radius = 15

        def create_rounded_button():
            # Draw button shape
            btn = create_rounded_rect(btn_x, btn_y, btn_x+btn_w, btn_y+btn_h, r=btn_radius, fill="#3498db", outline="")
            # Draw text
            txt = canvas.create_text(btn_x + btn_w//2, btn_y + btn_h//2, text="🔕 Stop",
                                    fill="white", font=("Segoe UI", 11, "bold"))

            # Hover effect
            def on_enter(e):
                canvas.itemconfig(btn, fill="#2980b9")

            def on_leave(e):
                canvas.itemconfig(btn, fill="#3498db")

            def on_click(e):
                self._stop_sound()
                root.destroy()

            # Bind events
            for item in (btn, txt):
                canvas.tag_bind(item, "<Enter>", on_enter)
                canvas.tag_bind(item, "<Leave>", on_leave)
                canvas.tag_bind(item, "<Button-1>", on_click)

            canvas.config(cursor="hand2")

        create_rounded_button()

        root.mainloop()


    # ---------- PUBLIC API ----------
    def notify_breakpoint(self):
        """
        Call this from ANY breakpoint / failure.
        Sound loops until user explicitly stops it.
        Safe to call multiple times.
        """
        with self._sound_lock:
            if self._sound_playing:
                return  # already notifying

            self._sound_playing = True

            # Start sound
            threading.Thread(target=self._start_sound_loop, daemon=True).start()

            # Start stop mechanism
            if self.use_tkinter_ui:
                threading.Thread(target=self._tkinter_stop_listener, daemon=True).start()
            else:
                threading.Thread(target=self._terminal_stop_listener, daemon=True).start()

    def keep_playing(self):
        # Keep main thread alive while alert is active
        try:
            while self._sound_playing:
                time.sleep(0.1)
        except KeyboardInterrupt:
            print("\nKeyboardInterrupt detected. Stopping alert...")
            self._stop_sound()

    def notify_and_keep_playing(self):
        self.notify_breakpoint()
        self.keep_playing()


# ---------- TEST HARNESS ----------
if __name__ == "__main__":
    # SOUND_FILE = r"D:\Kalp\Jobs\Projects\ApplyPilot\server\modules\breakpoint_notifier\sound\radiant-sound.wav"
    # USE_TKINTER_UI = True  # Change to False to test terminal input

    import time

    time.sleep(5)

    print("🟢 Testing BreakpointNotifier...")
    print("The alert sound should start now and keep looping.")
    print("Stop it using the UI or typing 'stop' in the terminal.")

    notifier = BreakpointNotifier()
    notifier.notify_and_keep_playing()
