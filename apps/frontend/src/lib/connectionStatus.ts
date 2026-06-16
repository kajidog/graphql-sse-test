// Subscription（SSE）の接続状態を保持する超軽量な外部ストア。
//
// React に依存しない単純な Pub/Sub にしておくことで、
//  - Apollo の Link / graphql-sse のイベント（React の外側）
//  - React コンポーネント（useSyncExternalStore）
// の両方から同じ状態を読み書きできるようにする。

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

let status: ConnectionStatus = "connecting";
const listeners = new Set<() => void>();

export function getConnectionStatus(): ConnectionStatus {
  return status;
}

export function setConnectionStatus(next: ConnectionStatus): void {
  if (status === next) return;
  status = next;
  for (const listener of listeners) listener();
}

export function subscribeConnectionStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
