
// Public re-exports for Tauri
pub use crate::history::commands_health::history_health_check;
pub use crate::history::commands_crud::{
    history_list_files, history_list_versions, history_record_stub,
    history_copy_restore, history_get_version_content, history_materialize,
};
pub use crate::history::commands_gc::{
    history_gc, history_delete_versions, history_delete_file_history,
};
pub use crate::history::commands_noise::{
    history_scan_noise_files, history_purge_noise_files, history_debug_db_info,
};
pub use crate::history::commands_convert::history_convert_legacy_checkpoints;
