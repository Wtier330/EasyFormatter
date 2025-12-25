I will upgrade the "EasyFormatter" application to V1.1, focusing on efficiency ("Preset"), certainty ("Feedback"), and memory ("Persistence").

### **Plan of Action**

1.  **Core Logic Upgrade (`app/core/preset_manager.py` - New):**
    *   Implement a new `PresetManager` (replacing or extending `PresetService`) to handle built-in and custom presets.
    *   Define the structure for presets: Name -> Map of Rule ID to Boolean state.
    *   Implement built-in presets: "General Cleaning", "Digits Only", "Remove Separators", "Structured Cleaning".

2.  **Persistence Upgrade (`app/services/settings_service.py`):**
    *   Extend `SettingsService` to save/restore:
        *   `last_tab_index`: The last opened tab (Text vs JSON).
        *   `active_preset`: The name of the last active preset.
        *   `realtime_enabled`: The toggle state of real-time preview.
        *   `rule_states`: A dictionary of all rule checkbox states.
        *   `window_geometry`: Restore window size/position (optional but good for "memory").

3.  **UI Refactoring (`app/ui/main_window.py`):**
    *   **Preset Bar:** Add a horizontal layout of `QToolButton` (chips style) at the top of the rules panel or below the toolbar.
    *   **Feedback Mechanisms:**
        *   Update `process_text_rules` to return the count of applied rules.
        *   Update `on_rule_changed` to show ephemeral status bar messages ("Rules updated: Strip, No Separators...").
        *   Update Output GroupBox title to show "Output (Applied X rules)" temporarily.
    *   **State Restoration:** In `__init__`, load settings and apply them *before* showing the window.
    *   **Input/Output Enhancements:**
        *   Update `QPlainTextEdit` placeholders with rich examples.
        *   Style the Output area to look strictly read-only (gray background, lock icon).

4.  **Files to be Created/Updated:**
    *   `app/core/preset_manager.py`: New file for preset logic.
    *   `app/services/settings_service.py`: Update persistence logic.
    *   `app/ui/main_window.py`: Massive update for UI changes (Preset Bar, Feedback, Restoration).
    *   `app/ui/styles.qss`: Update styles for chips/presets and read-only look.

### **Verification**

*   **Preset Switching:** Click "Digits Only" -> Checkboxes update instantly -> Output updates.
*   **Custom State:** Change a rule manually -> Preset indicator (if any) changes to "Custom".
*   **Feedback:** Toggle a rule -> Status bar shows "Rule updated: ...". Process text -> Output title flashes rule count.
*   **Memory:** Close app -> Reopen -> Tab, Rules, and Real-time toggle are exactly as left.
