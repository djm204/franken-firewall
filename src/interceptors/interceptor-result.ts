import type { GuardrailViolation } from "../types/index.js";

export type InterceptorResult<T = void> =
  | { passed: true; value?: T }
  | { passed: false; violations: GuardrailViolation[] };

export function pass<T>(value?: T): InterceptorResult<T> {
  return value !== undefined ? { passed: true, value } : { passed: true };
}

export function block(violations: GuardrailViolation[]): InterceptorResult<never> {
  return { passed: false, violations };
}

export function blockOne(violation: GuardrailViolation): InterceptorResult<never> {
  return { passed: false, violations: [violation] };
}
