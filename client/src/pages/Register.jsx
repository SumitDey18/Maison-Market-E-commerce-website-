import React, { useState } from "react";
import { Link, useRouter } from "../router.jsx";
import { useApp } from "../context/AppContext.jsx";
import { api } from "../api.js";

export default function Register() {
    const { navigate } = useRouter();
    const { notify } = useApp();
    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [image, setImage] = useState(null);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function onSubmit(event) {
        event.preventDefault();
        setError("");
        setBusy(true);
        try {
            const formData = new FormData();
            formData.append("name", form.name);
            formData.append("email", form.email);
            formData.append("password", form.password);
            if (image) formData.append("profileImage", image);
            await api.register(formData);
            notify("Account created. Check your email (or the server console) for your OTP.", "success");
            navigate(`/verify?email=${encodeURIComponent(form.email)}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="auth-page">
            <div className="auth-panel">
                <p className="eyebrow">MAISON MARKET</p>
                <h1>Make yourself at home.</h1>
                <p>Create an account for a more considered shopping experience.</p>
                <form onSubmit={onSubmit}>
                    <input placeholder="Your name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <input type="email" placeholder="Email address" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    <input type="password" minLength="6" placeholder="Password (min 6 characters)" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                    <label className="file-field">
                        <span>Profile photo (optional)</span>
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setImage(e.target.files?.[0] || null)} />
                    </label>
                    {error && <p className="form-error">{error}</p>}
                    <button className="primary-button" type="submit" disabled={busy}>{busy ? "Creating account..." : "Create account"} <span>&#8599;</span></button>
                </form>
                <div className="auth-divider"><span>OR</span></div>
                <a className="google-button" href={api.googleLoginUrl()}>
                    <span className="google-icon">G</span>
                    Continue with Google
                </a>
                <div className="auth-links">
                    <Link to="/login">Already have an account? Sign in</Link>
                </div>
            </div>
        </main>
    );
}
