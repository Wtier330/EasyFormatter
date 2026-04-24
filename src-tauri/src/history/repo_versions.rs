use rusqlite::{params, Result};
use std::collections::{HashMap, HashSet};
use serde_json::Value;
use super::models::VersionRecord;

fn other_err<E>(e: E) -> rusqlite::Error
where
    E: std::error::Error + Send + Sync + 'static,
{
    rusqlite::Error::ToSqlConversionFailure(Box::new(e))
}

fn compress_zstd(data: &[u8]) -> Result<Vec<u8>> {
    zstd::stream::encode_all(data, 3).map_err(other_err)
}

fn decode_to_string(codec: &str, blob: &[u8]) -> Result<String> {
    if codec == "zstd" {
        let bytes = zstd::stream::decode_all(blob).map_err(other_err)?;
        String::from_utf8(bytes).map_err(other_err)
    } else {
        String::from_utf8(blob.to_vec()).map_err(other_err)
    }
}

pub fn delete_versions_from_latest_internal(
    repo: &super::SqliteHistoryRepo,
    file_id: i64,
    version_ids: Vec<i64>
) -> Result<(i64, u64)> {
    if version_ids.is_empty() {
        return Ok((0, 0));
    }

    let requested_ids: HashSet<i64> = version_ids.into_iter().collect();
    let tx = repo.conn.unchecked_transaction()?;

    let versions: Vec<VersionRecord> = {
        let mut stmt = tx.prepare(
            "SELECT id, file_id, parent_id, ts, op_type, op_meta, base_hash, this_hash,
                    patch_blob, inverse_patch_blob, codec, payload_size, validate_ok, note, is_checkpoint
             FROM versions WHERE file_id = ?1 ORDER BY ts ASC"
        )?;

        let rows = stmt.query_map(params![file_id], |row| {
            Ok(VersionRecord {
                id: row.get(0)?,
                file_id: row.get(1)?,
                parent_id: row.get(2)?,
                ts: row.get(3)?,
                op_type: row.get(4)?,
                op_meta: row.get(5)?,
                base_hash: row.get(6)?,
                this_hash: row.get(7)?,
                patch_blob: row.get(8)?,
                inverse_patch_blob: row.get(9)?,
                codec: row.get(10)?,
                payload_size: row.get(11)?,
                validate_ok: row.get(12)?,
                note: row.get(13)?,
                is_checkpoint: row.get(14)?,
            })
        })?;

        let mut versions: Vec<VersionRecord> = Vec::new();
        for r in rows {
            versions.push(r?);
        }
        versions
    };

    if versions.is_empty() {
        return Ok((0, 0));
    }

    let existing_delete_ids: HashSet<i64> = versions
        .iter()
        .filter(|v| requested_ids.contains(&v.id))
        .map(|v| v.id)
        .collect();

    if existing_delete_ids.is_empty() {
        return Ok((0, 0));
    }

    let mut removed_count: i64 = 0;
    let mut removed_bytes: u64 = 0;
    for v in versions.iter() {
        if existing_delete_ids.contains(&v.id) {
            removed_count += 1;
            removed_bytes += v.payload_size.max(0) as u64;
        }
    }

    let mut content_by_id: HashMap<i64, String> = HashMap::new();
    for v in versions.iter() {
        if v.is_checkpoint {
            let blob = v.patch_blob.as_ref().ok_or(rusqlite::Error::InvalidQuery)?;
            let content = decode_to_string(&v.codec, blob)?;
            content_by_id.insert(v.id, content);
            continue;
        }

        let pid = v.parent_id.ok_or(rusqlite::Error::InvalidQuery)?;
        let parent_content = content_by_id
            .get(&pid)
            .cloned()
            .ok_or(rusqlite::Error::InvalidQuery)?;
        let patch_blob = v.patch_blob.as_ref().ok_or(rusqlite::Error::InvalidQuery)?;
        let patch_str = decode_to_string(&v.codec, patch_blob)?;

        let patch: json_patch::Patch = serde_json::from_str(&patch_str).map_err(other_err)?;
        let mut doc: Value = serde_json::from_str(&parent_content).map_err(other_err)?;
        json_patch::patch(&mut doc, &patch).map_err(other_err)?;
        let content = serde_json::to_string(&doc).map_err(other_err)?;
        content_by_id.insert(v.id, content);
    }

    let kept: Vec<&VersionRecord> = versions
        .iter()
        .filter(|v| !existing_delete_ids.contains(&v.id))
        .collect();

    if !kept.is_empty() {
        for (i, v) in kept.iter().enumerate() {
            let curr_content = content_by_id
                .get(&v.id)
                .cloned()
                .ok_or(rusqlite::Error::InvalidQuery)?;

            let new_parent_id = if i == 0 { None } else { Some(kept[i - 1].id) };

            let (is_checkpoint, base_hash, patch_blob, inverse_patch_blob, codec) = if i == 0 {
                (
                    true,
                    None::<String>,
                    Some(compress_zstd(curr_content.as_bytes())?),
                    None::<Vec<u8>>,
                    "zstd".to_string(),
                )
            } else {
                let parent = kept[i - 1];
                let parent_content = content_by_id
                    .get(&parent.id)
                    .cloned()
                    .ok_or(rusqlite::Error::InvalidQuery)?;

                let json_pair = (
                    serde_json::from_str::<Value>(&parent_content),
                    serde_json::from_str::<Value>(&curr_content),
                );

                if let (Ok(parent_json), Ok(curr_json)) = json_pair {
                    let patch = json_patch::diff(&parent_json, &curr_json);
                    let patch_bytes = serde_json::to_vec(&patch).map_err(other_err)?;
                    let size_bytes = curr_content.as_bytes().len();

                    if size_bytes > 0 && patch_bytes.len() < (size_bytes / 2) {
                        let inverse_patch = json_patch::diff(&curr_json, &parent_json);
                        let inverse_patch_bytes = serde_json::to_vec(&inverse_patch).map_err(other_err)?;
                        (
                            false,
                            Some(parent.this_hash.clone()),
                            Some(compress_zstd(&patch_bytes)?),
                            Some(compress_zstd(&inverse_patch_bytes)?),
                            "zstd".to_string(),
                        )
                    } else {
                        (
                            true,
                            None::<String>,
                            Some(compress_zstd(curr_content.as_bytes())?),
                            None::<Vec<u8>>,
                            "zstd".to_string(),
                        )
                    }
                } else {
                    (
                        true,
                        None::<String>,
                        Some(compress_zstd(curr_content.as_bytes())?),
                        None::<Vec<u8>>,
                        "zstd".to_string(),
                    )
                }
            };

            tx.execute(
                "UPDATE versions
                 SET parent_id = ?1,
                     is_checkpoint = ?2,
                     base_hash = ?3,
                     patch_blob = ?4,
                     inverse_patch_blob = ?5,
                     codec = ?6,
                     payload_size = ?7
                 WHERE id = ?8",
                params![
                    new_parent_id,
                    is_checkpoint,
                    base_hash,
                    patch_blob,
                    inverse_patch_blob,
                    codec,
                    curr_content.as_bytes().len() as i64,
                    v.id
                ],
            )?;
        }
    }

    for id in existing_delete_ids.iter() {
        tx.execute("DELETE FROM versions WHERE id = ?1", params![id])?;
    }

    let remaining: i64 = tx
        .query_row(
            "SELECT COUNT(*) FROM versions WHERE file_id = ?1",
            params![file_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if remaining == 0 {
        let _ = tx.execute("DELETE FROM files WHERE id = ?1", params![file_id]);
    } else {
        let latest_ts: Option<i64> = tx
            .query_row(
                "SELECT MAX(ts) FROM versions WHERE file_id = ?1",
                params![file_id],
                |row| row.get(0),
            )
            .ok()
            .flatten();

        if let Some(ts) = latest_ts {
            let _ = tx.execute(
                "UPDATE files SET updated_at = ?1 WHERE id = ?2",
                params![ts, file_id],
            );
        }
    }

    tx.commit()?;
    Ok((removed_count, removed_bytes))
}
