import React, { useState } from "react";
import { Link, useRouter } from "../router.jsx";
import { useApp } from "../context/AppContext.jsx";

export default function Header() {
    const { user, cart, logout, notify } = useApp();
    const { navigate, pathname } = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);

    async function handleLogout() {
        await logout();
        setMenuOpen(false);
        navigate("/");
    }

    const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const is = (path) => pathname === path;

    return (
        <header className="topbar">
            <Link to="/" className="brand"><span className="brand-mark">M</span><span>Maison<span className="brand-muted"> Market</span></span></Link>

            <nav className="main-nav">
                <Link to="/" className={is("/") ? "active" : ""}>Discover</Link>
                <Link to="/shop" className={is("/shop") ? "active" : ""}>Shop all</Link>
                {user && (user.role === "host" || user.role === "admin") && (
                    <Link to="/host" className={pathname.startsWith("/host") ? "active" : ""}>Host studio</Link>
                )}
                {user && user.role === "admin" && (
                    <Link to="/admin" className={pathname.startsWith("/admin") ? "active" : ""}>Admin</Link>
                )}
            </nav>

            <div className="top-actions">
                <Link to="/cart" className="bag-button" aria-label="Cart">
                    Bag <span>{cartCount}</span>
                </Link>
                {user ? (
                    <>
                    <button className="header-logout" onClick={handleLogout}>Logout</button>
                    <div className="account-menu">
                        <button className="avatar" onClick={() => setMenuOpen((v) => !v)}>
                            {user.profileImage ? <img src={user.profileImage} alt={user.name} /> : (user.name?.[0] || "U")}
                        </button>
                        {menuOpen && (
                            <div className="dropdown" onMouseLeave={() => setMenuOpen(false)}>
                                <p className="dropdown-name">{user.name}</p>
                                <p className="dropdown-role">{user.role}</p>
                                <Link to="/profile" onClick={() => setMenuOpen(false)}>Edit profile</Link>
                                <Link to="/orders" onClick={() => setMenuOpen(false)}>My orders</Link>
                                {(user.role === "host" || user.role === "admin") && <Link to="/host" onClick={() => setMenuOpen(false)}>Host studio</Link>}
                                {user.role === "admin" && <Link to="/admin" onClick={() => setMenuOpen(false)}>Admin dashboard</Link>}
                                <button className="dropdown-logout" onClick={handleLogout}>Sign out</button>
                            </div>
                        )}
                    </div>
                    </>
                ) : (
                    <Link to="/login" className="login-link">Sign in</Link>
                )}
            </div>
        </header>
    );
}
