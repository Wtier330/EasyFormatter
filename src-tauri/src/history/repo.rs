use rusqlite::{params, Connection, OptionalExtension, Result};
use std::time::{SystemTime, UNIX_EPOCH};
use super::models::{FileRecord, VersionRecord, VersionSummary};
use super::db::init_db;

pub trait HistoryRepo {
    fn get_or_create_file(&self, path: &str) -> Result<i64>;
    fn list_files(&self) -> Result<Vec<FileRecord>>;
    fn add_version(&self, version: &VersionRecord) -> Result<i64>;
    fn list_versions(&self, file_id: i64) -> Result<Vec<VersionSummary>>;
    fn get_version(&self, id: i64) -> Result<VersionRecord>;
    fn get_latest_version(&self, file_id: i64) -> Result<Option<VersionRecord>>;
    fn get_version_by_hash(&self, file_id: i64, hash: &str) -> Result<Option<VersionRecord>>;
    
    // Stats & GC
    fn get_stats(&self) -> Result<HistoryStats>;
    fn gc(&self, max_days: Option<i64>, max_records: Option<i64>) -> Result<(i64, u64)>; // count, bytes

    fn delete_versions_from_latest(&self, file_id: i64, version_ids: Vec<i64>) -> Result<(i64, u64)>; // count, bytes
}

#[derive(serde::Serialize)]
pub struct HistoryStats {
    pub db_size: u64,
    pub records_count: i64,
    pub file_count: i64,
    pub top_files: Vec<(String, i64)>, // path, estimated_size
}

pub struct SqliteHistoryRepo {
    conn: Connection,
}

impl SqliteHistoryRepo {
    pub fn new() -> Result<Self> {
        let conn = init_db()?;
        Ok(Self { conn })
    }
}

// Helper for debug logging
fn debug_log(msg: &str) {
    #[cfg(debug_assertions)]
    println!("[HistoryRepo] {}", msg);
}

impl HistoryRepo for SqliteHistoryRepo {
    fn get_or_create_file(&self, path: &str) -> Result<i64> {
        debug_log(&format!("get_or_create_file: {}", path));
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;
        
        // let tx = self.conn.unchecked_transaction(); // Use unchecked for simple logic
        
        // Check exist
        let id: Option<i64> = self.conn.query_row(
            "SELECT id FROM files WHERE logical_path = ?1",
            params![path],
            |row| row.get(0),
        ).optional()?;

        if let Some(fid) = id {
            // Update time
            self.conn.execute(
                "UPDATE files SET updated_at = ?1 WHERE id = ?2",
                params![now, fid],
            )?;
            return Ok(fid);
        }

        // Create
        self.conn.execute(
            "INSERT INTO files (logical_path, created_at, updated_at) VALUES (?1, ?2, ?3)",
            params![path, now, now],
        )?;
        
        let id = self.conn.last_insert_rowid();
        Ok(id)
    }

