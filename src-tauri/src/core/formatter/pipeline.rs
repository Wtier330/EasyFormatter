use serde::{Deserialize, Serialize};
use super::rules;

#[derive(Debug, Deserialize, Serialize, Clone, Default)]
pub struct FormatOptions {
    pub trim_edges: bool,
    pub remove_delimiters: bool,
    pub merge_spaces: bool,
    pub remove_empty_lines: bool,
    pub deduplicate: bool,
    pub keep_numbers_only: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct FormatResult {
    pub output: String,
    pub applied_rules_count: usize,
    pub stats: TextStats,
}

#[derive(Debug, Serialize, Clone)]
pub struct TextStats {
    pub lines: usize,
    pub chars: usize,
}

pub fn process_text(text: String, options: &FormatOptions) -> FormatResult {
    let mut result = text;
    let mut applied = 0;

    // Order matters? Usually keep numbers first if selected, as it destroys others?
    // User requirement: "Check rules...".
    // If "Keep numbers only" is checked, usually we strip everything else first.
    if options.keep_numbers_only {
        result = rules::keep_numbers_only(&result);
        applied += 1;
    }
    
    if options.remove_delimiters {
        result = rules::remove_delimiters(&result);
        applied += 1;
    }
    
    if options.merge_spaces {
        result = rules::merge_spaces(&result);
        applied += 1;
    }
    
    if options.deduplicate {
        // Dedupe before empty lines? Or after?
        // Usually dedupe might create empty lines if not careful, but here dedupe logic keeps lines.
        result = rules::deduplicate(&result);
        applied += 1;
    }

    if options.remove_empty_lines {
        result = rules::remove_empty_lines(&result);
        applied += 1;
    }
    
    if options.trim_edges {
        result = rules::trim_edges(&result);
        applied += 1;
    }

    let stats = TextStats {
        lines: result.lines().count(),
        chars: result.chars().count(),
    };

    FormatResult {
        output: result,
        applied_rules_count: applied,
        stats,
    }
}
