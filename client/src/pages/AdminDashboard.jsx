import React, { useEffect, useState } from "react";
import { Link } from "../router.jsx";
import { useApp } from "../context/AppContext.jsx";
import { api } from "../api.js";
import { Spinner, EmptyState, StatusBadge, PaymentBadge, Guard } from "../components/Bits.jsx";

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const ROLES = ["customer", "host", "admin"];
const TABS = ["Overview", "Users", "Products", "Orders", "Sales history"];

function AdminDashboardBody() {
    const { user, notify } = useApp();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("Overview");
    const [busyId, setBusyId] = useState(null);
    const [selectedDate, setSelectedDate] = useState("");

    async function load(date) {
        setLoading(true);
        try {
            const result = await api.adminDashboard(date);
            setData(result);
            if (!date) setSelectedDate(result.selectedDate);
        } catch (err) {
            notify(err.message, "error");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

    async function changeRole(id, role) {
        setBusyId(id);
        try {
            await api.updateUserRole(id, role);
            notify("Role updated.", "success");
            load(selectedDate);
        } catch (err) {
            notify(err.message, "error");
        } finally {
            setBusyId(null);
        }
    }

    async function changeOrderStatus(id, status) {
        setBusyId(id);
        try {
            await api.updateAdminOrderStatus(id, status);
            notify("Order status updated.", "success");
            load(selectedDate);
        } catch (err) {
            notify(err.message, "error");
        } finally {
            setBusyId(null);
        }
    }

    async function refund(id) {
        if (!window.confirm("Refund this order via Razorpay?")) return;
        setBusyId(id);
        try {
            await api.refundOrder(id);
            notify("Refund processed.", "success");
            load(selectedDate);
        } catch (err) {
            notify(err.message, "error");
        } finally {
            setBusyId(null);
        }
    }

    if (loading || !data) return <Spinner />;

    return (
        <main className="dashboard-page">
            <div className="page-heading">
                <p className="eyebrow">ADMIN</p>
                <h1>Welcome, {user.name}.</h1>
            </div>

            <div className="stat-grid">
                <div className="stat-card"><span>Users</span><strong>{data.stats.users}</strong></div>
                <div className="stat-card"><span>Products</span><strong>{data.stats.products}</strong></div>
                <div className="stat-card"><span>Orders</span><strong>{data.stats.orders}</strong></div>
                <div className="stat-card"><span>Total sales</span><strong>&#8377;{data.stats.sales}</strong></div>
                <div className="stat-card"><span>Today's sales</span><strong>&#8377;{data.stats.todaySales}</strong></div>
                <div className="stat-card"><span>Pending</span><strong>{data.stats.pending}</strong></div>
                <div className="stat-card"><span>Delivered</span><strong>{data.stats.delivered}</strong></div>
                <div className="stat-card"><span>Cancelled</span><strong>{data.stats.cancelled}</strong></div>
            </div>

            <div className="tab-row">
                {TABS.map((t) => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>)}
            </div>

            {tab === "Overview" && (
                <div className="admin-overview">
                    <p>Sales for <strong>{data.selectedDate}</strong>: &#8377;{data.selectedSales.total}</p>
                    <div className="host-quick-links">
                        <Link to="/host/products/new" className="ghost-button">+ Add product</Link>
                        <Link to="/host/products" className="ghost-button">Manage products</Link>
                        <Link to="/host/orders" className="ghost-button">Manage all orders</Link>
                    </div>
                    <h2 className="section-title">Sales by host ({data.selectedDate})</h2>
                    {!data.selectedSales.hosts.length ? <EmptyState>No hosts yet.</EmptyState> : (
                        <table className="data-table">
                            <thead><tr><th>Host</th><th>Email</th><th>Sales</th></tr></thead>
                            <tbody>
                                {data.selectedSales.hosts.map((h) => (
                                    <tr key={h.id}><td>{h.name}</td><td>{h.email}</td><td>&#8377;{h.total}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {tab === "Users" && (
                <table className="data-table">
                    <thead><tr><th>Name</th><th>Email</th><th>Verified</th><th>Role</th></tr></thead>
                    <tbody>
                        {data.users.map((u) => (
                            <tr key={u._id}>
                                <td>{u.name}</td>
                                <td>{u.email}</td>
                                <td>{u.isVerified ? "Yes" : "No"}</td>
                                <td>
                                    <select disabled={busyId === u._id} value={u.role} onChange={(e) => changeRole(u._id, e.target.value)}>
                                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {tab === "Products" && (
                <div>
                    <div className="host-quick-links">
                        <Link to="/host/products/new" className="ghost-button">+ Add product</Link>
                        <Link to="/host/products" className="ghost-button">Open full product manager</Link>
                    </div>
                    {!data.products.length ? <EmptyState>No products yet.</EmptyState> : (
                        <table className="data-table">
                            <thead><tr><th></th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Owner</th><th></th></tr></thead>
                            <tbody>
                                {data.products.map((p) => (
                                    <tr key={p._id}>
                                        <td><div className="table-thumb">{p.image && <img src={p.image} alt="" />}</div></td>
                                        <td>{p.name}</td>
                                        <td>{p.category}</td>
                                        <td>&#8377;{p.price}</td>
                                        <td>{p.quantity}</td>
                                        <td>{p.owner?.name} ({p.owner?.role})</td>
                                        <td><Link to={`/host/products/${p._id}/edit`}>Edit</Link></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {tab === "Orders" && (
                <div className="order-list">
                    {data.orders.map((order) => (
                        <div className="order-card" key={order._id}>
                            <div className="order-card-head">
                                <div>
                                    <p className="order-id">Order #{order._id.slice(-8).toUpperCase()}</p>
                                    <p className="order-date">{order.user?.name} &middot; {new Date(order.createdAt).toLocaleString("en-IN")}</p>
                                </div>
                                <div className="order-badges"><StatusBadge status={order.status} /><PaymentBadge status={order.paymentStatus} /></div>
                            </div>
                            <ul className="order-items">
                                {order.items.map((item, idx) => <li key={idx}>{item.name} &times; {item.quantity} &mdash; &#8377;{item.price * item.quantity}</li>)}
                            </ul>
                            <div className="order-card-foot"><span>Total</span><strong>&#8377;{order.total}</strong></div>
                            <div className="status-row">
                                <label>Update status
                                    <select disabled={busyId === order._id} value={order.status} onChange={(e) => changeOrderStatus(order._id, e.target.value)}>
                                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </label>
                                {order.paymentStatus === "paid" && !order.refundId && (
                                    <button className="ghost-button" disabled={busyId === order._id} onClick={() => refund(order._id)}>Refund</button>
                                )}
                                {order.refundId && <span className="order-note">Refunded</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {tab === "Sales history" && (
                <div>
                    <label className="field-label">Pick a date
                        <input type="date" value={selectedDate} max={data.today} onChange={(e) => { setSelectedDate(e.target.value); load(e.target.value); }} />
                    </label>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                {data.historyHosts.map((h) => <th key={h.id}>{h.name}</th>)}
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.history.slice().reverse().map((row) => (
                                <tr key={row.date} className={row.date === data.today ? "current-row" : ""}>
                                    <td>{row.date}</td>
                                    {data.historyHosts.map((h) => <td key={h.id}>&#8377;{row.hosts[h.id] || 0}</td>)}
                                    <td><strong>&#8377;{row.total}</strong></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
}

export default function AdminDashboard() {
    const { user, booting } = useApp();
    return (
        <Guard allow={Boolean(user) && user?.role === "admin"} booting={booting} redirectTo="/">
            <AdminDashboardBody />
        </Guard>
    );
}
