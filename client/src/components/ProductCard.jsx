import React from "react";
import { Link } from "../router.jsx";

export default function ProductCard({ product, onAdd }) {
    const outOfStock = Number(product.quantity) <= 0;
    return (
        <article className="product-card">
            <Link to={`/product/${product._id}`} className="product-image">
                {product.image ? <img src={product.image} alt={product.name} /> : <span>{product.category?.slice(0, 1) || "M"}</span>}
                {outOfStock && <span className="stock-flag">Sold out</span>}
            </Link>
            <button className="quick-add" disabled={outOfStock} onClick={() => onAdd(product)}>
                {outOfStock ? "Unavailable" : "+ Add"}
            </button>
            <div className="product-meta">
                <div>
                    <p className="product-category">{product.category || "Object"}</p>
                    <Link to={`/product/${product._id}`}><h3>{product.name}</h3></Link>
                </div>
                <strong>&#8377;{Number(product.price).toLocaleString("en-IN")}</strong>
            </div>
            <p className="product-description">{product.description || "A considered addition to your everyday."}</p>
        </article>
    );
}
