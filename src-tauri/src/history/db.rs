use rusqlite::{Connection, Result};
use crate::appdirs::get_app_dirs;

pub fn init_db() -> Result<Connection> {
    let dirs = get_app_dirs().ok_or(rusqlite::Error::InvalidPath(std::path::PathBuf::from("No app dirs")))?;
    
    // 确保目录存在
    let _ = dirs.init();
    
    let db_path = dirs.db_path();
    
    // Debug logging
    #[cfg(debug_assertions)]
    {
        println!("[DEBUG] Opening history database at: {:?}", db_path);
        if db_path.exists() {
             match std::fs::metadata(&db_path) {
                Ok(metadata) => {
                    let permissions = metadata.permissions();
                    println!("[DEBUG] Database file permissions: readonly={:?}", permissions.readonly());
                }
                Err(e) => println!("[DEBUG] Failed to read database metadata: {}", e),
            }
        } else {
             println!("[DEBUG] Database file does not exist, it will be created.");
        }
    }

    let conn = Connection::open(&db_path)?;
    
    // Enable WAL mode for better concurrency and performance
    // This allows external tools (like DB Browser for SQLite) to read the DB while the app is running
    conn.pragma_update(None, "journal_mode", "WAL")?;
    
    // Set busy timeout to avoid "database is locked" errors
    conn.pragma_update(None, "busy_timeout", 5000)?; // 5000ms
    
    migrate(&conn)?;
    
    Ok(conn)
}

fn migrate(conn: &Connection) -> Result<()> {
    // Files Table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY,
            logical_path TEXT NOT NULL UNIQUE,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )?;

    // Versions Table (Updated for Feishu-style History)
    // op_type: open | format | compress | transform | save | rollback | auto
    // patch/inverse_patch: BLOB
    conn.execute(
        "CREATE TABLE IF NOT EXISTS versions (
            id INTEGER PRIMARY KEY,
            file_id INTEGER NOT NULL,
            parent_id INTEGER,
            ts INTEGER NOT NULL,
            op_type TEXT DEFAULT 'save',
            op_meta TEXT,
            base_hash TEXT,
            this_hash TEXT NOT NULL,
            patch_blob BLOB,
            inverse_patch_blob BLOB,
            codec TEXT DEFAULT 'none',
            payload_size INTEGER DEFAULT 0,
            validate_ok BOOLEAN DEFAULT 0,
            note TEXT,
            is_checkpoint BOOLEAN DEFAULT 0,
            FOREIGN KEY(file_id) REFERENCES files(id)
        )",
        [],
    )?;

    // Indexes
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_versions_file_id ON versions(file_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_files_path ON files(logical_path)",
        [],
    )?;

    Ok(())
}
