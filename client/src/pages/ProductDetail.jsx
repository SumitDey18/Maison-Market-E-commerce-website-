import React, { useEffect, useState } from "react";
import { Link, useRouter } from "../router.jsx";
import { useApp } from "../context/AppContext.jsx";
import { api } from "../api.js";
import { Spinner } from "../components/Bits.jsx";

export default function ProductDetail({ id }) {
    const { navigate } = useRouter();
    const { user, refreshCart, notify } = useApp();
    const [product, setProduct] = useState(null);
    const [qty, setQty] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        setLoading(true);
        api.product(id)
            .then((data) => setProduct(data.product))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [id]);

    async function addToCart() {
        if (!user) return navigate("/login");
        try {
            await api.addToCart(product._id, qty);
            await refreshCart();
            notify(`${product.name} added to your bag.`, "success");
        } catch (err) {
            notify(err.message, "error");
        }
    }

    if (loading) return <Spinner />;
    if (error || !product) return <main className="empty"><p>{error || "Product not found."}</p><Link to="/shop" className="primary-button">Back to shop</Link></main>;

    const outOfStock = product.quantity <= 0;

    return (
        <main className="product-detail">
            <div className="detail-image">
                {product.image ? <img src={product.image} alt={product.name} /> : <span>{product.category?.slice(0, 1) || "M"}</span>}
            </div>
            <div className="detail-info">
                <p className="product-category">{product.category}</p>
                <h1>{product.name}</h1>
                <strong className="detail-price">&#8377;{Number(product.price).toLocaleString("en-IN")}</strong>
                <p className="detail-description">{product.description || "A considered addition to your everyday."}</p>
                <p className="detail-stock">{outOfStock ? "Out of stock" : `${product.quantity} in stock`}</p>
                {product.owner?.name && <p className="detail-owner">Sold by {product.owner.name}</p>}
                {!outOfStock && (
                    <div className="qty-row">
                        <button onClick={() => setQty((q) => Math.max(1, q - 1))}>-</button>
                        <span>{qty}</span>
                        <button onClick={() => setQty((q) => Math.min(product.quantity, q + 1))}>+</button>
                    </div>
                )}
                <button className="primary-button" disabled={outOfStock} onClick={addToCart}>{outOfStock ? "Unavailable" : "Add to bag"} <span>&#8599;</span></button>
            </div>
        </main>
    );
}
