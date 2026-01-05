use std::env;
use easyformatter_lib::history::repo::{SqliteHistoryRepo, HistoryRepo};
use easyformatter_lib::history::commands;
use std::time::{SystemTime, UNIX_EPOCH};
use std::sync::atomic::{AtomicU64, Ordering};
static COUNTER: AtomicU64 = AtomicU64::new(0);

fn rand_path() -> String {
    let t = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64;
    let c = COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("C:/test_{}_{}.json", t, c)
}

#[test]
fn write_integrity_and_hash_dedup() {
    env::set_var("EASYFORMATTER_MODE", "deploy");
    let path = rand_path();
    let c1 = r#"{"a":1}"#.to_string();
    let c2 = r#"{"a":2}"#.to_string();
    let c3 = r#"{"a":3}"#.to_string();
    let _id1 = commands::history_record_stub(path.clone(), c1.clone(), None, Some("save".into())).unwrap();
    let _id2 = commands::history_record_stub(path.clone(), c2.clone(), None, Some("format".into())).unwrap();
    let id3 = commands::history_record_stub(path.clone(), c3.clone(), None, Some("transform".into())).unwrap();
    let id3_dup = commands::history_record_stub(path.clone(), c3.clone(), None, Some("transform".into())).unwrap();
    assert_eq!(id3, id3_dup);
    let repo = SqliteHistoryRepo::new().unwrap();
    let fid = repo.get_or_create_file(&path).unwrap();
    let versions = repo.list_versions(fid).unwrap();
    assert!(versions.len() >= 2);
    let last = repo.get_latest_version(fid).unwrap().unwrap();
    assert!(versions.iter().any(|v| v.id == id3));
    assert!(last.ts > 0);
}

#[test]
fn checkpoint_threshold_works() {
    env::set_var("EASYFORMATTER_MODE", "deploy");
    let path = rand_path();
    let small = r#"{"a":1,"b":[1,2,3],"c":{"x":1}}"#.to_string();
    let big = r#"{"new":true,"arr":[{"k":"v","n":123},{"m":[1,2,3,4,5]}],"obj":{"p":{"q":{}}},"extra":[null,0,{},[]]}"#.to_string();
    let _ = commands::history_record_stub(path.clone(), small.clone(), None, Some("save".into())).unwrap();
    let v2 = commands::history_record_stub(path.clone(), big.clone(), None, Some("transform".into())).unwrap();
    let repo = SqliteHistoryRepo::new().unwrap();
    let ver2 = repo.get_version(v2).unwrap();
    assert!(ver2.is_checkpoint);
}

#[test]
fn single_materialize_equals_content() {
    env::set_var("EASYFORMATTER_MODE", "deploy");
    let path = rand_path();
    let c1 = r#"{"a":1}"#.to_string();
    let id = commands::history_record_stub(path.clone(), c1.clone(), None, Some("save".into())).unwrap();
    let res = commands::history_get_version_content(id).unwrap();
    assert_eq!(res, c1);
}

#[test]
fn chain_materialize_from_checkpoint() {
    env::set_var("EASYFORMATTER_MODE", "deploy");
    let path = rand_path();
    let a = r#"{"a":1}"#.to_string();
    let b = r#"{"a":2}"#.to_string();
    let c = r#"{"a":3}"#.to_string();
    let _ = commands::history_record_stub(path.clone(), a.clone(), None, Some("save".into())).unwrap();
    let _ = commands::history_record_stub(path.clone(), b.clone(), None, Some("format".into())).unwrap();
    let idc = commands::history_record_stub(path.clone(), c.clone(), None, Some("format".into())).unwrap();
    let res = commands::history_get_version_content(idc).unwrap();
    assert_eq!(res, c);
}

#[test]
fn delete_single_version_keeps_chain_valid() {
    env::set_var("EASYFORMATTER_MODE", "deploy");
    let path = rand_path();
    let a = r#"{"v":1}"#.to_string();
    let b = r#"{"v":2}"#.to_string();
    let c = r#"{"v":3}"#.to_string();

    let id1 = commands::history_record_stub(path.clone(), a.clone(), None, Some("save".into())).unwrap();
    let id2 = commands::history_record_stub(path.clone(), b.clone(), None, Some("format".into())).unwrap();
    let id3 = commands::history_record_stub(path.clone(), c.clone(), None, Some("format".into())).unwrap();

    let repo = SqliteHistoryRepo::new().unwrap();
    let fid = repo.get_or_create_file(&path).unwrap();

    let (removed_count, _) = repo.delete_versions_from_latest(fid, vec![id2]).unwrap();
    assert_eq!(removed_count, 1);

    let versions = repo.list_versions(fid).unwrap();
    assert_eq!(versions.len(), 2);
    assert!(versions.iter().any(|v| v.id == id1));
    assert!(versions.iter().any(|v| v.id == id3));

    let content1 = commands::history_get_version_content(id1).unwrap();
    let content3 = commands::history_get_version_content(id3).unwrap();
    assert_eq!(content1, a);
    assert_eq!(content3, c);
}

#[test]
fn copy_restore_creates_file() {
    env::set_var("EASYFORMATTER_MODE", "deploy");
    let path = rand_path();
    let c1 = r#"{"a":1}"#.to_string();
    let id = commands::history_record_stub(path.clone(), c1.clone(), None, Some("save".into())).unwrap();
    let dir = std::env::temp_dir().to_string_lossy().to_string();
    let out = commands::history_copy_restore(id, Some(dir.clone())).unwrap();
    assert!(std::path::Path::new(&out).exists());
}
#[test]
fn broken_chain_errors_on_materialize() {
    env::set_var("EASYFORMATTER_MODE", "deploy");
    let path = rand_path();
    let a = r#"{"a":1}"#.to_string();
    let b = r#"{"a":2}"#.to_string();
    let _id1 = commands::history_record_stub(path.clone(), a.clone(), None, Some("save".into())).unwrap();
    let id2 = commands::history_record_stub(path.clone(), b.clone(), None, Some("format".into())).unwrap();
    let repo = SqliteHistoryRepo::new().unwrap();
    let v2 = repo.get_version(id2).unwrap();
    if !v2.is_checkpoint {
        let pid = v2.parent_id.unwrap();
        let conn = easyformatter_lib::history::db::init_db().unwrap();
        conn.execute("DELETE FROM versions WHERE id = ?1", rusqlite::params![pid]).unwrap();
        let err = commands::history_materialize(id2).err().unwrap();
        assert!(err.contains("Broken chain"));
    }
}

#[test]
fn null_sink_path_is_ignored() {
    env::set_var("EASYFORMATTER_MODE", "deploy");
    let id = commands::history_record_stub("NUL".to_string(), r#"{"a":1}"#.to_string(), None, Some("save".into())).unwrap();
    assert_eq!(id, 0);

    let repo = SqliteHistoryRepo::new().unwrap();
    let files = repo.list_files().unwrap();
    assert!(!files.iter().any(|f| f.logical_path == "NUL"));
}
