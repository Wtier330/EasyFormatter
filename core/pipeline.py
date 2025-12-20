from typing import List, Set
from .rules import ALL_RULES, Rule

def get_all_rules() -> List[Rule]:
    """返回按顺序排列的所有规则"""
    return sorted(ALL_RULES, key=lambda r: r.order)

def process_text(text: str, active_rule_ids: Set[str]) -> str:
    """
    根据激活的规则 ID 列表，按顺序处理文本
    """
    if text is None:
        return ""
    
    # 确保文本是字符串类型
    current_text = str(text)
    
    # 获取排序后的规则
    rules = get_all_rules()
    
    for rule in rules:
        if rule.id in active_rule_ids:
            try:
                current_text = rule.func(current_text)
            except Exception as e:
                # 记录错误或优雅地处理？目前打印到控制台，避免崩溃 UI
                print(f"应用规则 {rule.id} 时出错: {e}")
                
    return current_text
