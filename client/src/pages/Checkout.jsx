import React, { useEffect, useState } from "react";
import { useRouter } from "../router.jsx";
import { useApp } from "../context/AppContext.jsx";
import { api } from "../api.js";
import { Spinner, Guard } from "../components/Bits.jsx";

function loadRazorpayScript() {
    return new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

function CheckoutBody() {
    const { navigate } = useRouter();
    const { user, refreshCart, notify } = useApp();
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [locating, setLocating] = useState(false);
    const [form, setForm] = useState({
        name: user?.name || "", phone: "", address: "", city: "", state: "", pincode: "",
        latitude: "", longitude: "", paymentMethod: "cod"
    });
    const [error, setError] = useState("");

    useEffect(() => {
        api.checkoutInfo()
            .then(setInfo)
            .catch((err) => { notify(err.message, "error"); navigate("/cart"); })
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function useMyLocation() {
        if (!navigator.geolocation) return notify("Geolocation is not supported in this browser.", "error");
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setForm((f) => ({ ...f, latitude: position.coords.latitude, longitude: position.coords.longitude }));
                setLocating(false);
                notify("Location captured.", "success");
            },
            () => { setLocating(false); notify("Could not get your location.", "error"); },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    }

    async function onSubmit(event) {
        event.preventDefault();
        setError("");
        setBusy(true);
        try {
            const result = await api.checkout(form);
            if (!result.paymentRequired) {
                await refreshCart();
                notify("Order placed. Pay on delivery.", "success");
                return navigate("/orders");
            }
            if (!result.razorpayOrder) {
                notify(result.reason || "Online payment is unavailable right now.", "error");
                return;
            }

            const ok = await loadRazorpayScript();
            if (!ok) { notify("Could not load Razorpay checkout.", "error"); return; }

            const rzp = new window.Razorpay({
                key: result.key,
                amount: result.razorpayOrder.amount,
                currency: result.razorpayOrder.currency,
                name: "Maison Market",
                description: `Order ${result.order._id}`,
                order_id: result.razorpayOrder.id,
                prefill: { name: form.name, contact: form.phone },
                theme: { color: "#1f2937" },
                handler: async (response) => {
                    try {
                        const verification = await api.verifyPayment(response);
                        if (verification.success) {
                            await refreshCart();
                            notify("Payment successful. Order confirmed.", "success");
                            navigate("/orders");
                        } else {
                            notify(verification.message || "Payment could not be verified.", "error");
                            navigate("/orders");
                        }
                    } catch (err) {
                        notify(err.message, "error");
                    }
                },
                modal: {
                    ondismiss: async () => {
                        await api.paymentFailed(result.razorpayOrder.id).catch(() => {});
                        notify("Payment cancelled.", "info");
                    }
                }
            });
            rzp.on("payment.failed", async () => {
                await api.paymentFailed(result.razorpayOrder.id).catch(() => {});
                notify("Payment failed. You can try again from your orders.", "error");
                navigate("/orders");
            });
            rzp.open();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    if (loading) return <Spinner />;

    return (
        <main className="checkout-page">
            <div className="page-heading">
                <p className="eyebrow">DELIVERY DETAILS</p>
                <h1>Checkout</h1>
            </div>
            <div className="checkout-layout">
                <form className="checkout-form" onSubmit={onSubmit}>
                    <input placeholder="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <input placeholder="Phone number" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    <input placeholder="Address" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    <div className="form-row">
                        <input placeholder="City" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                        <input placeholder="State" required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                        <input placeholder="Pincode" required value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
                    </div>
                    <button type="button" className="switch-link" onClick={useMyLocation} disabled={locating}>
                        {locating ? "Locating..." : form.latitude ? "Location captured \u2713" : "Use my current location"}
                    </button>

                    <p className="field-label">Payment method</p>
                    <div className="payment-options">
                        <label className={form.paymentMethod === "cod" ? "selected" : ""}>
                            <input type="radio" name="paymentMethod" value="cod" checked={form.paymentMethod === "cod"} onChange={() => setForm({ ...form, paymentMethod: "cod" })} />
                            Cash on delivery
                        </label>
                        <label className={form.paymentMethod === "razorpay" ? "selected" : ""}>
                            <input type="radio" name="paymentMethod" value="razorpay" checked={form.paymentMethod === "razorpay"} onChange={() => setForm({ ...form, paymentMethod: "razorpay" })} disabled={!info?.razorpayAvailable} />
                            Pay online (Razorpay){!info?.razorpayAvailable && " \u2014 not configured"}
                        </label>
                    </div>

                    {error && <p className="form-error">{error}</p>}
                    <button className="primary-button" type="submit" disabled={busy}>{busy ? "Placing order..." : "Place order"} <span>&#8599;</span></button>
                </form>
                <aside className="summary">
                    <p className="eyebrow">ORDER TOTAL</p>
                    <div><span>Subtotal</span><strong>&#8377;{info?.total}</strong></div>
                    <div><span>Delivery</span><span>Free</span></div>
                    <div className="summary-total"><span>Total</span><strong>&#8377;{info?.total}</strong></div>
                </aside>
            </div>
        </main>
    );
}

export default function Checkout() {
    const { user, booting } = useApp();
    return (
        <Guard allow={Boolean(user)} booting={booting}>
            <CheckoutBody />
        </Guard>
    );
}
