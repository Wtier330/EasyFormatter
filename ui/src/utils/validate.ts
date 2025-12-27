// Mock validation for now, can be expanded
import type { ValidationResult } from '../types/validation';

export function validateConfig(data: any): ValidationResult {
  const errors: any[] = [];
  
  // Version validation: allow semver string (e.g., "1.0.0") or number
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
          message: 'Version must be a valid semver string or number',
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
