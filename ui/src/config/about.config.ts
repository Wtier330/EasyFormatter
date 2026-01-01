export const aboutConfig = {
  appName: 'EasyFormatter',
  description: '一款基于 Tauri + Vue 3 构建的轻量级、高性能桌面端文本处理工具，专注解决数据清洗与格式化痛点。',
  slogan: '让数据清洗更简单，让开发调试更高效',
  version: '1.2.0', // Fallback version if dynamic retrieval fails
  features: [
    '多标签页与临时文档：支持快速创建/粘贴，应用重启自动恢复',
    'JSON 专业工具箱：双栏预览、校验、压缩、转义、递归排序',
    'Monaco Editor 内核：提供 IDE 级的流畅编辑体验',
    '完全离线：所有数据处理均在本地完成，无隐私泄露风险',
    '轻量高性能：Rust 驱动核心逻辑，秒开秒用'
  ],
  author: {
    name: 'Wtier330',
    email: 'witer330@gmail.com', // Placeholder
    // website: 'https://github.com/Wtier330' // Placeholder
  },
  links: {
    repo: 'https://github.com/Wtier330/EasyFormatter',
    issues: 'https://github.com/Wtier330/EasyFormatter/issues',
    releases: 'https://github.com/Wtier330/EasyFormatter/releases',
    docs: 'https://github.com/Wtier330/EasyFormatter#readme'
  },
  letter: `
你好，感谢你使用这款工具。
我做它的初衷很简单：在真实运维和开发场景里，我们经常需要快速确认“我到底改了哪里”“配置为什么突然不对了”。我希望它能在不打断你工作流的前提下，让格式化、比对、回溯这些动作变得更轻、更快。

如果你在使用中遇到问题，或有更贴近场景的需求建议，欢迎在 Issues 里告诉我。你提供的一条日志、一张截图，都可能直接帮助我把它做得更好。

愿它能在你赶进度、救火、上线的那些时刻，帮你省下几分钟、少一点焦虑。

Wtier330
  `.trim()
};
