import { useSyncExternalStore } from "react";
import {
  getConnectionStatus,
  subscribeConnectionStatus,
  type ConnectionStatus,
} from "@/lib/connectionStatus";

/**
 * Subscription（SSE）の接続状態を React から購読する。
 * connecting / connected / disconnected のいずれかを返す。
 */
export function useConnectionStatus(): ConnectionStatus {
  return useSyncExternalStore(subscribeConnectionStatus, getConnectionStatus);
}
