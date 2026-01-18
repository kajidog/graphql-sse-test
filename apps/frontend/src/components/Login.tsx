import { useState } from "react";
import type { FormEvent } from "react";
import { useLogin, type AuthUser } from "@/features/auth";
import styles from "./Login.module.css";

interface LoginProps {
    onLogin: (user: AuthUser) => void;
}

export function Login({ onLogin }: LoginProps) {
    const [nickname, setNickname] = useState("");
    const { login, loading, error } = useLogin({
        onSuccess: onLogin,
    });

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!nickname.trim()) return;

        try {
            // 入力値を整形してログイン
            await login(nickname.trim());
        } catch {
            // エラーはフックで処理される
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>💬 チャット</h1>
                <p className={styles.subtitle}>ニックネームを入力して参加</p>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label} htmlFor="nickname">
                            ニックネーム
                        </label>
                        <input
                            id="nickname"
                            type="text"
                            className={styles.input}
                            placeholder="あなたの名前"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    {error && <p className={styles.error}>{error.message}</p>}

                    <button type="submit" className={styles.button} disabled={loading}>
                        {loading ? "ログイン中..." : "チャットに参加"}
                    </button>
                </form>
            </div>
        </div>
    );
}
