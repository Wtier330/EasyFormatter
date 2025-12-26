export const TEXT = {
  APP_NAME: 'EasyFormatter',
  COMMON: {
    COPY: '复制',
    COPIED: '已复制',
    EXECUTE: '执行操作',
    PROCESSING: '处理中...',
    SUCCESS: '执行成功',
    ERROR: '处理失败',
    INPUT_PLACEHOLDER: '请输入内容...',
    OUTPUT_PLACEHOLDER: '处理结果将显示在这里...',
  },
  JSON_TOOLS: {
    TITLE: 'JSON 工具',
    MODES: {
      VALIDATE: '校验',
      BEAUTIFY: '美化',
      MINIFY: '压缩',
      STRINGIFY: '转义',
      UNESCAPE: '去转义',
    },
    MODE_DESC: {
      VALIDATE: '校验 JSON 格式是否合法，不进行修改',
      BEAUTIFY: '格式化 JSON 字符串，使其易于阅读',
      MINIFY: '压缩 JSON 字符串，移除空白字符',
      STRINGIFY: '将 JSON 对象转义为字符串',
      UNESCAPE: '将转义后的 JSON 字符串还原',
    },
    PARAMS: {
      SORT_KEYS: '键排序',
      INDENT: '缩进',
    },
    ERRORS: {
      INVALID_JSON: '无效的 JSON 内容',
      EMPTY_INPUT: '请输入需要处理的内容',
    }
  },
  FORMATTER: {
    TITLE: '文本清洗',
    PRESETS: {
      TITLE: '预设',
      DEFAULT: '常规清洗',
      NUMBERS_ONLY: '仅保留数字',
      NO_SEPARATOR: '去除分隔符',
      STRUCTURED: '结构化清洗',
      CUSTOM: '自定义',
    },
    RULES: {
      TITLE: '清洗规则',
      TRIM: '去首尾空格',
      TRIM_SEPARATOR: '去分隔符',
      MERGE_SPACES: '合并空白',
      REMOVE_EMPTY_LINES: '去空行',
      UNIQUE: '去重 (保持顺序)',
      NUMBERS_ONLY: '仅保留数字',
    },
    STATS: {
      INPUT_LENGTH: '输入长度',
      OUTPUT_LENGTH: '输出长度',
      LINES: '行数',
    }
  }
}
