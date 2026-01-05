use crate::core::formatter::pipeline::{process_text, FormatOptions, FormatResult};
use crate::core::json_tools::{self, JsonMode, JsonOptions};
use std::fs;
use tauri::{AppHandle, WebviewWindow};
use tauri::Emitter;

#[tauri::command]
pub fn open_devtools(window: WebviewWindow) {
    window.open_devtools();
}

#[tauri::command]
pub fn format_text(text: String, options: FormatOptions) -> FormatResult {
    process_text(text, &options)
}

#[tauri::command]
pub fn json_apply(input: String, mode: JsonMode, options: JsonOptions) -> Result<String, String> {
    json_tools::apply(&input, mode, options)
}

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

#[tauri::command]
pub fn save_text_file(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_text(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_text(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn file_exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
}

#[tauri::command]
pub fn reveal_in_explorer(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::path::Path;

        let p = Path::new(&path);
        let mut cmd = Command::new("explorer");

        if p.exists() {
            if p.is_file() {
                cmd.arg("/select,").arg(&path);
            } else {
                cmd.arg(&path);
            }
        } else if let Some(parent) = p.parent() {
            cmd.arg(parent);
        } else {
            cmd.arg(&path);
        }

        cmd.spawn().map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let p = std::path::Path::new(&path);
        if p.exists() {
            Command::new("open")
                .arg("-R")
                .arg(&path)
                .spawn()
                .map_err(|e| e.to_string())?;
        } else if let Some(parent) = p.parent() {
            Command::new("open")
                .arg(parent)
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            Command::new("open")
                .arg(&path)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        use std::process::Command;
        use std::path::Path;

        let p = Path::new(&path);
        let dir = if p.is_file() {
            p.parent().unwrap_or(p)
        } else {
            p
        };

        Command::new("xdg-open")
            .arg(dir)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[tauri::command]
pub fn run_decrypt(app: AppHandle, config_json: String, working_dir: String) -> Result<(), String> {
    // 模拟运行流程：解析配置并输出日志事件
    let _ = config_json; let _ = working_dir;
    std::thread::spawn(move || {
        for i in 1..=5 {
            let _ = app.emit("decrypt-log", format!("任务进行中：第 {} 步", i));
            std::thread::sleep(std::time::Duration::from_millis(500));
        }
        let _ = app.emit("decrypt-log", "完成：所有任务执行结束");
    });
    Ok(())
}
