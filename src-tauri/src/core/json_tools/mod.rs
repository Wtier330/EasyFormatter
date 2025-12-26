use serde::{Deserialize, Serialize};
use serde_json::{ser::PrettyFormatter, Serializer, Value, to_string};

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum JsonMode {
    Validate,
    Beautify,
    Minify,
    Stringify,
    Unescape,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct JsonOptions {
    /// 缩进字符：支持 "2" (2空格), "4" (4空格), "tab" (制表符)
    pub indent: Option<String>,
    /// 是否对 Object 的键进行字母序排序
    pub sort_keys: bool,
}

/// 递归对 JSON Value 进行键排序
/// 
/// # 为什么需要手动排序？
/// 虽然 `serde_json` 提供了 `preserve_order` 特性（底层使用 IndexMap），
/// 但其公共 API 并未直接暴露对底层 Map 的排序方法。
/// 
/// # 实现策略
/// 1. 递归处理所有子节点。
/// 2. 对于 Object 类型：
///    - 将 Map 转换为 `Vec<(Key, Value)>`。
///    - 对 Vec 按 Key 进行字母序排序。
///    - 清空原 Map 并按排序后的顺序重新插入。
fn sort_value(val: &mut Value) {
    match val {
        Value::Array(arr) => {
            for v in arr {
                sort_value(v);
            }
        }
        Value::Object(map) => {
            // 1. 递归排序子节点
            for (_, v) in map.iter_mut() {
                sort_value(v);
            }

            // 2. 提取并排序当前层级的键值对
            // 注意：由于启用了 preserve_order，Map 的迭代顺序即为插入顺序
            let mut entries: Vec<(String, Value)> = map.clone().into_iter().collect();
            entries.sort_by(|a, b| a.0.cmp(&b.0));
            
            // 3. 重建 Map 以应用排序
            map.clear();
            for (k, v) in entries {
                map.insert(k, v);
            }
        }
        _ => {}
    }
}

pub fn apply(input: &str, mode: JsonMode, options: JsonOptions) -> Result<String, String> {
    match mode {
        JsonMode::Validate => {
            let _: Value = serde_json::from_str(input).map_err(|e| e.to_string())?;
            Ok("Valid JSON".to_string())
        },
        JsonMode::Beautify => {
            let mut val: Value = serde_json::from_str(input).map_err(|e| e.to_string())?;
            
            // 如果启用排序，先对 Value 树进行原地重排
            if options.sort_keys {
                sort_value(&mut val);
            }

            // 根据配置生成缩进字节串
            let indent_str = match options.indent.as_deref() {
                Some("4") => b"    ".to_vec(),
                Some("tab") => b"\t".to_vec(),
                _ => b"  ".to_vec(), // 默认为 2 个空格
            };

            // 使用 PrettyFormatter 自定义缩进
            let formatter = PrettyFormatter::with_indent(&indent_str);
            let mut buf = Vec::new();
            let mut serializer = Serializer::with_formatter(&mut buf, formatter);
            
            val.serialize(&mut serializer).map_err(|e| e.to_string())?;
            
            String::from_utf8(buf).map_err(|e| e.to_string())
        },
        JsonMode::Minify => {
            let mut val: Value = serde_json::from_str(input).map_err(|e| e.to_string())?;
            if options.sort_keys {
                sort_value(&mut val);
            }
            Ok(to_string(&val).map_err(|e| e.to_string())?)
        },
        JsonMode::Stringify => {
            // 直接将输入字符串转义为 JSON 字符串
            Ok(to_string(input).map_err(|e| e.to_string())?)
        },
        JsonMode::Unescape => {
             // 尝试直接反序列化字符串
             let val: String = serde_json::from_str(input).or_else(|_| {
                 // 容错处理：如果用户粘贴的是未带引号的转义内容，尝试手动包裹引号
                 serde_json::from_str(&format!("\"{}\"", input))
             }).map_err(|e| e.to_string())?;
             Ok(val)
        }
    }
}
