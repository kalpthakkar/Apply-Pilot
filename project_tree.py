import os
import fnmatch
from pathlib import Path


# ==========================
# CONFIGURATION SECTION
# ==========================

CONFIG = {
    # Ignore by exact folder/file name anywhere
    "ignore_names": {
        "node_modules",
        ".git",
        "dist",
        "build",
        ".next",
        "coverage",
        "__pycache__",
        "site-packages",
        "Include",
        "Lib",
        "Scripts",
        "venv",
        ".venv",
        "env",
        "pyvenv.cfg",
    },

    # Ignore by glob patterns anywhere
    "ignore_patterns": {
        "*.pyc",
        "*.log",
        "*.tmp",
        "*.cache",
    },

    # Path-based ignore rules
    # Format:
    #   "parent_folder": {"child_to_ignore", ...}
    #
    # Means:
    #   Ignore child only when inside that parent
    #
    "path_rules": {
        "folder_a": {"folder_b"},  # folder_a > folder_b
        # Example:
        # "src": {"generated"},
    },

    # Show hidden files?
    "show_hidden": False,
}


# ==========================
# LOGIC SECTION
# ==========================

def should_ignore(path: Path, root: Path):
    relative_parts = path.relative_to(root).parts

    # Ignore hidden files (optional)
    if not CONFIG["show_hidden"] and any(part.startswith('.') for part in relative_parts):
        return True

    # Ignore by name
    if path.name in CONFIG["ignore_names"]:
        return True

    # Ignore by glob pattern
    for pattern in CONFIG["ignore_patterns"]:
        if fnmatch.fnmatch(path.name, pattern):
            return True

    # Path-based rule (parent > child)
    if len(relative_parts) >= 2:
        parent = relative_parts[-2]
        child = relative_parts[-1]
        if parent in CONFIG["path_rules"]:
            if child in CONFIG["path_rules"][parent]:
                return True

    return False


def generate_tree(root: Path, prefix=""):
    entries = sorted(
        [p for p in root.iterdir() if not should_ignore(p, ROOT)],
        key=lambda x: (not x.is_dir(), x.name.lower())
    )

    lines = []
    for index, path in enumerate(entries):
        connector = "└── " if index == len(entries) - 1 else "├── "
        lines.append(prefix + connector + path.name)

        if path.is_dir():
            extension = "    " if index == len(entries) - 1 else "│   "
            lines.extend(generate_tree(path, prefix + extension))

    return lines


# ==========================
# ENTRY POINT
# ==========================

if __name__ == "__main__":
    ROOT = Path(".").resolve()
    tree_lines = [ROOT.name]
    tree_lines.extend(generate_tree(ROOT))

    output = "\n".join(tree_lines)

    with open("structure.txt", "w", encoding="utf-8") as f:
        f.write(output)

    print(output)
    print("\nSaved to structure.txt")
