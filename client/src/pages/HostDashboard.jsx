import React, { useEffect, useState } from "react";
import { Link } from "../router.jsx";
import { useApp } from "../context/AppContext.jsx";
import { api } from "../api.js";
import { Spinner, EmptyState, Guard } from "../components/Bits.jsx";

function HostDashboardBody() {
    const { notify } = useApp();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.hostDashboard().then(setData).catch((err) => notify(err.message, "error")).finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) return <Spinner />;
    if (!data) return null;

    return (
        <main className="dashboard-page">
            <div className="page-heading">
                <p className="eyebrow">HOST STUDIO</p>
                <h1>Welcome, {data.user?.name}.</h1>
            </div>

            <div className="stat-grid">
                <div className="stat-card"><span>Today's sales</span><strong>&#8377;{data.todaySales}</strong></div>
                <div className="stat-card"><span>Total sales</span><strong>&#8377;{data.totalSales}</strong></div>
                <div className="stat-card"><span>Since</span><strong>{data.history?.[0]?.date || data.today}</strong></div>
            </div>

            <div className="host-quick-links">
                <Link to="/host/products" className="ghost-button">Manage products</Link>
                <Link to="/host/products/new" className="ghost-button">+ Add product</Link>
                <Link to="/host/orders" className="ghost-button">Manage orders</Link>
            </div>

            <h2 className="section-title">Daily sales history</h2>
            {!data.history?.length ? <EmptyState>No sales recorded yet.</EmptyState> : (
                <table className="data-table">
                    <thead><tr><th>Date</th><th>Sales</th></tr></thead>
                    <tbody>
                        {data.history.slice().reverse().map((row) => (
                            <tr key={row.date} className={row.date === data.today ? "current-row" : ""}>
                                <td>{row.date}</td>
                                <td>&#8377;{row.total}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </main>
    );
}

export default function HostDashboard() {
    const { user, booting } = useApp();
    if (!booting && user?.role === "admin") {
        return (
            <main className="empty">
                <p>Admins manage sales from the admin dashboard.</p>
                <Link to="/admin" className="primary-button">Go to admin dashboard</Link>
            </main>
        );
    }
    return (
        <Guard allow={Boolean(user) && user?.role === "host"} booting={booting} redirectTo="/">
            <HostDashboardBody />
        </Guard>
    );
}
