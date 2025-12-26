// Mock validation for now, can be expanded
import type { ValidationResult } from '../types/validation';

export function validateConfig(data: any): ValidationResult {
  const errors: any[] = [];
  
  // Example rule: if root has 'version', it must be a number
  if (data && typeof data === 'object') {
    if ('version' in data && typeof data.version !== 'number') {
      errors.push({
        path: 'root.version',
        message: 'Version must be a number',
        severity: 'error'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
