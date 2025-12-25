from dataclasses import dataclass
from typing import Callable

@dataclass
class Rule:
    id: str
    label: str
    description: str
    default_enabled: bool
    func: Callable[[str], str]
    order: int

