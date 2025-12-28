pub mod core;
pub mod commands;

// 了解更多关于 Tauri 命令的信息，请访问 https://tauri.app/v1/guides/features/command

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
            commands::reveal_in_explorer,
            commands::open_devtools
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
