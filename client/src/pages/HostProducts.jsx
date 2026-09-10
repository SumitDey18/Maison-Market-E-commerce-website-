import React, { useEffect, useState } from "react";
import { Link } from "../router.jsx";
import { useApp } from "../context/AppContext.jsx";
import { api } from "../api.js";
import { Spinner, EmptyState, Guard } from "../components/Bits.jsx";

function HostProductsBody() {
    const { user, notify } = useApp();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    async function load() {
        setLoading(true);
        try {
            const data = await api.hostProducts();
            setProducts(data.products);
        } catch (err) {
            notify(err.message, "error");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

    async function remove(id) {
        if (!window.confirm("Delete this product? This cannot be undone.")) return;
        try {
            await api.deleteHostProduct(id);
            notify("Product deleted.", "success");
            load();
        } catch (err) {
            notify(err.message, "error");
        }
    }

    if (loading) return <Spinner />;

    return (
        <main className="dashboard-page">
            <div className="page-heading">
                <p className="eyebrow">{user.role === "admin" ? "ALL PRODUCTS" : "YOUR PRODUCTS"}</p>
                <h1>Manage products</h1>
            </div>
            <div className="host-quick-links">
                <Link to="/host/products/new" className="ghost-button">+ Add product</Link>
                {user.role === "host" && <Link to="/host" className="ghost-button">Back to dashboard</Link>}
                {user.role === "admin" && <Link to="/admin" className="ghost-button">Back to admin</Link>}
            </div>
            {!products.length ? <EmptyState>No products yet. Add your first one.</EmptyState> : (
                <table className="data-table">
                    <thead><tr><th></th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th>{user.role === "admin" && <th>Owner</th>}<th></th></tr></thead>
                    <tbody>
                        {products.map((product) => (
                            <tr key={product._id}>
                                <td><div className="table-thumb">{product.image && <img src={product.image} alt="" />}</div></td>
                                <td>{product.name}</td>
                                <td>{product.category}</td>
                                <td>&#8377;{product.price}</td>
                                <td>{product.quantity}</td>
                                {user.role === "admin" && <td>{product.owner?.name || "\u2014"}</td>}
                                <td className="table-actions">
                                    <Link to={`/host/products/${product._id}/edit`}>Edit</Link>
                                    <button className="remove-link" onClick={() => remove(product._id)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </main>
    );
}

export default function HostProducts() {
    const { user, booting } = useApp();
    return (
        <Guard allow={Boolean(user) && (user?.role === "host" || user?.role === "admin")} booting={booting} redirectTo="/">
            <HostProductsBody />
        </Guard>
    );
}
