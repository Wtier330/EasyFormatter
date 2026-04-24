use tauri::command;
use super::repo_types::SqliteHistoryRepo;
use super::commands_helpers::{
    decompress, normalize_payload, build_op_meta,
    PAYLOAD_FORMAT_PRETTY_JSON_V1, PAYLOAD_FORMAT_TEXT_PLAIN_V1,
};

#[derive(serde::Serialize)]
pub struct ConvertLegacyResult {
    scanned: i64,
    converted: i64,
    skipped: i64,
}

#[command]
pub fn history_convert_legacy_checkpoints(
    file_id: Option<i64>,
    limit: Option<u32>
) -> Result<ConvertLegacyResult, String> {
    if !crate::appdirs::is_deployment_mode() {
        return Err("History disabled".into());
    }

    let limit = limit.unwrap_or(500).clamp(1, 5000) as usize;
    let repo = SqliteHistoryRepo::new().map_err(|e| e.to_string())?;
    let candidates = repo
        .list_legacy_checkpoint_payloads(file_id, limit)
        .map_err(|e| e.to_string())?;

    let mut scanned: i64 = 0;
    let mut converted: i64 = 0;
    let mut skipped: i64 = 0;

    for c in candidates {
        scanned += 1;
        if c.codec != "zstd" {
            skipped += 1;
            continue;
        }

        let text = match decompress(&c.patch_blob) {
            Ok(v) => v,
            Err(_) => {
                skipped += 1;
                continue;
            }
        };

        let normalized = normalize_payload(&text);
        if normalized.hash != c.this_hash {
            skipped += 1;
            continue;
        }

        let op_meta = Some(if normalized.is_json {
            build_op_meta(PAYLOAD_FORMAT_PRETTY_JSON_V1, true, Some("zstd_checkpoint_v0"))
        } else {
            build_op_meta(PAYLOAD_FORMAT_TEXT_PLAIN_V1, false, Some("zstd_checkpoint_v0"))
        });

        let payload_size = normalized.stored.as_bytes().len() as i64;
        repo.update_version_payload(
            c.id,
            normalized.stored.as_bytes().to_vec(),
            "none",
            payload_size,
            op_meta,
        )
        .map_err(|e| e.to_string())?;

        converted += 1;
    }

    Ok(ConvertLegacyResult {
        scanned,
        converted,
        skipped,
    })
}
