use rusqlite::{params, Result};
use super::repo_types::SqliteHistoryRepo;

impl SqliteHistoryRepo {
    pub fn is_noise_like_pattern() -> (&'static str, [&'static str; 6]) {
        (
            "(
                logical_path LIKE ?1 OR logical_path LIKE ?2 OR logical_path LIKE ?3
                OR logical_path LIKE ?4 OR logical_path LIKE ?5 OR logical_path LIKE ?6
            )",
            [
                "%/EF_%.json",
                r#"%\EF_%.json"#,
                "EF_%.json",
                "%/test_%.json",
                r"%\test_%.json",
                "test_%.json",
            ],
        )
    }

    pub fn scan_noise_db(&self, limit: usize) -> Result<super::repo_types::NoiseDbScan> {
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

        Ok(super::repo_types::NoiseDbScan {
            file_count,
            version_count,
            payload_bytes,
            sample_paths,
        })
    }

    pub fn purge_noise_db_internal(&self) -> Result<(i64, u64)> {
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

        super::debug_log(&format!(
            "purge_noise_db removed_count={}, removed_bytes={}",
            removed_count, removed_bytes
        ));

        tx.commit()?;
        Ok((removed_count, removed_bytes))
    }
}