    fn list_files(&self) -> Result<Vec<FileRecord>> {
        let mut stmt = self.conn.prepare("SELECT id, logical_path, created_at, updated_at FROM files ORDER BY updated_at DESC")?;
        let rows = stmt.query_map([], |row| {
            Ok(FileRecord {
                id: row.get(0)?,
                logical_path: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })?;

        let mut files = Vec::new();
        for r in rows {
            files.push(r?);
        }
        Ok(files)
    }

    fn add_version(&self, v: &VersionRecord) -> Result<i64> {
        debug_log(&format!("add_version: file_id={}, op={}, size={}", v.file_id, v.op_type, v.payload_size));
        self.conn.execute(
            "INSERT INTO versions (
                file_id, parent_id, ts, op_type, op_meta, base_hash, this_hash, 
                patch_blob, inverse_patch_blob, codec, payload_size, validate_ok, note, is_checkpoint
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
            params![
                v.file_id, v.parent_id, v.ts, v.op_type, v.op_meta, v.base_hash, v.this_hash,
                v.patch_blob, v.inverse_patch_blob, v.codec, v.payload_size, v.validate_ok, v.note, v.is_checkpoint
            ],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    fn list_versions(&self, file_id: i64) -> Result<Vec<VersionSummary>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, ts, op_type, note, payload_size, is_checkpoint FROM versions WHERE file_id = ?1 ORDER BY ts DESC"
        )?;
        let rows = stmt.query_map(params![file_id], |row| {
            Ok(VersionSummary {
                id: row.get(0)?,
                ts: row.get(1)?,
                op_type: row.get(2)?,
                note: row.get(3)?,
                payload_size: row.get(4)?,
                is_checkpoint: row.get(5)?,
            })
        })?;

        let mut versions = Vec::new();
        for r in rows {
            versions.push(r?);
        }
        Ok(versions)
    }

    fn get_version(&self, id: i64) -> Result<VersionRecord> {
        self.conn.query_row(
            "SELECT id, file_id, parent_id, ts, op_type, op_meta, base_hash, this_hash, 
                    patch_blob, inverse_patch_blob, codec, payload_size, validate_ok, note, is_checkpoint
             FROM versions WHERE id = ?1",
            params![id],
            |row| {
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
            }
        )
    }

    fn get_latest_version(&self, file_id: i64) -> Result<Option<VersionRecord>> {
        self.conn.query_row(
            "SELECT id, file_id, parent_id, ts, op_type, op_meta, base_hash, this_hash, 
                    patch_blob, inverse_patch_blob, codec, payload_size, validate_ok, note, is_checkpoint
             FROM versions WHERE file_id = ?1 ORDER BY ts DESC LIMIT 1",
            params![file_id],
            |row| {
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
            }
        ).optional()
    }

    fn get_version_by_hash(&self, file_id: i64, hash: &str) -> Result<Option<VersionRecord>> {
        self.conn.query_row(
            "SELECT id, file_id, parent_id, ts, op_type, op_meta, base_hash, this_hash, 
                    patch_blob, inverse_patch_blob, codec, payload_size, validate_ok, note, is_checkpoint
             FROM versions WHERE file_id = ?1 AND this_hash = ?2 LIMIT 1",
            params![file_id, hash],
            |row| {
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
            }
        ).optional()
    }

    fn get_stats(&self) -> Result<HistoryStats> {
        let db_size: i64 = self.conn.query_row(
            "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()", 
            [], 
            |row| row.get(0)
        ).unwrap_or(0);

        let records_count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM versions", 
            [], 
            |row| row.get(0)
        ).unwrap_or(0);

        let file_count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM files", 
            [], 
            |row| row.get(0)
        ).unwrap_or(0);

        // Top files by estimated payload size sum
        let mut stmt = self.conn.prepare(
            "SELECT f.logical_path, SUM(v.payload_size) as size 
             FROM versions v 
             JOIN files f ON v.file_id = f.id 
             GROUP BY f.id 
             ORDER BY size DESC 
             LIMIT 5"
        )?;
        
        let top_files_iter = stmt.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?;

        let mut top_files = Vec::new();
        for f in top_files_iter {
            top_files.push(f?);
        }

        Ok(HistoryStats {
            db_size: db_size as u64,
            records_count,
            file_count,
            top_files,
        })
    }

