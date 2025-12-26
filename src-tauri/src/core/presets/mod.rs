use crate::core::formatter::pipeline::FormatOptions;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Preset {
    pub name: String,
    pub options: FormatOptions,
}

pub fn get_defaults() -> Vec<Preset> {
    vec![
        Preset {
            name: "常规清洗".to_string(),
            options: FormatOptions {
                trim_edges: true,
                remove_delimiters: false,
                merge_spaces: true,
                remove_empty_lines: true,
                deduplicate: false,
                keep_numbers_only: false,
            },
        },
        Preset {
            name: "仅数字".to_string(),
            options: FormatOptions {
                trim_edges: true,
                remove_delimiters: false,
                merge_spaces: true,
                remove_empty_lines: true,
                deduplicate: false,
                keep_numbers_only: true,
            },
        },
        Preset {
            name: "去分隔符".to_string(),
            options: FormatOptions {
                trim_edges: true,
                remove_delimiters: true,
                merge_spaces: true,
                remove_empty_lines: true,
                deduplicate: false,
                keep_numbers_only: false,
            },
        },
    ]
}
