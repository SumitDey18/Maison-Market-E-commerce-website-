import React, { useState } from "react";
import { Link, useRouter } from "../router.jsx";
import { useApp } from "../context/AppContext.jsx";
import { api } from "../api.js";

export default function Login() {
    const { navigate } = useRouter();
    const { refreshSession, notify } = useApp();
    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function onSubmit(event) {
        event.preventDefault();
        setError("");
        setBusy(true);
        try {
            await api.login(form.email, form.password);
            const sessionUser = await refreshSession();
            notify(`Welcome back, ${sessionUser?.name || ""}.`, "success");
            if (sessionUser?.role === "admin") navigate("/admin");
            else if (sessionUser?.role === "host") navigate("/host");
            else navigate("/shop");
        } catch (err) {
            if (err.data?.needsVerification) {
                notify("Please verify your email first.", "info");
                navigate(`/verify?email=${encodeURIComponent(err.data.email || form.email)}`);
                return;
            }
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="auth-page">
            <div className="auth-panel">
                <p className="eyebrow">MAISON MARKET</p>
                <h1>Welcome back.</h1>
                <p>Sign in to pick up where you left off.</p>
                <form onSubmit={onSubmit}>
                    <input type="email" placeholder="Email address" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    <input type="password" placeholder="Password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                    {error && <p className="form-error">{error}</p>}
                    <button className="primary-button" type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign in"} <span>&#8599;</span></button>
                </form>
                <a className="switch-link" href={api.googleLoginUrl()}>Continue with Google</a>
                <div className="auth-links">
                    <Link to="/forgot-password">Forgot password?</Link>
                    <Link to="/register">Need an account? Create one</Link>
                </div>
            </div>
        </main>
    );
}
