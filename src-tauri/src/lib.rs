pub mod core;
pub mod commands;
pub mod appdirs;
pub mod history;

// 了解更多关于 Tauri 命令的信息，请访问 https://tauri.app/v1/guides/features/command

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
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
            history::commands::history_health_check,
            history::commands::history_list_files,
            history::commands::history_list_versions,
            history::commands::history_record_stub,
            history::commands::history_copy_restore,
            history::commands::history_get_version_content,
            history::commands::history_materialize,
            history::commands::history_stats,
            history::commands::history_gc,
            history::commands::history_debug_db_info
        ]);
    
    // 启动时主动初始化应用数据目录结构
    if let Some(dirs) = appdirs::get_app_dirs() {
        let _ = dirs.init();
    }
    
    builder.run(tauri::generate_context!())
        .expect("error while running tauri application");
}
