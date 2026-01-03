use std::env;
use rand::{Rng, distributions::Alphanumeric};
use super::repo::{SqliteHistoryRepo, HistoryRepo};
use super::commands;

fn rand_path() -> String {
    let s: String = rand::thread_rng().sample_iter(&Alphanumeric).take(8).map(char::from).collect();
    format!("C:/EF_{}.json", s)
}

#[test]
fn write_integrity_and_hash_dedup() {
    env::set_var("EASYFORMATTER_MODE", "deploy");
    let path = rand_path();
    let c1 = r#"{"a":1}"#.to_string();
    let c2 = r#"{"a":2}"#.to_string();
    let c3 = r#"{"a":3}"#.to_string();
    let id1 = commands::history_record_stub(path.clone(), c1.clone(), None, Some("save".into())).unwrap();
    let id2 = commands::history_record_stub(path.clone(), c2.clone(), None, Some("format".into())).unwrap();
    let id3 = commands::history_record_stub(path.clone(), c3.clone(), None, Some("transform".into())).unwrap();
    let id3_dup = commands::history_record_stub(path.clone(), c3.clone(), None, Some("transform".into())).unwrap();
    assert_eq!(id3, id3_dup);
    let repo = SqliteHistoryRepo::new().unwrap();
    let fid = repo.get_or_create_file(&path).unwrap();
    let versions = repo.list_versions(fid).unwrap();
    assert!(versions.len() >= 3);
    let last = repo.get_latest_version(fid).unwrap().unwrap();
    assert_eq!(last.id, id3);
    assert!(last.parent_id.is_some());
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
    let res = commands::history_materialize(id).unwrap();
    assert_eq!(res.content, c1);
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
    let res = commands::history_materialize(idc).unwrap();
    assert_eq!(res.content, c);
}

#[test]
fn broken_chain_errors_on_materialize() {
    env::set_var("EASYFORMATTER_MODE", "deploy");
    let path = rand_path();
    let a = r#"{"a":1}"#.to_string();
    let b = r#"{"a":2}"#.to_string();
    let id1 = commands::history_record_stub(path.clone(), a.clone(), None, Some("save".into())).unwrap();
    let id2 = commands::history_record_stub(path.clone(), b.clone(), None, Some("format".into())).unwrap();
    let repo = SqliteHistoryRepo::new().unwrap();
    let v2 = repo.get_version(id2).unwrap();
    if let Some(pid) = v2.parent_id {
        let conn = super::db::init_db().unwrap();
        conn.execute("DELETE FROM versions WHERE id = ?1", rusqlite::params![pid]).unwrap();
        let err = commands::history_materialize(id2).err().unwrap();
        assert!(err.contains("Broken chain"));
    }
}
