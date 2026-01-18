import { useState, useEffect } from "react";
import { ApolloProvider } from "@apollo/client";
import { apolloClient, setCurrentUserId } from "@/lib/apollo";
import { Login } from "./components/Login";
import { Chat } from "./components/Chat";
import type { AuthUser } from "@/features/auth";

const STORAGE_KEY = "chatUser";

function loadUserFromStorage(): AuthUser | null {
  const savedUser = localStorage.getItem(STORAGE_KEY);
  if (!savedUser) return null;

  try {
    return JSON.parse(savedUser) as AuthUser;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function saveUserToStorage(user: AuthUser): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

function clearUserFromStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);

  // ローカルストレージからユーザー情報を復元
  useEffect(() => {
    const restoredUser = loadUserFromStorage();
    if (restoredUser) {
      setUser(restoredUser);
      setCurrentUserId(restoredUser.id);
    }
  }, []);

  const handleLogin = (loggedInUser: AuthUser) => {
    // 認証情報を状態とストレージに保持
    setUser(loggedInUser);
    setCurrentUserId(loggedInUser.id);
    saveUserToStorage(loggedInUser);
  };

  const handleLogout = () => {
    // 認証情報をクリアし、UIをログイン画面に戻す
    setUser(null);
    setCurrentUserId(null);
    clearUserFromStorage();
  };

  return (
    <ApolloProvider client={apolloClient}>
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Chat
          userId={user.id}
          nickname={user.nickname}
          onLogout={handleLogout}
        />
      )}
    </ApolloProvider>
  );
}

export default App;
