use tauri::command;
use super::repo_types::{HistoryRepo, SqliteHistoryRepo, HistoryStats};
use super::models::{FileRecord, VersionRecord, VersionSummary};
use super::commands_helpers::{
    compress, materialize_version_logic, normalize_payload, build_op_meta,
    PAYLOAD_FORMAT_PRETTY_JSON_V1, PAYLOAD_FORMAT_TEXT_PLAIN_V1,
};

fn is_noise_record_path(file_path: &str) -> bool {
    let name = file_path
        .split(|c| c == '/' || c == '\\')
        .last()
        .unwrap_or(file_path);
    let name_lower = name.to_ascii_lowercase();
    name_lower.starts_with("ef_") && name_lower.ends_with(".json")
}

#[command]
pub fn history_list_files() -> Result<Vec<FileRecord>, String> {
    if !crate::appdirs::is_deployment_mode() {
        return Ok(vec![]);
    }
    let repo = SqliteHistoryRepo::new().map_err(|e| e.to_string())?;
    repo.list_files().map_err(|e| e.to_string())
}

#[command]
pub fn history_list_versions(file_id: i64) -> Result<Vec<VersionSummary>, String> {
    if !crate::appdirs::is_deployment_mode() {
        return Ok(vec![]);
    }
    let repo = SqliteHistoryRepo::new().map_err(|e| e.to_string())?;
    repo.list_versions(file_id).map_err(|e| e.to_string())
}

#[command]
pub fn history_record_stub(
    file_path: String,
    content: String,
    note: Option<String>,
    op_type: Option<String>,
) -> Result<i64, String> {
    if !crate::appdirs::is_deployment_mode() {
        return Ok(0);
    }

    let trimmed = file_path.trim();
    if trimmed.eq_ignore_ascii_case("NUL")
        || trimmed == "/dev/null"
        || trimmed.eq_ignore_ascii_case(r"\\.\NUL")
        || is_noise_record_path(trimmed)
    {
        return Ok(0);
    }

    let repo = SqliteHistoryRepo::new().map_err(|e| e.to_string())?;
    let file_id = repo.get_or_create_file(&file_path).map_err(|e| e.to_string())?;

    let normalized = normalize_payload(&content);
    let size = normalized.stored.as_bytes().len() as i64;

    // Deduplication
    if let Ok(Some(existing)) = repo.get_version_by_hash(file_id, &normalized.hash) {
        return Ok(existing.id);
    }

    // Get parent
    let parent = repo.get_latest_version(file_id).unwrap_or(None);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    // Decide Patch vs Snapshot
    let mut is_checkpoint = true;
    let mut patch_blob = None;
    let mut inverse_patch_blob = None;
    let mut base_hash = None;
    let mut parent_id = None;

    if let Some(p) = parent {
        parent_id = Some(p.id);

        if normalized.is_json {
            if let Ok((parent_content, _)) = materialize_version_logic(&repo, p.id) {
                if let (Ok(parent_json), Ok(current_json)) = (
                    serde_json::from_str::<serde_json::Value>(&parent_content),
                    serde_json::from_str::<serde_json::Value>(&normalized.stored)
                ) {
                    let patch = json_patch::diff(&parent_json, &current_json);
                    let inverse_patch = json_patch::diff(&current_json, &parent_json);

                    let patch_bytes = serde_json::to_vec(&patch).unwrap_or_default();

                    // Threshold: If patch > 50% of content, just snapshot
                    if patch_bytes.len() < (size as usize / 2) {
                        is_checkpoint = false;
                        patch_blob = Some(compress(&patch_bytes)?);
                        inverse_patch_blob = Some(compress(&serde_json::to_vec(&inverse_patch).unwrap_or_default())?);
                        base_hash = Some(p.this_hash);
                    }
                }
            }
        }
    }

    if is_checkpoint {
        patch_blob = Some(normalized.stored.as_bytes().to_vec());
    }

    // Handle Op Type
    let mut final_op_type = op_type.unwrap_or_else(|| "save".to_string());
    if let Some(n) = &note {
        if n.contains("rollback_from") {
            final_op_type = "rollback".to_string();
        }
    }

    let op_meta = Some(if normalized.is_json {
        build_op_meta(PAYLOAD_FORMAT_PRETTY_JSON_V1, true, None)
    } else {
        build_op_meta(PAYLOAD_FORMAT_TEXT_PLAIN_V1, false, None)
    });

    let codec = if is_checkpoint { "none".to_string() } else { "zstd".to_string() };

    let ver = VersionRecord {
        id: 0,
        file_id,
        parent_id,
        ts: now,
        op_type: final_op_type,
        op_meta,
        base_hash,
        this_hash: normalized.hash,
        patch_blob,
        inverse_patch_blob,
        codec,
        payload_size: size,
        validate_ok: true,
        note,
        is_checkpoint,
    };

    repo.add_version(&ver).map_err(|e| e.to_string())
}

#[command]
pub fn history_copy_restore(version_id: i64, target_dir: Option<String>) -> Result<String, String> {
    if !crate::appdirs::is_deployment_mode() {
        return Err("History disabled".into());
    }

    let repo = SqliteHistoryRepo::new().map_err(|e| e.to_string())?;
    let (content, _) = materialize_version_logic(&repo, version_id)?;

    use std::fs;
    use chrono::{DateTime, Local};

    let now: DateTime<Local> = Local::now();
    let timestamp = now.format("%Y%m%d-%H%M%S").to_string();
    let filename = format!("restored(rollback)-{}.json", timestamp);

    let target_path = if let Some(dir) = target_dir {
        std::path::PathBuf::from(dir).join(&filename)
    } else {
        crate::appdirs::get_app_dirs()
            .ok_or_else(|| "App dirs not found".to_string())?
            .exports
            .join(&filename)
    };

    fs::write(&target_path, content).map_err(|e| e.to_string())?;
    Ok(target_path.to_string_lossy().to_string())
}

#[command]
pub fn history_get_version_content(version_id: i64) -> Result<String, String> {
    if !crate::appdirs::is_deployment_mode() {
        return Err("History disabled".into());
    }
    let repo = SqliteHistoryRepo::new().map_err(|e| e.to_string())?;
    let (content, _) = materialize_version_logic(&repo, version_id)?;
    Ok(content)
}

#[command]
pub fn history_materialize(version_id: i64) -> Result<MaterializedResult, String> {
    if !crate::appdirs::is_deployment_mode() {
        return Err("History disabled".into());
    }
    let repo = SqliteHistoryRepo::new().map_err(|e| e.to_string())?;
    let (content, _) = materialize_version_logic(&repo, version_id)?;

    let ver = repo.get_version(version_id).map_err(|e| e.to_string())?;
    Ok(MaterializedResult {
        content,
        hash: ver.this_hash,
    })
}

#[derive(serde::Serialize)]
pub struct MaterializedResult {
    content: String,
    hash: String,
}

#[command]
pub fn history_stats() -> Result<HistoryStats, String> {
    if !crate::appdirs::is_deployment_mode() {
        return Err("History disabled".into());
    }
    let repo = SqliteHistoryRepo::new().map_err(|e| e.to_string())?;
    repo.get_stats().map_err(|e| e.to_string())
}
