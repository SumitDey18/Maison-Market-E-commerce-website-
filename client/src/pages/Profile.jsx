import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "../router.jsx";
import { api } from "../api.js";
import { useApp } from "../context/AppContext.jsx";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Profile() {
    const { user, setUser, notify } = useApp();
    const { navigate } = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState("");
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const fileRef = useRef(null);
    const objectUrlRef = useRef("");

    useEffect(() => {
        let cancelled = false;

        async function loadProfile() {
            if (!user) {
                navigate("/login");
                return;
            }

            try {
                // Always fetch the latest profile so the form is not using stale session data.
                const data = await api.profile();
                if (cancelled) return;
                const latest = data.user;
                setUser(latest);
                setName(latest.name || "");
                setEmail(latest.email || "");
                setPreview(latest.profileImage || "");
            } catch (error) {
                if (!cancelled) notify(error.message, "error");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadProfile();
        return () => {
            cancelled = true;
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        };
    }, []); // Load once when the Edit Profile page opens.

    function chooseImage(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
            notify("Please choose a JPG, JPEG, PNG or WEBP image.", "error");
            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            notify("Image must be smaller than 5 MB.", "error");
            event.target.value = "";
            return;
        }

        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = URL.createObjectURL(file);
        setImage(file);
        setPreview(objectUrlRef.current);
    }

    async function save(event) {
        event.preventDefault();

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (!cleanName) return notify("Name is required.", "error");
        if (!EMAIL_RE.test(cleanEmail)) return notify("Please enter a valid email address.", "error");

        setSaving(true);
        try {
            const formData = new FormData();
            formData.append("name", cleanName);
            formData.append("email", cleanEmail);
            if (image) formData.append("profileImage", image);

            const data = await api.updateProfile(formData);
            setUser(data.user);
            setName(data.user.name || "");
            setEmail(data.user.email || "");
            setPreview(data.user.profileImage || "");
            setImage(null);

            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = "";
            }
            if (fileRef.current) fileRef.current.value = "";

            notify("Profile updated successfully.", "success");
        } catch (error) {
            notify(error.message, "error");
        } finally {
            setSaving(false);
        }
    }

    async function handleLogout() {
        try {
            await api.logout();
            setUser(null);
            notify("Signed out.", "info");
            navigate("/");
        } catch (error) {
            notify(error.message, "error");
        }
    }

    if (!user || loading) {
        return loading ? (
            <main className="page profile-page">
                <section className="profile-card"><p className="muted">Loading profile…</p></section>
            </main>
        ) : null;
    }

    return (
        <main className="page profile-page">
            <section className="profile-card">
                <div className="profile-heading">
                    <div>
                        <p className="eyebrow">Account</p>
                        <h1>Edit profile</h1>
                        <p className="muted">Update your name, email address and profile picture.</p>
                    </div>
                </div>

                <form className="profile-form" onSubmit={save}>
                    <div className="profile-photo-editor">
                        <div className="profile-preview">
                            {preview ? <img src={preview} alt="Profile preview" /> : (name?.[0]?.toUpperCase() || "U")}
                        </div>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={chooseImage}
                            hidden
                        />
                        <button type="button" className="secondary-button" onClick={() => fileRef.current?.click()}>
                            {preview ? "Change picture" : "Add picture"}
                        </button>
                        <small>JPG, PNG or WEBP · max 5 MB</small>
                    </div>

                    <label>
                        Name
                        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
                    </label>

                    <label>
                        Email
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            maxLength={160}
                            autoComplete="email"
                            required
                        />
                    </label>

                    <label>
                        Role
                        <input value={user.role || "customer"} readOnly />
                    </label>

                    <div className="profile-actions">
                        <button type="button" className="secondary-button" onClick={() => navigate("/")}>Cancel</button>
                        <button type="button" className="secondary-button" onClick={handleLogout}>Logout</button>
                        <button type="submit" className="primary-button" disabled={saving}>
                            {saving ? "Saving…" : "Save changes"}
                        </button>
                    </div>
                </form>
            </section>
        </main>
    );
}
