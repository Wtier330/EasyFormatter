import json
from typing import Tuple, Union, Any

class JsonTools:
    """
    JSON processing logic: Validate, Format, Minify, Escape, Unescape.
    """

    @staticmethod
    def validate(text: str) -> Tuple[bool, str]:
        """验证是否为有效的 JSON 字符串"""
        if not text or not text.strip():
            return False, "输入为空"
        try:
            json.loads(text)
            return True, "有效的 JSON"
        except json.JSONDecodeError as e:
            return False, f"无效的 JSON: {e}"

    @staticmethod
    def format_json(text: str, indent: int = 4, sort_keys: bool = False) -> str:
        """格式化（美化） JSON"""
        if not text:
            return ""
        try:
            obj = json.loads(text)
            return json.dumps(obj, indent=indent, sort_keys=sort_keys, ensure_ascii=False)
        except Exception:
            return text  # Return original if parsing fails

    @staticmethod
    def minify_json(text: str) -> str:
        """压缩 JSON（移除空白）"""
        if not text:
            return ""
        try:
            obj = json.loads(text)
            return json.dumps(obj, separators=(',', ':'), ensure_ascii=False)
        except Exception:
            return text

    @staticmethod
    def escape_string(text: str) -> str:
        """转义字符串（将文本转换为 JSON 字符串格式）"""
        if not text:
            return ""
        return json.dumps(text, ensure_ascii=False)

    @staticmethod
    def unescape_string(text: str) -> str:
        """去转义（将 JSON 字符串还原为文本）"""
        if not text:
            return ""
        try:
            obj = json.loads(text)
            if isinstance(obj, str):
                return obj
            return json.dumps(obj, ensure_ascii=False)
        except Exception:
            return text
