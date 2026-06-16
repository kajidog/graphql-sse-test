import { useState, useEffect, useRef } from "react";
import type { FormEvent } from "react";
import {
    useMessages,
    useSendMessage,
    useMessageSubscription,
} from "@/features/chat";
import {
    useConnectionStatus,
    onReconnected,
    type ConnectionStatus,
} from "@/lib/connectionStatus";
import styles from "./Chat.module.css";

// 接続状態ごとの表示内容（ラベルとCSSクラス）
const CONNECTION_DISPLAY: Record<
    ConnectionStatus,
    { label: string; className: string }
> = {
    connecting: { label: "接続中…", className: "statusConnecting" },
    connected: { label: "接続済み", className: "statusConnected" },
    reconnecting: { label: "再接続中…", className: "statusReconnecting" },
    disconnected: { label: "切断", className: "statusDisconnected" },
};

interface ChatProps {
    userId: string;
    nickname: string;
    onLogout: () => void;
}

const SESSION_ERROR_KEYWORDS = ["user not found", "unauthorized", "not logged in"];

// セッション無効エラーかどうかを判定
function isSessionError(error: Error | null): boolean {
    if (!error) return false;
    const message = error.message.toLowerCase();
    return SESSION_ERROR_KEYWORDS.some((keyword) => message.includes(keyword));
}

// 作成時刻の表示を統一する
function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function Chat({ userId, nickname, onLogout }: ChatProps) {
    const [newMessage, setNewMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const prevMessagesLengthRef = useRef(0);

    // Apollo Client hooks
    const { messages, loading: messagesLoading, error: messagesError, refetch } = useMessages();
    const { sendMessage, loading: sending, error: sendError } = useSendMessage();

    // SSE サブスクリプション（Apollo キャッシュを更新）
    useMessageSubscription();

    // SSE 接続状態（接続中／再接続中／切断 をヘッダーに表示）
    const connectionStatus = useConnectionStatus();
    const connectionDisplay = CONNECTION_DISPLAY[connectionStatus];

    // 再接続が成功したら、切断中に取りこぼしたメッセージを取得し直す
    useEffect(() => {
        return onReconnected(() => {
            refetch();
        });
    }, [refetch]);

    // セッションエラーを検知したら自動ログアウト
    useEffect(() => {
        const error = messagesError || sendError;
        if (isSessionError(error)) {
            setErrorMessage("セッションが無効になりました。再ログインしてください。");
            // 少し待ってからログアウト（ユーザーがメッセージを読めるように）
            const timer = setTimeout(() => {
                onLogout();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [messagesError, sendError, onLogout]);

    // メッセージが追加されたら末尾へスクロール
    useEffect(() => {
        if (messages.length > prevMessagesLengthRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
        prevMessagesLengthRef.current = messages.length;
    }, [messages.length]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        try {
            // 送信前に既存のエラー表示をクリア
            setErrorMessage(null);
            await sendMessage(newMessage.trim());
            setNewMessage("");
        } catch (err) {
            const error = err instanceof Error ? err : new Error("送信に失敗しました");
            if (isSessionError(error)) {
                setErrorMessage("セッションが無効になりました。再ログインしてください。");
                setTimeout(() => onLogout(), 2000);
            } else {
                setErrorMessage(error.message);
            }
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.headerTitle}>💬 チャットルーム</h1>
                <div className={styles.headerUser}>
                    <span
                        className={`${styles.connectionStatus} ${styles[connectionDisplay.className]}`}
                    >
                        <span className={styles.connectionDot} />
                        {connectionDisplay.label}
                    </span>
                    <span className={styles.userBadge}>👤 {nickname}</span>
                    <button className={styles.logoutButton} onClick={onLogout}>
                        ログアウト
                    </button>
                </div>
            </header>

            {errorMessage && (
                <div className={styles.errorBanner}>
                    <span>⚠️ {errorMessage}</span>
                    <button
                        className={styles.errorDismiss}
                        onClick={() => setErrorMessage(null)}
                    >
                        ✕
                    </button>
                </div>
            )}

            <div className={styles.messagesContainer}>
                {messagesLoading && messages.length === 0 ? (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyIcon}>⏳</span>
                        <p className={styles.emptyText}>読み込み中...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyIcon}>💬</span>
                        <p className={styles.emptyText}>
                            メッセージはまだありません。最初のメッセージを送信しましょう！
                        </p>
                    </div>
                ) : (
                    messages.map((message) => (
                        <div
                            key={message.id}
                            className={`${styles.message} ${message.user.id === userId
                                ? styles.messageOwn
                                : styles.messageOther
                                }`}
                        >
                            <div className={styles.messageHeader}>
                                <span className={styles.messageNickname}>
                                    {message.user.nickname}
                                </span>
                                <span className={styles.messageTime}>
                                    {formatTime(message.createdAt)}
                                </span>
                            </div>
                            <div className={styles.messageBubble}>{message.content}</div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputContainer}>
                <form className={styles.inputForm} onSubmit={handleSubmit}>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="メッセージを入力..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        disabled={sending}
                    />
                    <button
                        type="submit"
                        className={styles.sendButton}
                        disabled={sending || !newMessage.trim()}
                    >
                        {sending ? "送信中..." : "送信 ✈️"}
                    </button>
                </form>
            </div>
        </div>
    );
}
