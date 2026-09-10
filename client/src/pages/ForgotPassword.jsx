import React, { useState } from "react";
import { Link, useRouter } from "../router.jsx";
import { api } from "../api.js";

export default function ForgotPassword() {
    const { navigate } = useRouter();
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function onSubmit(event) {
        event.preventDefault();
        setError("");
        setBusy(true);
        try {
            await api.forgotPassword(email);
            navigate(`/reset-password?email=${encodeURIComponent(email)}`);
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
                <h1>Forgot password?</h1>
                <p>Enter your account email and we'll send a one-time code to reset it.</p>
                <form onSubmit={onSubmit}>
                    <input type="email" placeholder="Email address" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    {error && <p className="form-error">{error}</p>}
                    <button className="primary-button" type="submit" disabled={busy}>{busy ? "Sending..." : "Send OTP"} <span>&#8599;</span></button>
                </form>
                <div className="auth-links">
                    <Link to="/login">Back to sign in</Link>
                </div>
            </div>
        </main>
    );
}
