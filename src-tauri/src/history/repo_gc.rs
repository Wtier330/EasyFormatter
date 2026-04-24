use rusqlite::params;
use super::repo_types::HistoryRepo;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct VInfo {
    pub id: i64,
    pub ts: i64,
    pub is_ckpt: bool,
    pub size: i64,
}

pub fn gc_internal(repo: &super::SqliteHistoryRepo, max_days: Option<i64>, max_records: Option<i64>) -> Result<(i64, u64), rusqlite::Error> {
    let mut total_deleted = 0;
    let mut total_bytes = 0;

    let files = repo.list_files()?;
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;

    for file in files {
        let mut stmt = repo.conn.prepare(
            "SELECT id, ts, is_checkpoint, payload_size FROM versions WHERE file_id = ?1 ORDER BY ts DESC"
        )?;

        let rows = stmt.query_map(params![file.id], |row| {
            Ok(VInfo {
                id: row.get(0)?,
                ts: row.get(1)?,
                is_ckpt: row.get(2)?,
                size: row.get(3)?,
            })
        })?;

        let mut versions = Vec::new();
        for r in rows { versions.push(r?); }

        if versions.is_empty() { continue; }

        let mut keep_count = versions.len();
        if let Some(limit) = max_records {
            keep_count = std::cmp::min(keep_count, limit as usize);
        }

        if let Some(days) = max_days {
            let cutoff_ts = now - (days * 86400);
            let count_by_time = versions.iter().filter(|v| v.ts >= cutoff_ts).count();
            keep_count = std::cmp::min(keep_count, count_by_time);
        }

        if keep_count >= versions.len() {
            continue;
        }

        let oldest_kept_idx = keep_count - 1;
        let _oldest_kept = &versions[oldest_kept_idx];

        let mut anchor_idx = None;
        for i in oldest_kept_idx..versions.len() {
            if versions[i].is_ckpt {
                anchor_idx = Some(i);
                break;
            }
        }

        if let Some(idx) = anchor_idx {
            if idx + 1 < versions.len() {
                let to_delete = &versions[idx+1..];
                for v in to_delete {
                    repo.conn.execute("DELETE FROM versions WHERE id = ?1", params![v.id])?;
                    total_deleted += 1;
                    total_bytes += v.size as u64;
                }
            }
        }
    }

    Ok((total_deleted, total_bytes))
}

pub fn delete_file_history_internal(repo: &super::SqliteHistoryRepo, file_id: i64) -> Result<(i64, u64), rusqlite::Error> {
    let tx = repo.conn.unchecked_transaction()?;

    let (removed_count, removed_bytes): (i64, u64) = tx
        .query_row(
            "SELECT COUNT(*), COALESCE(SUM(payload_size), 0) FROM versions WHERE file_id = ?1",
            params![file_id],
            |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)? as u64)),
        )
        .unwrap_or((0, 0));

    let _ = tx.execute("DELETE FROM versions WHERE file_id = ?1", params![file_id]);
    let _ = tx.execute("DELETE FROM files WHERE id = ?1", params![file_id]);

    super::debug_log(&format!(
        "delete_file_history file_id={}, removed_count={}, removed_bytes={}",
        file_id, removed_count, removed_bytes
    ));

    tx.commit()?;
    Ok((removed_count, removed_bytes))
}
