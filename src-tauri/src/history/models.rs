use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileRecord {
    pub id: i64,
    pub logical_path: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VersionRecord {
    pub id: i64,
    pub file_id: i64,
    pub parent_id: Option<i64>,
    pub ts: i64,
    
    // Feishu-style fields
    pub op_type: String, // open, save, format, rollback...
    pub op_meta: Option<String>,
    
    pub base_hash: Option<String>,
    pub this_hash: String,
    
    #[serde(skip)]
    pub patch_blob: Option<Vec<u8>>,
    #[serde(skip)]
    pub inverse_patch_blob: Option<Vec<u8>>,
    
    pub codec: String, // none, zstd
    pub payload_size: i64,
    pub validate_ok: bool,
    pub note: Option<String>,
    pub is_checkpoint: bool,
}

// 用于前端列表展示的轻量对象
#[derive(Debug, Serialize, Deserialize)]
pub struct VersionSummary {
    pub id: i64,
    pub ts: i64,
    pub op_type: String,
    pub note: Option<String>,
    pub payload_size: i64,
    pub is_checkpoint: bool,
}
