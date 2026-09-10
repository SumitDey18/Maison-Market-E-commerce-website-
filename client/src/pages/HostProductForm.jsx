import React, { useEffect, useState } from "react";
import { useRouter } from "../router.jsx";
import { useApp } from "../context/AppContext.jsx";
import { api } from "../api.js";
import { Spinner, Guard } from "../components/Bits.jsx";

const CATEGORIES = ["Electronics", "Clothing", "Footwear", "Bags", "Home", "Accessories", "Beauty", "Sports", "Books", "Other"];

function HostProductFormBody({ id }) {
    const { navigate } = useRouter();
    const { notify } = useApp();
    const isEdit = Boolean(id);
    const [form, setForm] = useState({ name: "", category: "Electronics", price: "", quantity: "", description: "" });
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(isEdit);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isEdit) return;
        api.product(id)
            .then((data) => setForm({
                name: data.product.name,
                category: data.product.category,
                price: data.product.price,
                quantity: data.product.quantity,
                description: data.product.description || ""
            }))
            .catch((err) => notify(err.message, "error"))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    async function onSubmit(event) {
        event.preventDefault();
        setError("");
        setBusy(true);
        try {
            if (isEdit) {
                const formData = new FormData();
                Object.entries(form).forEach(([key, value]) => formData.append(key, value));
                if (image) formData.append("image", image);
                await api.updateHostProduct(id, formData);
                notify("Product updated.", "success");
            } else {
                if (!image) { setError("Product image is required."); setBusy(false); return; }
                const formData = new FormData();
                Object.entries(form).forEach(([key, value]) => formData.append(key, value));
                formData.append("image", image);
                await api.createHostProduct(formData);
                notify("Product created.", "success");
            }
            navigate("/host/products");
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    if (loading) return <Spinner />;

    return (
        <main className="dashboard-page narrow">
            <div className="page-heading">
                <p className="eyebrow">{isEdit ? "EDIT PRODUCT" : "NEW PRODUCT"}</p>
                <h1>{isEdit ? "Update product" : "Add a product"}</h1>
            </div>
            <form className="checkout-form" onSubmit={onSubmit}>
                <input placeholder="Product name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="form-row">
                    <input type="number" min="0" step="0.01" placeholder="Price (INR)" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                    <input type="number" min="0" step="1" placeholder="Stock quantity" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <textarea placeholder="Description" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <label className="file-field">
                    <span>{isEdit ? "Product image (optional — choose a new image to replace the current one)" : "Product image (required)"}</span>
                    <input type="file" accept="image/png,image/jpeg,image/webp" required={!isEdit} onChange={(e) => setImage(e.target.files?.[0] || null)} />
                </label>
                {error && <p className="form-error">{error}</p>}
                <button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving..." : isEdit ? "Save changes" : "Create product"} <span>&#8599;</span></button>
            </form>
        </main>
    );
}

export default function HostProductForm({ id }) {
    const { user, booting } = useApp();
    return (
        <Guard allow={Boolean(user) && (user?.role === "host" || user?.role === "admin")} booting={booting} redirectTo="/">
            <HostProductFormBody id={id} />
        </Guard>
    );
}
