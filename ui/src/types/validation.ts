export interface ValidationError {
  path: string; // JSON path e.g. "root.users[0].name"
  message: string;
  severity: 'error' | 'warning';
  line?: number;
  column?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
