import React from "react";
import { RouterProvider, useRouter } from "./router.jsx";
import { AppProvider } from "./context/AppContext.jsx";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";

import Home from "./pages/Home.jsx";
import Shop from "./pages/Shop.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import Cart from "./pages/Cart.jsx";
import Checkout from "./pages/Checkout.jsx";
import Orders from "./pages/Orders.jsx";
import Profile from "./pages/Profile.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Verify from "./pages/Verify.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import HostDashboard from "./pages/HostDashboard.jsx";
import HostProducts from "./pages/HostProducts.jsx";
import HostProductForm from "./pages/HostProductForm.jsx";
import HostOrders from "./pages/HostOrders.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import NotFound from "./pages/NotFound.jsx";

function matchRoute(pathname) {
    const segments = pathname.replace(/\/+$/, "") || "/";

    if (segments === "/") return { Page: Home };
    if (segments === "/shop") return { Page: Shop };
    if (segments === "/cart") return { Page: Cart };
    if (segments === "/checkout") return { Page: Checkout };
    if (segments === "/orders") return { Page: Orders };
    if (segments === "/profile") return { Page: Profile };
    if (segments === "/login") return { Page: Login };
    if (segments === "/register") return { Page: Register };
    if (segments === "/verify") return { Page: Verify };
    if (segments === "/forgot-password") return { Page: ForgotPassword };
    if (segments === "/reset-password") return { Page: ResetPassword };
    if (segments === "/host") return { Page: HostDashboard };
    if (segments === "/host/products") return { Page: HostProducts };
    if (segments === "/host/products/new") return { Page: HostProductForm, props: {} };
    if (segments === "/host/orders") return { Page: HostOrders };
    if (segments === "/admin") return { Page: AdminDashboard };

    let match = segments.match(/^\/product\/([^/]+)$/);
    if (match) return { Page: ProductDetail, props: { id: match[1] } };

    match = segments.match(/^\/host\/products\/([^/]+)\/edit$/);
    if (match) return { Page: HostProductForm, props: { id: match[1] } };

    return { Page: NotFound };
}

function Routes() {
    const { pathname } = useRouter();
    const { Page, props } = matchRoute(pathname);
    return <Page {...(props || {})} />;
}

function Shell() {
    return (
        <div className="app-shell">
            <Header />
            <Routes />
            <Footer />
        </div>
    );
}

export default function App() {
    return (
        <RouterProvider>
            <AppProvider>
                <Shell />
            </AppProvider>
        </RouterProvider>
    );
}
