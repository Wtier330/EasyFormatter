import json
from typing import Tuple, Any

class JsonService:
    """提供 JSON 相关的处理服务"""

    def validate(self, text: str) -> Tuple[bool, str]:
        """验证是否为有效的 JSON 字符串"""
        if not text or not text.strip():
            return False, "输入为空"
        try:
            json.loads(text)
            return True, "有效的 JSON"
        except json.JSONDecodeError as e:
            return False, f"无效的 JSON: {e}"

    def pretty_print(self, text: str, indent: int = 4, sort_keys: bool = False) -> str:
        """格式化（美化） JSON"""
        if not text:
            return ""
        try:
            obj = json.loads(text)
            return json.dumps(obj, indent=indent, sort_keys=sort_keys, ensure_ascii=False)
        except Exception:
            return text  # 解析失败返回原文本

    def minify(self, text: str) -> str:
        """压缩 JSON（移除空白）"""
        if not text:
            return ""
        try:
            obj = json.loads(text)
            # 使用 separators 去除空格
            return json.dumps(obj, separators=(',', ':'), ensure_ascii=False)
        except Exception:
            return text

    def escape(self, text: str) -> str:
        """转义字符串（将文本转换为 JSON 字符串格式）"""
        if not text:
            return ""
        return json.dumps(text, ensure_ascii=False)

    def unescape(self, text: str) -> str:
        """去转义（将 JSON 字符串还原为文本）"""
        if not text:
            return ""
        try:
            # 如果输入是 "abc"，loads 后变成 abc
            obj = json.loads(text)
            if isinstance(obj, str):
                return obj
            # 如果输入是 {"a":1}，loads 后是 dict，我们将其转回字符串显示
            return json.dumps(obj, ensure_ascii=False)
        except Exception:
            return text
