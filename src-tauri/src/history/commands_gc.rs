use tauri::command;
use super::repo_types::{HistoryRepo, SqliteHistoryRepo};

#[derive(serde::Serialize)]
pub struct GcResult {
    removed_count: i64,
    removed_bytes: u64,
}

#[command]
pub fn history_gc(max_days: Option<i64>, max_records: Option<i64>) -> Result<GcResult, String> {
    if !crate::appdirs::is_deployment_mode() {
        return Err("History disabled".into());
    }
    let repo = SqliteHistoryRepo::new().map_err(|e| e.to_string())?;
    let (removed_count, removed_bytes) = repo.gc(max_days, max_records).map_err(|e| e.to_string())?;
    Ok(GcResult { removed_count, removed_bytes })
}

#[derive(serde::Serialize)]
pub struct DeleteVersionsResult {
    removed_count: i64,
    removed_bytes: u64,
}

#[command]
pub fn history_delete_versions(file_id: i64, version_ids: Vec<i64>) -> Result<DeleteVersionsResult, String> {
    if !crate::appdirs::is_deployment_mode() {
        return Err("History disabled".into());
    }
    let repo = SqliteHistoryRepo::new().map_err(|e| e.to_string())?;
    let (removed_count, removed_bytes) = repo.delete_versions_from_latest(file_id, version_ids)
        .map_err(|e| e.to_string())?;
    Ok(DeleteVersionsResult { removed_count, removed_bytes })
}

#[command]
pub fn history_delete_file_history(file_id: i64) -> Result<DeleteVersionsResult, String> {
    if !crate::appdirs::is_deployment_mode() {
        return Err("History disabled".into());
    }
    let repo = SqliteHistoryRepo::new().map_err(|e| e.to_string())?;
    let (removed_count, removed_bytes) = repo.delete_file_history(file_id)
        .map_err(|e| e.to_string())?;
    Ok(DeleteVersionsResult { removed_count, removed_bytes })
}
