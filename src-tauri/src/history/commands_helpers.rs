use serde_json::Value;
use sha2::Digest;
use super::repo_types::{SqliteHistoryRepo, HistoryRepo};

pub struct NormalizedPayload {
    pub stored: String,
    pub hash: String,
    pub is_json: bool,
}

pub const PAYLOAD_FORMAT_PRETTY_JSON_V1: &str = "json_pretty_v1";
pub const PAYLOAD_FORMAT_TEXT_PLAIN_V1: &str = "text_plain_v1";
const DEFAULT_JSON_INDENT: u32 = 2;

pub fn compress(data: &[u8]) -> Result<Vec<u8>, String> {
    zstd::stream::encode_all(data, 3).map_err(|e| e.to_string())
}

pub fn decompress(data: &[u8]) -> Result<String, String> {
    let bytes = zstd::stream::decode_all(data).map_err(|e| e.to_string())?;
    String::from_utf8(bytes).map_err(|e| e.to_string())
}

pub fn build_op_meta(payload_format: &str, is_json: bool, converted_from: Option<&str>) -> String {
    let mut meta = serde_json::json!({
        "payload_format": payload_format,
        "hash_algo": "sha256",
        "hash_basis": if is_json { "json_minified" } else { "raw_text" }
    });

    if is_json {
        meta["indent"] = serde_json::json!(DEFAULT_JSON_INDENT);
    }
    if let Some(from) = converted_from {
        meta["converted_from"] = serde_json::json!(from);
    }
    meta.to_string()
}

pub fn normalize_payload(text: &str) -> NormalizedPayload {
    match serde_json::from_str::<Value>(text) {
        Ok(val) => {
            let canonical_minified = serde_json::to_string(&val).unwrap_or_else(|_| text.to_string());
            let hash = hex::encode(sha2::Sha256::digest(canonical_minified.as_bytes()));
            let pretty = serde_json::to_string_pretty(&val).unwrap_or_else(|_| text.to_string());
            NormalizedPayload {
                stored: pretty,
                hash,
                is_json: true,
            }
        }
        Err(_) => {
            let hash = hex::encode(sha2::Sha256::digest(text.as_bytes()));
            NormalizedPayload {
                stored: text.to_string(),
                hash,
                is_json: false,
            }
        }
    }
}

pub fn materialize_version_logic(repo: &SqliteHistoryRepo, version_id: i64) -> Result<(String, bool), String> {
    let mut current_ver = repo.get_version(version_id).map_err(|e| e.to_string())?;
    let mut chain = vec![current_ver.clone()];

    // 1. Trace back to checkpoint
    while !current_ver.is_checkpoint {
        if let Some(pid) = current_ver.parent_id {
            current_ver = repo.get_version(pid).map_err(|e| e.to_string())?;
            chain.push(current_ver.clone());
        } else {
            return Err(format!("Broken chain: Version {} is not checkpoint and has no parent", current_ver.id));
        }
    }

    // 2. Base content (Checkpoint)
    let base_blob = current_ver.patch_blob.ok_or("Checkpoint missing payload")?;
    let mut content_str = if current_ver.codec == "zstd" {
        decompress(&base_blob)?
    } else {
        String::from_utf8(base_blob).map_err(|e| e.to_string())?
    };

    if let Ok(doc) = serde_json::from_str::<Value>(&content_str) {
        content_str = serde_json::to_string_pretty(&doc).map_err(|e| e.to_string())?;
    }

    // 3. Apply patches (Checkpoint -> Target)
    for ver in chain.iter().rev().skip(1) {
        if let Some(patch_blob) = &ver.patch_blob {
            let patch_str = if ver.codec == "zstd" {
                decompress(patch_blob)?
            } else {
                String::from_utf8(patch_blob.clone()).map_err(|e| e.to_string())?
            };

            let patch: json_patch::Patch = serde_json::from_str(&patch_str).map_err(|e| format!("Invalid patch JSON: {}", e))?;
            let mut doc: Value = serde_json::from_str(&content_str).map_err(|e| format!("Base invalid JSON: {}", e))?;

            json_patch::patch(&mut doc, &patch).map_err(|e| format!("Patch failed: {}", e))?;
            content_str = serde_json::to_string_pretty(&doc).map_err(|e| e.to_string())?;
        }
    }

    Ok((content_str, true))
}

fn is_noise_artifact_path(file_path: &str) -> bool {
    let name = file_path
        .split(|c| c == '/' || c == '\\')
        .last()
        .unwrap_or(file_path);
    let name_lower = name.to_ascii_lowercase();
    (name_lower.starts_with("ef_") || name_lower.starts_with("test_")) && name_lower.ends_with(".json")
}

pub fn scan_noise_files_in_roots(roots: &[std::path::PathBuf], limit: usize) -> (u64, u64, Vec<String>) {
    use std::collections::VecDeque;
    use std::fs;

    let mut total_files: u64 = 0;
    let mut total_bytes: u64 = 0;
    let mut sample_paths: Vec<String> = Vec::new();

    for root in roots {
        if sample_paths.len() >= limit {
            break;
        }
        if !root.exists() {
            continue;
        }

        let mut queue: VecDeque<std::path::PathBuf> = VecDeque::new();
        queue.push_back(root.clone());

        while let Some(dir) = queue.pop_front() {
            if sample_paths.len() >= limit {
                break;
            }
            let rd = match fs::read_dir(&dir) {
                Ok(v) => v,
                Err(_) => continue,
            };

            for entry in rd.flatten() {
                if sample_paths.len() >= limit {
                    break;
                }
                let path = entry.path();
                let ft = match entry.file_type() {
                    Ok(v) => v,
                    Err(_) => continue,
                };
                if ft.is_dir() {
                    queue.push_back(path);
                    continue;
                }
                if !ft.is_file() {
                    continue;
                }
                let p_str = path.to_string_lossy().to_string();
                if !is_noise_artifact_path(&p_str) {
                    continue;
                }
                let size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
                total_files += 1;
                total_bytes += size;
                sample_paths.push(p_str);
            }
        }
    }

    (total_files, total_bytes, sample_paths)
}

pub fn purge_noise_files_in_roots(roots: &[std::path::PathBuf]) -> (u64, u64) {
    use std::collections::VecDeque;
    use std::fs;

    let mut removed_files: u64 = 0;
    let mut removed_bytes: u64 = 0;

    for root in roots {
        if !root.exists() {
            continue;
        }

        let mut queue: VecDeque<std::path::PathBuf> = VecDeque::new();
        queue.push_back(root.clone());

        while let Some(dir) = queue.pop_front() {
            let rd = match fs::read_dir(&dir) {
                Ok(v) => v,
                Err(_) => continue,
            };

            for entry in rd.flatten() {
                let path = entry.path();
                let ft = match entry.file_type() {
                    Ok(v) => v,
                    Err(_) => continue,
                };
                if ft.is_dir() {
                    queue.push_back(path);
                    continue;
                }
                if !ft.is_file() {
                    continue;
                }
                let p_str = path.to_string_lossy().to_string();
                if !is_noise_artifact_path(&p_str) {
                    continue;
                }
                let size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
                if fs::remove_file(&path).is_ok() {
                    removed_files += 1;
                    removed_bytes += size;
                }
            }
        }
    }

    (removed_files, removed_bytes)
}
