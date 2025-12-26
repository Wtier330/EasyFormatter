use std::collections::HashSet;
use regex::Regex;
use lazy_static::lazy_static;

lazy_static! {
    static ref RE_DELIMITERS: Regex = Regex::new(r"[,，;；、]").unwrap();
    static ref RE_SPACES: Regex = Regex::new(r"\s+").unwrap();
    static ref RE_NOT_NUMBERS: Regex = Regex::new(r"[^0-9\n]").unwrap();
}

pub fn trim_edges(text: &str) -> String {
    text.trim().to_string()
}

pub fn remove_delimiters(text: &str) -> String {
    RE_DELIMITERS.replace_all(text, "").to_string()
}

pub fn merge_spaces(text: &str) -> String {
    RE_SPACES.replace_all(text, " ").to_string()
}

pub fn remove_empty_lines(text: &str) -> String {
    text.lines()
        .filter(|line| !line.trim().is_empty())
        .collect::<Vec<&str>>()
        .join("\n")
}

pub fn deduplicate(text: &str) -> String {
    let mut seen = HashSet::new();
    let mut result = Vec::new();
    for line in text.lines() {
        if seen.insert(line.trim().to_string()) {
            result.push(line);
        }
    }
    result.join("\n")
}

pub fn keep_numbers_only(text: &str) -> String {
    RE_NOT_NUMBERS.replace_all(text, "").to_string()
}
