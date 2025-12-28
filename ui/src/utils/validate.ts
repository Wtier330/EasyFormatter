// 配置验证逻辑，可根据需求扩展
import type { ValidationResult } from '../types/validation';

export function validateConfig(data: any): ValidationResult {
  const errors: any[] = [];
  
  // 版本号验证：允许 semver 字符串 (如 "1.0.0") 或数字
  if (data && typeof data === 'object') {
    if ('version' in data) {
      const v = (data as any).version;
      const isNumber = typeof v === 'number' && Number.isFinite(v);
      const isString = typeof v === 'string';
      const semverRegex = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
      const isSemver = isString && semverRegex.test(v.trim());
      if (!isNumber && !isSemver) {
        errors.push({
          path: 'root.version',
          message: '版本号必须是有效的 SemVer 字符串或数字',
          severity: 'error'
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
