from dataclasses import dataclass
from typing import Callable, Optional
import re

@dataclass
class Rule:
    id: str
    label: str
    description: str
    default_enabled: bool
    func: Callable[[str], str]
    order: int  # 执行顺序

# 规则实现

def rule_strip_per_line(text: str) -> str:
    """去除每行首尾空格"""
    lines = text.splitlines()
    # 保持原有行结构，但去除首尾空格
    return "\n".join([line.strip() for line in lines])

def rule_remove_separators(text: str) -> str:
    """去除分隔符字符"""
    # 逗号, 中文逗号, 分号, 中文分号, 顿号
    separators = r"[,，;；、]"
    return re.sub(separators, "", text)

def rule_merge_whitespace(text: str) -> str:
    """合并连续空白为单个空格"""
    lines = text.splitlines()
    new_lines = []
    for line in lines:
        # 将多个空白字符替换为单个空格
        new_lines.append(re.sub(r"\s+", " ", line))
    return "\n".join(new_lines)

def rule_remove_empty_lines(text: str) -> str:
    """去除空行"""
    lines = text.splitlines()
    # 过滤掉空行或仅包含空白字符的行
    non_empty = [line for line in lines if line.strip()]
    return "\n".join(non_empty)

def rule_unique_lines(text: str) -> str:
    """输出行去重（保持原顺序）"""
    lines = text.splitlines()
    seen = set()
    unique_lines = []
    for line in lines:
        # 检查是否应该忽略空行的唯一性？
        # 需求要求“稳定去重”。通常意味着精确匹配。
        if line not in seen:
            unique_lines.append(line)
            seen.add(line)
    return "\n".join(unique_lines)

def rule_keep_only_digits(text: str) -> str:
    """只保留数字"""
    lines = text.splitlines()
    new_lines = []
    for line in lines:
        # 提取所有数字
        digits = "".join(re.findall(r"\d+", line))
        # 如果行变为空，则保持为空（如果启用了去除空行规则，则会被移除）
        new_lines.append(digits)
    return "\n".join(new_lines)

def rule_normalize_newlines(text: str) -> str:
    """统一换行（内部处理通常通过 splitlines/join 处理，但我们确保输出使用一致的分隔符）"""
    # 由于我们在其他规则中使用了 splitlines() 和 join()，我们在内存中有效地将其标准化为 \n。
    # 最终输出到控件时将适应操作系统。
    # 但是，为了明确起见，此规则在内存中可能是一个无操作或强制特定处理。
    # 这里我们只是按原样返回文本，因为管道中的 splitlines+join 处理了标准化。
    # 但是如果这是唯一的规则，我们可能希望确保标准分隔符。
    return text.replace("\r\n", "\n").replace("\r", "\n")


# 规则注册表
# 顺序决定了管道执行序列。
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
