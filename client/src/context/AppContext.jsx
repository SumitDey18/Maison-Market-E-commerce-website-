import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "../api.js";

const AppContext = createContext(null);

export function AppProvider({ children }) {
    const [user, setUser] = useState(null);
    const [cart, setCart] = useState({ items: [], total: 0 });
    const [booting, setBooting] = useState(true);
    const [toasts, setToasts] = useState([]);
    const toastId = useRef(0);

    const notify = useCallback((message, tone = "info") => {
        if (!message) return;
        const id = ++toastId.current;
        setToasts((list) => [...list, { id, message, tone }]);
        setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4200);
    }, []);

    const refreshCart = useCallback(async () => {
        try {
            const data = await api.cart();
            setCart(data);
        } catch {
            setCart({ items: [], total: 0 });
        }
    }, []);

    const refreshSession = useCallback(async () => {
        const { user: sessionUser } = await api.session();
        setUser(sessionUser);
        if (sessionUser) await refreshCart();
        else setCart({ items: [], total: 0 });
        return sessionUser;
    }, [refreshCart]);

    useEffect(() => {
        refreshSession().finally(() => setBooting(false));
    }, [refreshSession]);

    const logout = useCallback(async () => {
        await api.logout();
        setUser(null);
        setCart({ items: [], total: 0 });
        notify("Signed out.", "info");
    }, [notify]);

    return (
        <AppContext.Provider value={{ user, setUser, cart, setCart, refreshCart, refreshSession, booting, notify, logout }}>
            {children}
            <div className="toast-stack">
                {toasts.map((toast) => (
                    <div key={toast.id} className={`toast toast-${toast.tone}`}>{toast.message}</div>
                ))}
            </div>
        </AppContext.Provider>
    );
}

export function useApp() {
    return useContext(AppContext);
}
