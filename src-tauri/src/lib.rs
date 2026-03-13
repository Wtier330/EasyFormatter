pub mod core;
pub mod commands;
pub mod appdirs;
pub mod history;

use std::path::Path;
use tauri::Emitter;
use tauri::Manager;

// 了解更多关于 Tauri 命令的信息，请访问 https://tauri.app/v1/guides/features/command

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let open_paths: Vec<String> = std::env::args()
        .skip(1)
        .filter(|arg| !arg.starts_with('-'))
        .filter(|arg| Path::new(arg).exists())
        .collect();
    commands::set_pending_open_paths(open_paths);

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            let paths: Vec<String> = argv
                .into_iter()
                .filter(|arg| !arg.starts_with('-'))
                .filter(|arg| Path::new(arg).exists())
                .collect();

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }

            if !paths.is_empty() {
                let _ = app.emit("open-paths", paths);
            }
        }))
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            commands::format_text,
            commands::json_apply,
            commands::save_text_file,
            commands::read_text,
            commands::write_text,
            commands::file_exists,
            commands::reveal_in_explorer,
            commands::open_devtools,
            commands::take_pending_open_paths,
            history::commands::history_health_check,
            history::commands::history_list_files,
            history::commands::history_list_versions,
            history::commands::history_record_stub,
            history::commands::history_copy_restore,
            history::commands::history_get_version_content,
            history::commands::history_materialize,
            history::commands::history_stats,
            history::commands::history_scan_noise_files,
            history::commands::history_purge_noise_files,
            history::commands::history_delete_file_history,
            history::commands::history_delete_versions,
            history::commands::history_gc,
            history::commands::history_debug_db_info,
            history::commands::history_convert_legacy_checkpoints
        ]);
    
    // 启动时主动初始化应用数据目录结构
    if let Some(dirs) = appdirs::get_app_dirs() {
        let _ = dirs.init();
    }
    
    builder.run(tauri::generate_context!())
        .expect("error while running tauri application");
}
