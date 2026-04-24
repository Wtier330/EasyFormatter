use tauri::command;
use super::repo_types::SqliteHistoryRepo;

#[derive(serde::Serialize)]
pub struct HealthCheckResult {
    enabled: bool,
    db_path: Option<String>,
    status: String,
}

#[command]
pub fn history_health_check() -> HealthCheckResult {
    let enabled = crate::appdirs::is_deployment_mode();
    let dirs = crate::appdirs::get_app_dirs();

    if !enabled {
        return HealthCheckResult {
            enabled: false,
            db_path: None,
            status: "Disabled (Not in deployment mode)".to_string(),
        };
    }

    match SqliteHistoryRepo::new() {
        Ok(_) => HealthCheckResult {
            enabled: true,
            db_path: dirs.map(|d| d.db_path().to_string_lossy().to_string()),
            status: "OK".to_string(),
        },
        Err(e) => HealthCheckResult {
            enabled: true,
            db_path: None,
            status: format!("Error: {}", e),
        },
    }
}