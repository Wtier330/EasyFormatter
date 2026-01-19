use directories::ProjectDirs;
use std::fs;
use std::path::PathBuf;

pub struct AppDirs {
    pub root: PathBuf,
    pub db: PathBuf,
    pub logs: PathBuf,
    pub cache: PathBuf,
    pub exports: PathBuf,
    pub meta: PathBuf,
}

impl AppDirs {
    pub fn new() -> Option<Self> {
        let root = if let Ok(p) = std::env::var("EASYFORMATTER_DATA_DIR") {
            PathBuf::from(p)
        } else {
            let proj_dirs = ProjectDirs::from("", "", "EasyFormatter")?;
            proj_dirs.data_dir().to_path_buf()
        };

        let root = if std::env::var("EASYFORMATTER_TEST_DB_PER_THREAD").unwrap_or_default() == "1" {
            let tid = format!("{:?}", std::thread::current().id());
            let safe = tid
                .chars()
                .map(|c| if c.is_ascii_alphanumeric() { c } else { '_' })
                .collect::<String>();
            root.join("tests").join(safe)
        } else {
            root
        };
        
        Some(Self {
            db: root.join("db"),
            logs: root.join("logs"),
            cache: root.join("cache"),
            exports: root.join("exports"),
            meta: root.join("meta"),
            root,
        })
    }
    
    pub fn init(&self) -> std::io::Result<()> {
        fs::create_dir_all(&self.root)?;
        fs::create_dir_all(&self.db)?;
        fs::create_dir_all(&self.logs)?;
        fs::create_dir_all(&self.cache)?;
        fs::create_dir_all(&self.exports)?;
        fs::create_dir_all(&self.meta)?;
        Ok(())
    }
    
    pub fn db_path(&self) -> PathBuf {
        self.db.join("history.db")
    }
}

pub fn get_app_dirs() -> Option<AppDirs> {
    AppDirs::new()
}

/// 部署模式判定
/// 目前在 debug 模式下也默认开启，以便进行开发调试
pub fn is_deployment_mode() -> bool {
    // 环境变量优先：EASYFORMATTER_MODE=deploy
    if std::env::var("EASYFORMATTER_MODE").unwrap_or_default() == "deploy" {
        return true;
    }
    
    // Debug 模式下也允许访问 (用户明确要求: 配置debug模式下的数据库访问权限)
    #[cfg(debug_assertions)]
    {
        return true; 
    }

    // release 构建默认视为部署模式
    #[cfg(not(debug_assertions))]
    {
        return true;
    }
}
