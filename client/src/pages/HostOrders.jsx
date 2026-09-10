import React, { useEffect, useState } from "react";
import { Link } from "../router.jsx";
import { useApp } from "../context/AppContext.jsx";
import { api } from "../api.js";
import { Spinner, EmptyState, StatusBadge, PaymentBadge, Guard } from "../components/Bits.jsx";

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

function HostOrdersBody() {
    const { user, notify } = useApp();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);

    async function load() {
        setLoading(true);
        try {
            const data = await api.hostOrders();
            setOrders(data.orders);
        } catch (err) {
            notify(err.message, "error");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

    async function changeStatus(id, status) {
        setBusyId(id);
        try {
            await api.updateHostOrderStatus(id, status);
            notify("Order status updated.", "success");
            load();
        } catch (err) {
            notify(err.message, "error");
        } finally {
            setBusyId(null);
        }
    }

    if (loading) return <Spinner />;

    return (
        <main className="dashboard-page">
            <div className="page-heading">
                <p className="eyebrow">{user.role === "admin" ? "ALL ORDERS" : "ORDERS FOR YOUR PRODUCTS"}</p>
                <h1>Manage orders</h1>
            </div>
            <div className="host-quick-links">
                {user.role === "host" && <Link to="/host" className="ghost-button">Back to dashboard</Link>}
                {user.role === "admin" && <Link to="/admin" className="ghost-button">Back to admin</Link>}
            </div>
            {!orders.length ? <EmptyState>No orders yet.</EmptyState> : (
                <div className="order-list">
                    {orders.map((order) => (
                        <div className="order-card" key={order._id}>
                            <div className="order-card-head">
                                <div>
                                    <p className="order-id">Order #{order._id.slice(-8).toUpperCase()}</p>
                                    <p className="order-date">{order.user?.name} &middot; {new Date(order.createdAt).toLocaleString("en-IN")}</p>
                                </div>
                                <div className="order-badges"><StatusBadge status={order.status} /><PaymentBadge status={order.paymentStatus} /></div>
                            </div>
                            <ul className="order-items">
                                {order.items.map((item, idx) => (
                                    <li key={idx}>{item.name} &times; {item.quantity} &mdash; &#8377;{item.price * item.quantity}</li>
                                ))}
                            </ul>
                            <div className="order-card-foot">
                                <span>Deliver to {order.address?.name}, {order.address?.city}, {order.address?.state} {order.address?.pincode}</span>
                                <strong>&#8377;{order.total}</strong>
                            </div>
                            <div className="status-row">
                                <label>Update status
                                    <select disabled={busyId === order._id} value={order.status} onChange={(e) => changeStatus(order._id, e.target.value)}>
                                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}

export default function HostOrders() {
    const { user, booting } = useApp();
    return (
        <Guard allow={Boolean(user) && (user?.role === "host" || user?.role === "admin")} booting={booting} redirectTo="/">
            <HostOrdersBody />
        </Guard>
    );
}
