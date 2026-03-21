import { SignalPayload, Heartbeat, ExecutionResult } from './types.js';

export function validateSignalPayload(data: unknown) {
  return SignalPayload.safeParse(data);
}

export function validateHeartbeat(data: unknown) {
  return Heartbeat.safeParse(data);
}

export function validateExecutionResult(data: unknown) {
  return ExecutionResult.safeParse(data);
}
