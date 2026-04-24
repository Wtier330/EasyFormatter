use rusqlite::{params, Result, OptionalExtension};
use super::debug_log;
use super::repo_types::SqliteHistoryRepo;
use super::repo_types::{HistoryRepo, HistoryStats};
use super::models::{FileRecord, VersionRecord, VersionSummary};
use std::time::{SystemTime, UNIX_EPOCH};

impl HistoryRepo for SqliteHistoryRepo {
    fn get_or_create_file(&self, path: &str) -> Result<i64> {
        debug_log(&format!("get_or_create_file: {}", path));
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;

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
        self.gc_internal(max_days, max_records)
    }

    fn delete_versions_from_latest(&self, file_id: i64, version_ids: Vec<i64>) -> Result<(i64, u64)> {
        self.delete_versions_from_latest_internal(file_id, version_ids)
    }

    fn delete_file_history(&self, file_id: i64) -> Result<(i64, u64)> {
        self.delete_file_history_internal(file_id)
    }
}

impl super::repo_types::SqliteHistoryRepo {
    pub fn gc_internal(&self, max_days: Option<i64>, max_records: Option<i64>) -> Result<(i64, u64)> {
        super::repo_gc::gc_internal(self, max_days, max_records)
    }

    pub fn delete_versions_from_latest_internal(&self, file_id: i64, version_ids: Vec<i64>) -> Result<(i64, u64)> {
        super::repo_versions::delete_versions_from_latest_internal(self, file_id, version_ids)
    }

    pub fn delete_file_history_internal(&self, file_id: i64) -> Result<(i64, u64)> {
        super::repo_gc::delete_file_history_internal(self, file_id)
    }
}