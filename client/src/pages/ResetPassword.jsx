import React, { useState } from "react";
import { useRouter } from "../router.jsx";
import { useApp } from "../context/AppContext.jsx";
import { api } from "../api.js";

export default function ResetPassword() {
    const { navigate, search } = useRouter();
    const { notify } = useApp();
    const initialEmail = new URLSearchParams(search).get("email") || "";
    const [form, setForm] = useState({ email: initialEmail, otp: "", password: "", confirmPassword: "" });
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function onSubmit(event) {
        event.preventDefault();
        setError("");
        setBusy(true);
        try {
            await api.resetPassword(form);
            notify("Password updated. Please sign in.", "success");
            navigate("/login");
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="auth-page">
            <div className="auth-panel">
                <p className="eyebrow">RESET YOUR PASSWORD</p>
                <h1>Almost there.</h1>
                <p>Enter the OTP you received along with your new password.</p>
                <form onSubmit={onSubmit}>
                    <input type="email" placeholder="Email address" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    <input inputMode="numeric" placeholder="6-digit OTP" required maxLength={6} value={form.otp} onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, "") })} />
                    <input type="password" minLength="6" placeholder="New password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                    <input type="password" minLength="6" placeholder="Confirm new password" required value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
                    {error && <p className="form-error">{error}</p>}
                    <button className="primary-button" type="submit" disabled={busy}>{busy ? "Updating..." : "Update password"} <span>&#8599;</span></button>
                </form>
            </div>
        </main>
    );
}
