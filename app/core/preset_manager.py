from typing import Dict, Any, List, Optional

class PresetManager:
    """
    Manages rule presets (templates of rule states).
    """

    PRESETS = {
        "default": {
            "name": "常规清洗",
            "rules": {
                "strip_lines": True,
                "remove_separators": True,
                "merge_whitespace": False,
                "keep_digits": False,
                "remove_empty_lines": False,
                "unique_lines": False
            }
        },
        "digits_only": {
            "name": "仅提取数字",
            "rules": {
                "strip_lines": False,
                "remove_separators": False,
                "merge_whitespace": False,
                "keep_digits": True,
                "remove_empty_lines": True,
                "unique_lines": False
            }
        },
        "remove_seps": {
            "name": "去分隔符",
            "rules": {
                "strip_lines": True,
                "remove_separators": True,
                "merge_whitespace": False,
                "keep_digits": False,
                "remove_empty_lines": False,
                "unique_lines": False
            }
        },
        "structure": {
            "name": "结构化清洗",
            "rules": {
                "strip_lines": True,
                "remove_separators": False,
                "merge_whitespace": True,
                "keep_digits": False,
                "remove_empty_lines": True,
                "unique_lines": True
            }
        }
    }

    @classmethod
    def get_preset(cls, key: str) -> Optional[Dict[str, Any]]:
        return cls.PRESETS.get(key)

    @classmethod
    def get_all_presets(cls) -> List[Dict[str, Any]]:
        # Return list of dicts with 'key' included
        result = []
        for key, data in cls.PRESETS.items():
            item = data.copy()
            item['key'] = key
            result.append(item)
        return result
