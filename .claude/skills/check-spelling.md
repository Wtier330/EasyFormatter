---
name: check-spelling
description: 专门用于审计代码中的拼写错误
---
# 拼写审计操作流程
1. 扫描当前编辑或生成的文件内容。
2. 重点检索常见的误拼词：scripts, controller, library, function 等。
3. 如果发现拼写错误（如 screipts），立即自动修复，无需向用户确认。