I will perform a comprehensive refactoring of the "Data Formatting Tool" UI and architecture to match your detailed requirements.

### **Plan of Action**

1. **Core Logic Refactoring (Backend):**

   * **Create** **`app/core/formatter.py`:**

     * Migrate text processing rules from `rules.py` and `pipeline.py`.

     * Implement the "Separators" logic to be configurable (supporting granular selection of `,`, `;`, etc.).

     * Implement the fixed pipeline order: Separators → Strip → Merge Whitespace → Keep Digits → Empty Lines → Unique Lines.

   * **Create** **`app/core/json_tools.py`:**

     * Migrate `JsonService` logic here.

     * Add JSON configuration handling (indent, sort keys).

2. **UI Refactoring (`app/ui/main_window.py`):**

   * **Main Layout:**

     * **Top:** `QToolBar` (Global Actions).

     * **Left:** `QDockWidget` containing a `QTabWidget` (Tab 1: Text Rules, Tab 2: JSON Tools).

     * **Right:** Vertical `QSplitter` with Input (Top) and Output (Bottom).

     * **Bottom:** `QStatusBar`.

   * **Action Management:**

     * Centralize all `QAction` definitions (Paste, Copy, Clear, etc.).

     * Share `QAction` instances between the Top Toolbar, Inline Buttons, and Keyboard Shortcuts.

   * **Features:**

     * **Real-time Preview:** `QTimer` based debounce (150ms).

     * **Status Bar:** Custom logic to show line/char counts and temporary success messages.

     * **Icon System:** Implement the safe loading mechanism (Assets -> System Fallback).

     * **Visuals:** Apply specific styling for the "Read-only" output area and refined component spacing.

3. **Entry Point:**

   * Update `main.py` to launch the new `MainWindow`.

4. **Files to be Created/Updated:**

   * `main.py`

   * `app/ui/main_window.py` (Complete rewrite)

   * `app/core/formatter.py` (New)

   * `app/core/json_tools.py` (New)

   * `requirements.txt`

### **Verification**

* Ensure all 7 top-bar buttons are correctly grouped.

* Verify the "Rules" panel has the required hierarchy (GroupBox, Checkboxes, Tooltips).

* Confirm the "JSON" tab is isolated from the "Text" tab but shares the input/output.

* Check that "Real-time Preview" toggle works as requested.

