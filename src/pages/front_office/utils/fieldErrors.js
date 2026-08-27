/** Shared registration field invalid-state helpers. */
import { fo } from '../styles/frontOfficeModuleClasses';

export function withError(baseClass, invalid) {
  return invalid ? `${baseClass} ${fo.controlError}` : baseClass;
}

export function isBlank(value) {
  return !String(value ?? '').trim();
}
