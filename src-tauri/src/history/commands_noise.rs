use tauri::command;
use super::repo_types::SqliteHistoryRepo;

#[derive(serde::Serialize)]
pub struct NoiseScanResult {
    pub searched_roots: Vec<String>,
    pub db_file_count: i64,
    pub db_version_count: i64,
    pub db_payload_bytes: u64,
    pub db_sample_paths: Vec<String>,
    pub fs_file_count: u64,
    pub fs_bytes: u64,
    pub fs_sample_paths: Vec<String>,
}

#[command]
pub fn history_scan_noise_files(limit: Option<u32>) -> Result<NoiseScanResult, String> {
    if !crate::appdirs::is_deployment_mode() {
        return Err("History disabled".into());
    }

    let limit = limit.unwrap_or(200).clamp(1, 2000) as usize;
    let repo = SqliteHistoryRepo::new().map_err(|e| e.to_string())?;
    let db = repo.scan_noise_db(limit).map_err(|e| e.to_string())?;

    let mut roots: Vec<std::path::PathBuf> = Vec::new();
    if let Some(dirs) = crate::appdirs::get_app_dirs() {
        roots.push(dirs.root);
    }
    roots.push(std::env::temp_dir());

    let (fs_file_count, fs_bytes, fs_sample_paths) = super::commands_helpers::scan_noise_files_in_roots(&roots, limit);
    let searched_roots = roots
        .into_iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect::<Vec<_>>();

    Ok(NoiseScanResult {
        searched_roots,
        db_file_count: db.file_count,
        db_version_count: db.version_count,
        db_payload_bytes: db.payload_bytes,
        db_sample_paths: db.sample_paths,
        fs_file_count,
        fs_bytes,
        fs_sample_paths,
    })
}

#[derive(serde::Serialize)]
pub struct NoisePurgeResult {
    pub removed_count: i64,
    pub removed_bytes: u64,
    pub fs_removed_files: u64,
    pub fs_removed_bytes: u64,
}

#[command]
pub fn history_purge_noise_files() -> Result<NoisePurgeResult, String> {
    if !crate::appdirs::is_deployment_mode() {
        return Err("History disabled".into());
    }

    let repo = SqliteHistoryRepo::new().map_err(|e| e.to_string())?;
    let (removed_count, removed_bytes) = repo.purge_noise_db_internal()
        .map_err(|e| e.to_string())?;

    let mut roots: Vec<std::path::PathBuf> = Vec::new();
    if let Some(dirs) = crate::appdirs::get_app_dirs() {
        roots.push(dirs.root);
    }
    roots.push(std::env::temp_dir());

    let (fs_removed_files, fs_removed_bytes) = super::commands_helpers::purge_noise_files_in_roots(&roots);

    Ok(NoisePurgeResult {
        removed_count,
        removed_bytes,
        fs_removed_files,
        fs_removed_bytes,
    })
}

#[derive(serde::Serialize)]
pub struct DebugDbInfo {
    path: String,
    exists: bool,
    readonly: bool,
    wal_enabled: bool,
    file_size: u64,
}

#[command]
pub fn history_debug_db_info() -> Result<DebugDbInfo, String> {
    let dirs = crate::appdirs::get_app_dirs().ok_or_else(|| "App dirs not found".to_string())?;
    let db_path = dirs.db_path();

    let exists = db_path.exists();
    let mut readonly = false;
    let mut file_size = 0;

    if exists {
        if let Ok(meta) = std::fs::metadata(&db_path) {
            readonly = meta.permissions().readonly();
            file_size = meta.len();
        }
    }

    let wal_enabled = db_path.with_extension("db-wal").exists();

    Ok(DebugDbInfo {
        path: db_path.to_string_lossy().to_string(),
        exists,
        readonly,
        wal_enabled,
        file_size,
    })
}
