import re
from app.models.rule import Rule

def rule_strip_per_line(text: str) -> str:
    lines = text.splitlines()
    return "\n".join([line.strip() for line in lines])

def rule_remove_separators(text: str) -> str:
    separators = r"[,，;；、]"
    return re.sub(separators, "", text)

def rule_merge_whitespace(text: str) -> str:
    lines = text.splitlines()
    new_lines = []
    for line in lines:
        new_lines.append(re.sub(r"\s+", " ", line))
    return "\n".join(new_lines)

def rule_remove_empty_lines(text: str) -> str:
    lines = text.splitlines()
    non_empty = [line for line in lines if line.strip()]
    return "\n".join(non_empty)

def rule_unique_lines(text: str) -> str:
    lines = text.splitlines()
    seen = set()
    unique_lines = []
    for line in lines:
        if line not in seen:
            unique_lines.append(line)
            seen.add(line)
    return "\n".join(unique_lines)

def rule_keep_only_digits(text: str) -> str:
    lines = text.splitlines()
    new_lines = []
    for line in lines:
        digits = "".join(re.findall(r"\d+", line))
        new_lines.append(digits)
    return "\n".join(new_lines)

def rule_normalize_newlines(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")

ALL_RULES = [
    Rule(
        id="strip_per_line",
        label="去除首尾空格",
        description="去除每一行的首尾空白字符",
        default_enabled=True,
        func=rule_strip_per_line,
        order=10
    ),
    Rule(
        id="remove_separators",
        label="去除分隔符",
        description="去除逗号、分号、顿号等分隔符",
        default_enabled=True,
        func=rule_remove_separators,
        order=20
    ),
    Rule(
        id="only_digits",
        label="只保留数字",
        description="仅保留行内的数字字符",
        default_enabled=False,
        func=rule_keep_only_digits,
        order=30
    ),
    Rule(
        id="merge_whitespace",
        label="合并空白",
        description="将连续的空白字符合并为一个空格",
        default_enabled=False,
        func=rule_merge_whitespace,
        order=40
    ),
    Rule(
        id="unique_lines",
        label="行去重",
        description="去除重复的行（保留首次出现）",
        default_enabled=False,
        func=rule_unique_lines,
        order=50
    ),
    Rule(
        id="remove_empty_lines",
        label="去除空行",
        description="删除完全为空的行",
        default_enabled=False,
        func=rule_remove_empty_lines,
        order=60
    ),
    Rule(
        id="normalize_newlines",
        label="统一换行",
        description="标准化换行符",
        default_enabled=True,
        func=rule_normalize_newlines,
        order=5
    ),
]

