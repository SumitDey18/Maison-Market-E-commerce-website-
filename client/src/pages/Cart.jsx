import React, { useEffect, useState } from "react";
import { useRouter } from "../router.jsx";
import { useApp } from "../context/AppContext.jsx";
import { api } from "../api.js";
import { Spinner, EmptyState, Guard } from "../components/Bits.jsx";

function CartBody() {
    const { navigate } = useRouter();
    const { cart, setCart, refreshCart, notify } = useApp();
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);

    useEffect(() => {
        refreshCart().finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function changeQty(productId, quantity) {
        setBusyId(productId);
        try {
            const data = await api.updateCart(productId, quantity);
            setCart(data);
        } catch (err) {
            notify(err.message, "error");
        } finally {
            setBusyId(null);
        }
    }

    async function remove(productId) {
        setBusyId(productId);
        try {
            const data = await api.removeFromCart(productId);
            setCart(data);
        } catch (err) {
            notify(err.message, "error");
        } finally {
            setBusyId(null);
        }
    }

    if (loading) return <Spinner />;

    return (
        <main className="cart-page">
            <div className="page-heading">
                <p className="eyebrow">YOUR SELECTION</p>
                <h1>Your bag <span>{cart.items.length} item{cart.items.length === 1 ? "" : "s"}</span></h1>
            </div>
            {!cart.items.length ? (
                <EmptyState>
                    <p>Your bag is waiting for something lovely.</p>
                    <button className="primary-button" onClick={() => navigate("/shop")}>Continue shopping</button>
                </EmptyState>
            ) : (
                <div className="cart-layout">
                    <section>
                        {cart.items.map((item) => (
                            <div className="cart-row" key={item.product._id}>
                                <div className="cart-thumb">{item.product.image && <img src={item.product.image} alt="" />}</div>
                                <div className="cart-row-info">
                                    <h3>{item.product.name}</h3>
                                    <p>&#8377;{item.product.price} each &middot; {item.product.quantity} in stock</p>
                                    <div className="qty-row small">
                                        <button disabled={busyId === item.product._id} onClick={() => changeQty(item.product._id, item.quantity - 1)}>-</button>
                                        <span>{item.quantity}</span>
                                        <button disabled={busyId === item.product._id} onClick={() => changeQty(item.product._id, item.quantity + 1)}>+</button>
                                    </div>
                                </div>
                                <strong>&#8377;{item.product.price * item.quantity}</strong>
                                <button className="remove-link" disabled={busyId === item.product._id} onClick={() => remove(item.product._id)}>Remove</button>
                            </div>
                        ))}
                    </section>
                    <aside className="summary">
                        <p className="eyebrow">ORDER SUMMARY</p>
                        <div><span>Subtotal</span><strong>&#8377;{cart.total}</strong></div>
                        <div><span>Delivery</span><span>Calculated at checkout</span></div>
                        <button className="primary-button" onClick={() => navigate("/checkout")}>Checkout <span>&#8599;</span></button>
                    </aside>
                </div>
            )}
        </main>
    );
}

export default function Cart() {
    const { user, booting } = useApp();
    return (
        <Guard allow={Boolean(user)} booting={booting}>
            <CartBody />
        </Guard>
    );
}
