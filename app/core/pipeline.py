from typing import List, Set
from app.core.rules import ALL_RULES
from app.models.rule import Rule

def get_all_rules() -> List[Rule]:
    return sorted(ALL_RULES, key=lambda r: r.order)

def process_text(text: str, active_rule_ids: Set[str]) -> str:
    if text is None:
        return ""
    current_text = str(text)
    rules = get_all_rules()
    for rule in rules:
        if rule.id in active_rule_ids:
            try:
                current_text = rule.func(current_text)
            except Exception:
                continue
    return current_text
