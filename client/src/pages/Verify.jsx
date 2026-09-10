import React, { useState } from "react";
import { useRouter } from "../router.jsx";
import { useApp } from "../context/AppContext.jsx";
import { api } from "../api.js";

export default function Verify() {
    const { navigate, search } = useRouter();
    const { notify } = useApp();
    const initialEmail = new URLSearchParams(search).get("email") || "";
    const [email, setEmail] = useState(initialEmail);
    const [otp, setOtp] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [resendBusy, setResendBusy] = useState(false);

    async function onSubmit(event) {
        event.preventDefault();
        setError("");
        setBusy(true);
        try {
            await api.verify(email, otp);
            notify("Email verified. Please sign in.", "success");
            navigate("/login");
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function resend() {
        setError("");
        setResendBusy(true);
        try {
            await api.resendVerify(email);
            notify("A new OTP has been sent.", "success");
        } catch (err) {
            setError(err.message);
        } finally {
            setResendBusy(false);
        }
    }

    return (
        <main className="auth-page">
            <div className="auth-panel">
                <p className="eyebrow">VERIFY YOUR EMAIL</p>
                <h1>Check your inbox.</h1>
                <p>Enter the 6-digit OTP we sent to your email. If Brevo isn't configured on the server, the OTP is printed to the server console instead.</p>
                <form onSubmit={onSubmit}>
                    <input type="email" placeholder="Email address" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    <input inputMode="numeric" placeholder="6-digit OTP" required maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} />
                    {error && <p className="form-error">{error}</p>}
                    <button className="primary-button" type="submit" disabled={busy}>{busy ? "Verifying..." : "Verify email"} <span>&#8599;</span></button>
                </form>
                <button className="switch-link" onClick={resend} disabled={resendBusy}>{resendBusy ? "Sending..." : "Resend OTP"}</button>
            </div>
        </main>
    );
}