    fn gc(&self, max_days: Option<i64>, max_records: Option<i64>) -> Result<(i64, u64)> {
        // This is a complex operation.
        // We iterate file by file to ensure chain safety.
        
        let mut total_deleted = 0;
        let mut total_bytes = 0;
        
        let files = self.list_files()?;
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;
        
        for file in files {
            // Get all versions ID, TS, is_checkpoint
            let mut stmt = self.conn.prepare(
                "SELECT id, ts, is_checkpoint, payload_size FROM versions WHERE file_id = ?1 ORDER BY ts DESC"
            )?;
            
            struct VInfo { id: i64, ts: i64, is_ckpt: bool, size: i64 }
            
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
            
            // Determine Retention Cutoff
            // We want to KEEP versions that meet criteria.
            // AND we must keep the chain for the oldest kept version.
            
            // 1. By Count
            let mut keep_count = versions.len();
            if let Some(limit) = max_records {
                keep_count = std::cmp::min(keep_count, limit as usize);
            }
            
            // 2. By Days (refine keep_count)
            if let Some(days) = max_days {
                let cutoff_ts = now - (days * 86400);
                // Count how many are >= cutoff_ts
                let count_by_time = versions.iter().filter(|v| v.ts >= cutoff_ts).count();
                // We take the MIN of count-limit and time-limit? 
                // Or "Keep at least N days"? usually "Keep recent N days".
                // If count limit is 200, but only 10 are recent, we keep 10?
                // Usually Retention Policy is: Delete if older than X days OR count > Y.
                // So we keep MIN(count_limit, time_filtered_count).
                // Wait, usually it's "Max 30 days" AND "Max 200 items".
                // So if we have 300 items in 1 day, we keep 200.
                // If we have 10 items in 100 days, we keep 0 (if 30 days limit).
                keep_count = std::cmp::min(keep_count, count_by_time);
            }
            
            if keep_count >= versions.len() {
                continue; // Keep all
            }
            
            // The oldest version we WANT to keep is at index `keep_count - 1`.
            // But this version might depend on previous ones.
            // We need to find the Checkpoint that supports this version.
            // Since we scan DESC (newest first), versions[keep_count-1] is the oldest kept.
            
            let oldest_kept_idx = keep_count - 1;
            let _oldest_kept = &versions[oldest_kept_idx];
            
            // We need to find the nearest checkpoint >= oldest_kept (if we move boundary forward)
            // OR nearest checkpoint <= oldest_kept (if we keep extra history).
            // To be safe and simple: We keep extra.
            // Find the first checkpoint in the range [oldest_kept_idx, end].
            
            let mut anchor_idx = None;
            for i in oldest_kept_idx..versions.len() {
                if versions[i].is_ckpt {
                    anchor_idx = Some(i);
                    break;
                }
            }
            
            // If no checkpoint found in older history, we might be in trouble (broken chain or full patch list).
            // If so, we can't delete safely unless we delete EVERYTHING older than oldest_kept and accept broken chain?
            // No, we must keep everything then.
            
            if let Some(idx) = anchor_idx {
                // We keep everything from 0 to idx.
                // We delete from idx+1 to end.
                
                if idx + 1 < versions.len() {
                    let to_delete = &versions[idx+1..];
                    for v in to_delete {
                         self.conn.execute("DELETE FROM versions WHERE id = ?1", params![v.id])?;
                         total_deleted += 1;
                         total_bytes += v.size as u64;
                    }
                }
            }
        }
        
        // Vacuum to reclaim space? 
        // VACUUM is slow and locks DB. Maybe optional or separate command.
        // For "One click clean", maybe yes.
        // self.conn.execute("VACUUM", [])?; 
        // User asked for "DB Size", VACUUM changes it.
        // Let's do it if deleted > 0.
        if total_deleted > 0 {
             // self.conn.execute("VACUUM", [])?; // Risk of timeout.
        }
        
        Ok((total_deleted, total_bytes))
    }

    fn delete_versions_from_latest(&self, file_id: i64, version_ids: Vec<i64>) -> Result<(i64, u64)> {
        if version_ids.is_empty() {
            return Ok((0, 0));
        }

        let id_set: std::collections::HashSet<i64> = version_ids.into_iter().collect();

        let mut stmt = self.conn.prepare(
            "SELECT id, payload_size FROM versions WHERE file_id = ?1 ORDER BY ts DESC"
        )?;

        struct VInfo {
            id: i64,
            size: i64,
        }

        let rows = stmt.query_map(params![file_id], |row| {
            Ok(VInfo {
                id: row.get(0)?,
                size: row.get(1)?,
            })
        })?;

        let mut versions: Vec<VInfo> = Vec::new();
        for r in rows {
            versions.push(r?);
        }

        if versions.is_empty() {
            return Ok((0, 0));
        }

        let mut boundary_idx: Option<usize> = None;
        for (idx, v) in versions.iter().enumerate() {
            if id_set.contains(&v.id) {
                boundary_idx = Some(boundary_idx.map_or(idx, |b| std::cmp::max(b, idx)));
            }
        }

        let Some(boundary) = boundary_idx else {
            return Ok((0, 0));
        };

        let mut total_deleted: i64 = 0;
        let mut total_bytes: u64 = 0;

        for v in versions.iter().take(boundary + 1) {
            self.conn.execute("DELETE FROM versions WHERE id = ?1", params![v.id])?;
            total_deleted += 1;
            total_bytes += v.size as u64;
        }

        let remaining: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM versions WHERE file_id = ?1",
            params![file_id],
            |row| row.get(0),
        ).unwrap_or(0);

        if remaining == 0 {
            let _ = self.conn.execute("DELETE FROM files WHERE id = ?1", params![file_id]);
        } else {
            let latest_ts: Option<i64> = self.conn.query_row(
                "SELECT MAX(ts) FROM versions WHERE file_id = ?1",
                params![file_id],
                |row| row.get(0),
            ).optional()?;

            if let Some(ts) = latest_ts {
                let _ = self.conn.execute(
                    "UPDATE files SET updated_at = ?1 WHERE id = ?2",
                    params![ts, file_id],
                );
            }
        }

        Ok((total_deleted, total_bytes))
    }
}
