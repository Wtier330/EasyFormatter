use rusqlite::{params, Connection, Result};

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
    pub conn: Connection,
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
}

impl SqliteHistoryRepo {
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
}

pub fn debug_log(_msg: &str) {
    #[cfg(debug_assertions)]
    println!("[HistoryRepo] {}", _msg);
}
