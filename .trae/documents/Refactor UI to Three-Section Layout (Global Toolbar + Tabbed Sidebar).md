I will refactor the main window layout to align with the "Three-Section Layout" design provided in the images.

**1. Sidebar Refactoring (Left Pane)**
*   **Goal:** Make the sidebar self-contained and switchable between "Text Rules" and "JSON Tools" internally, rather than being controlled by the top bar.
*   **Action:**
    *   Replace the external `QStackedWidget` control with a `QTabWidget` directly inside the sidebar (`sidebar_container`).
    *   Create two tabs: "Text Rules" (default) and "JSON Tools".
    *   This matches Image 3 ("Left Top add QTabWidget").

**2. Top Navigation Bar Refactoring (Global ToolBar)**
*   **Goal:** Transform the NavBar into a Global Action Bar as described in Image 4.
*   **Action:**
    *   **Left Group (Main Actions):** Add "Paste to Input", "Clear Input", "Copy Result" buttons.
    *   **Middle/Right Group (Advanced):** Keep "Batch Processing" and "Export CSV".
    *   **Far Right Group (Settings):** Keep "Presets" and "Theme".
    *   **Real-time Toggle:** Add a "Real-time" checkbox/toggle in the toolbar to control auto-formatting (Image 4.2).

**3. Input/Output Area Refactoring**
*   **Goal:** Ensure the layout matches the vertical split (Input Top / Output Bottom) and button consistency.
*   **Action:**
    *   (Already implemented Vertical Splitter in previous step, will verify).
    *   Ensure the local buttons (in the headers of Input/Output) share the same logic/actions as the Global ToolBar buttons.

**4. Styling**
*   **Action:** Update `styles.qss` to style the new `QTabWidget` in the sidebar and refine the ToolBar buttons to look like a cohesive toolbar.

**Verification:**
I will run the application to verify the new layout structure (Top Toolbar -> Left Tabbed Sidebar + Right Vertical Input/Output).