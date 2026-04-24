pub use repo_types::{HistoryRepo, HistoryStats, SqliteHistoryRepo};

pub fn repo() -> SqliteHistoryRepo {
    SqliteHistoryRepo::new()
}

pub use repo_types::{HistoryRepo as HistoryRepoTrait};

pub fn repo_trait() -> Box<dyn HistoryRepo> {
    Box::new(SqliteHistoryRepo::new())
}