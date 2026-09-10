import React, { useEffect, useState } from "react";
import { useRouter } from "../router.jsx";
import { useApp } from "../context/AppContext.jsx";
import { api } from "../api.js";
import { Spinner, EmptyState, StatusBadge, PaymentBadge, Guard } from "../components/Bits.jsx";

function OrdersBody() {
    const { navigate } = useRouter();
    const { notify } = useApp();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.orders().then((data) => setOrders(data.orders)).catch((err) => notify(err.message, "error")).finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) return <Spinner />;

    return (
        <main className="orders-page">
            <div className="page-heading">
                <p className="eyebrow">ORDER HISTORY</p>
                <h1>Your orders</h1>
            </div>
            {!orders.length ? (
                <EmptyState>
                    <p>No orders yet.</p>
                    <button className="primary-button" onClick={() => navigate("/shop")}>Start shopping</button>
                </EmptyState>
            ) : (
                <div className="order-list">
                    {orders.map((order) => (
                        <div className="order-card" key={order._id}>
                            <div className="order-card-head">
                                <div>
                                    <p className="order-id">Order #{order._id.slice(-8).toUpperCase()}</p>
                                    <p className="order-date">{new Date(order.createdAt).toLocaleString("en-IN")}</p>
                                </div>
                                <div className="order-badges"><StatusBadge status={order.status} /><PaymentBadge status={order.paymentStatus} /></div>
                            </div>
                            <ul className="order-items">
                                {order.items.map((item, idx) => (
                                    <li key={idx}>{item.name} &times; {item.quantity} &mdash; &#8377;{item.price * item.quantity}</li>
                                ))}
                            </ul>
                            <div className="order-card-foot">
                                <span>Deliver to {order.address?.name}, {order.address?.city}</span>
                                <strong>&#8377;{order.total}</strong>
                            </div>
                            {["pending", "processing"].includes(order.paymentStatus) && order.paymentMethod === "razorpay" && (
                                <p className="order-note">Payment pending. If this stays pending, try checking out again.</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}

export default function Orders() {
    const { user, booting } = useApp();
    return (
        <Guard allow={Boolean(user)} booting={booting}>
            <OrdersBody />
        </Guard>
    );
}
