use rusqlite::{params, Connection, OptionalExtension, Result};
use std::time::{SystemTime, UNIX_EPOCH};
use super::models::{FileRecord, VersionRecord, VersionSummary};
use super::db::init_db;
use serde_json::Value;

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
    fn delete_file_history(&self, file_id: i64) -> Result<(i64, u64)>; // count, bytes
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

#[derive(Debug, Clone)]
pub struct LegacyCheckpointPayload {
    pub id: i64,
    pub patch_blob: Vec<u8>,
    pub codec: String,
    pub op_meta: Option<String>,
    pub this_hash: String,
}

pub struct NoiseDbScan {
    pub file_count: i64,
    pub version_count: i64,
    pub payload_bytes: u64,
    pub sample_paths: Vec<String>,
}

impl SqliteHistoryRepo {
    pub fn new() -> Result<Self> {
        let conn = init_db()?;
        Ok(Self { conn })
    }

    pub fn list_legacy_checkpoint_payloads(&self, file_id: Option<i64>, limit: usize) -> Result<Vec<LegacyCheckpointPayload>> {
        let limit = limit.clamp(1, 5000) as i64;
        let mut sql = String::from(
            "SELECT id, patch_blob, codec, op_meta, this_hash
             FROM versions
             WHERE is_checkpoint = 1
               AND codec = 'zstd'
               AND patch_blob IS NOT NULL
               AND (op_meta IS NULL OR op_meta NOT LIKE '%\"payload_format\"%')",
        );

        let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();
        if let Some(fid) = file_id {
            sql.push_str(" AND file_id = ?1");
            params_vec.push(rusqlite::types::Value::Integer(fid));
            sql.push_str(" ORDER BY ts DESC LIMIT ?2");
            params_vec.push(rusqlite::types::Value::Integer(limit));
        } else {
            sql.push_str(" ORDER BY ts DESC LIMIT ?1");
            params_vec.push(rusqlite::types::Value::Integer(limit));
        }

        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt.query_map(rusqlite::params_from_iter(params_vec.into_iter()), |row| {
            let blob_opt: Option<Vec<u8>> = row.get(1)?;
            Ok(LegacyCheckpointPayload {
                id: row.get(0)?,
                patch_blob: blob_opt.unwrap_or_default(),
                codec: row.get(2)?,
                op_meta: row.get(3)?,
                this_hash: row.get(4)?,
            })
        })?;

        let mut out = Vec::new();
        for r in rows {
            let v = r?;
            if v.patch_blob.is_empty() {
                continue;
            }
            out.push(v);
        }
        Ok(out)
    }

    pub fn update_version_payload(
        &self,
        version_id: i64,
        patch_blob: Vec<u8>,
        codec: &str,
        payload_size: i64,
        op_meta: Option<String>,
    ) -> Result<()> {
        self.conn.execute(
            "UPDATE versions
             SET patch_blob = ?1, codec = ?2, payload_size = ?3, op_meta = ?4
             WHERE id = ?5",
            params![patch_blob, codec, payload_size, op_meta, version_id],
        )?;
        Ok(())
    }

