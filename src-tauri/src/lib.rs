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
    // 获取当前可执行文件的规范路径（用于过滤）
    let exe_path = std::env::current_exe()
        .ok()
        .and_then(|p| p.canonicalize().ok());

    let open_paths: Vec<String> = std::env::args()
        .skip(1)
        .filter(|arg| !arg.starts_with('-'))
        .filter_map(|arg| {
            let path = Path::new(&arg);
            // 只处理存在的路径
            if !path.exists() {
                return None;
            }

            // 规范化路径进行比较
            if let Ok(canonical) = path.canonicalize() {
                // 排除当前可执行文件
                if let Some(ref exe) = exe_path {
                    if canonical == *exe {
                        return None;
                    }
                }
                // 只接受普通文件（排除目录和符号链接指向目录的情况）
                if canonical.is_file() {
                    Some(arg)
                } else {
                    None
                }
            } else {
                // 如果无法规范化路径，尝试原始路径检查
                if path.is_file() {
                    // 排除 .exe 文件（通常是可执行文件）
                    if arg.to_lowercase().ends_with(".exe") {
                        None
                    } else {
                        Some(arg)
                    }
                } else {
                    None
                }
            }
        })
        .collect();
    commands::set_pending_open_paths(open_paths);

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // 获取当前可执行文件的规范路径（用于过滤）
            let exe_path = std::env::current_exe()
                .ok()
                .and_then(|p| p.canonicalize().ok());

            let paths: Vec<String> = argv
                .into_iter()
                .skip(1) // 跳过第一个参数（通常是可执行文件路径）
                .filter(|arg| !arg.starts_with('-'))
                .filter_map(|arg| {
                    let path = Path::new(&arg);
                    // 只处理存在的路径
                    if !path.exists() {
                        return None;
                    }

                    // 规范化路径进行比较
                    if let Ok(canonical) = path.canonicalize() {
                        // 排除当前可执行文件
                        if let Some(ref exe) = exe_path {
                            if canonical == *exe {
                                return None;
                            }
                        }
                        // 只接受普通文件
                        if canonical.is_file() {
                            Some(arg)
                        } else {
                            None
                        }
                    } else {
                        // 如果无法规范化路径，尝试原始路径检查
                        if path.is_file() {
                            // 排除 .exe 文件
                            if arg.to_lowercase().ends_with(".exe") {
                                None
                            } else {
                                Some(arg)
                            }
                        } else {
                            None
                        }
                    }
                })
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
            history::commands_health::history_health_check,
            history::commands_crud::history_list_files,
            history::commands_crud::history_list_versions,
            history::commands_crud::history_record_stub,
            history::commands_crud::history_copy_restore,
            history::commands_crud::history_get_version_content,
            history::commands_crud::history_materialize,
            history::commands_crud::history_stats,
            history::commands_noise::history_scan_noise_files,
            history::commands_noise::history_purge_noise_files,
            history::commands_noise::history_debug_db_info,
            history::commands_gc::history_delete_file_history,
            history::commands_gc::history_delete_versions,
            history::commands_gc::history_gc,
            history::commands_convert::history_convert_legacy_checkpoints
        ]);
    
    // 启动时主动初始化应用数据目录结构
    if let Some(dirs) = appdirs::get_app_dirs() {
        let _ = dirs.init();
    }
    
    builder.run(tauri::generate_context!())
        .expect("error while running tauri application");
}