    fn is_noise_like_pattern() -> (&'static str, [&'static str; 6]) {
        (
            "(
                logical_path LIKE ?1 OR logical_path LIKE ?2 OR logical_path LIKE ?3
                OR logical_path LIKE ?4 OR logical_path LIKE ?5 OR logical_path LIKE ?6
            )",
            [
                "%/EF_%.json",
                "%\\EF_%.json",
                "EF_%.json",
                "%/test_%.json",
                "%\\test_%.json",
                "test_%.json",
            ],
        )
    }

    pub fn scan_noise_db(&self, limit: usize) -> Result<NoiseDbScan> {
        let (where_sql, patterns) = Self::is_noise_like_pattern();

        let file_count: i64 = self
            .conn
            .query_row(
                &format!("SELECT COUNT(*) FROM files WHERE {}", where_sql),
                params![patterns[0], patterns[1], patterns[2], patterns[3], patterns[4], patterns[5]],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let (version_count, payload_bytes): (i64, u64) = self
            .conn
            .query_row(
                &format!(
                    "SELECT COUNT(*), COALESCE(SUM(payload_size), 0)
                     FROM versions
                     WHERE file_id IN (SELECT id FROM files WHERE {})",
                    where_sql
                ),
                params![patterns[0], patterns[1], patterns[2], patterns[3], patterns[4], patterns[5]],
                |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)? as u64)),
            )
            .unwrap_or((0, 0));

        let mut stmt = self.conn.prepare(&format!(
            "SELECT logical_path FROM files WHERE {} ORDER BY updated_at DESC LIMIT ?7",
            where_sql
        ))?;
        let rows = stmt.query_map(
            params![
                patterns[0],
                patterns[1],
                patterns[2],
                patterns[3],
                patterns[4],
                patterns[5],
                limit as i64
            ],
            |row| row.get::<_, String>(0),
        )?;
        let mut sample_paths = Vec::new();
        for r in rows {
            sample_paths.push(r?);
        }

        Ok(NoiseDbScan {
            file_count,
            version_count,
            payload_bytes,
            sample_paths,
        })
    }

    pub fn purge_noise_db(&self) -> Result<(i64, u64)> {
        let (where_sql, patterns) = Self::is_noise_like_pattern();
        let tx = self.conn.unchecked_transaction()?;

        let (removed_count, removed_bytes): (i64, u64) = tx
            .query_row(
                &format!(
                    "SELECT COUNT(*), COALESCE(SUM(payload_size), 0)
                     FROM versions
                     WHERE file_id IN (SELECT id FROM files WHERE {})",
                    where_sql
                ),
                params![patterns[0], patterns[1], patterns[2], patterns[3], patterns[4], patterns[5]],
                |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)? as u64)),
            )
            .unwrap_or((0, 0));

        let _ = tx.execute(
            &format!(
                "DELETE FROM versions WHERE file_id IN (SELECT id FROM files WHERE {})",
                where_sql
            ),
            params![patterns[0], patterns[1], patterns[2], patterns[3], patterns[4], patterns[5]],
        );
        let _ = tx.execute(
            &format!("DELETE FROM files WHERE {}", where_sql),
            params![patterns[0], patterns[1], patterns[2], patterns[3], patterns[4], patterns[5]],
        );

        debug_log(&format!(
            "purge_noise_db removed_count={}, removed_bytes={}",
            removed_count, removed_bytes
        ));

        tx.commit()?;
        Ok((removed_count, removed_bytes))
    }
}

// Helper for debug logging
fn debug_log(_msg: &str) {
    #[cfg(debug_assertions)]
    println!("[HistoryRepo] {}", _msg);
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
        use std::collections::{HashMap, HashSet};

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

        if version_ids.is_empty() {
            return Ok((0, 0));
        }

        let requested_ids: HashSet<i64> = version_ids.into_iter().collect();
        let tx = self.conn.unchecked_transaction()?;

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
                let blob = v.patch_blob.as_ref().ok_or_else(|| {
                    rusqlite::Error::InvalidQuery
                })?;
                let content = decode_to_string(&v.codec, blob)?;
                content_by_id.insert(v.id, content);
                continue;
            }

            let pid = v.parent_id.ok_or_else(|| rusqlite::Error::InvalidQuery)?;
            let parent_content = content_by_id
                .get(&pid)
                .cloned()
                .ok_or_else(|| rusqlite::Error::InvalidQuery)?;
            let patch_blob = v.patch_blob.as_ref().ok_or_else(|| rusqlite::Error::InvalidQuery)?;
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
                    .ok_or_else(|| rusqlite::Error::InvalidQuery)?;

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
                        .ok_or_else(|| rusqlite::Error::InvalidQuery)?;

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

                let new_payload_size = curr_content.as_bytes().len() as i64;

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
                        new_payload_size,
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
                .optional()?;

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

    fn delete_file_history(&self, file_id: i64) -> Result<(i64, u64)> {
        let tx = self.conn.unchecked_transaction()?;

        let (removed_count, removed_bytes): (i64, u64) = tx
            .query_row(
                "SELECT COUNT(*), COALESCE(SUM(payload_size), 0) FROM versions WHERE file_id = ?1",
                params![file_id],
                |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)? as u64)),
            )
            .unwrap_or((0, 0));

        let _ = tx.execute("DELETE FROM versions WHERE file_id = ?1", params![file_id]);
        let _ = tx.execute("DELETE FROM files WHERE id = ?1", params![file_id]);

        println!(
            "[HistoryRepo] delete_file_history file_id={}, removed_count={}, removed_bytes={}",
            file_id, removed_count, removed_bytes
        );

        tx.commit()?;
        Ok((removed_count, removed_bytes))
    }
}
