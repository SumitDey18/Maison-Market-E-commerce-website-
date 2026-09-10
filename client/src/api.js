const BASE = "/api";

async function request(url, options = {}) {
    const isForm = options.body instanceof FormData;
    const response = await fetch(BASE + url, {
        credentials: "same-origin",
        ...options,
        headers: isForm ? (options.headers || {}) : { "content-type": "application/json", ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.message || "Something went wrong.");
        error.status = response.status;
        error.data = data;
        throw error;
    }
    return data;
}

export const api = {
    // auth
    session: () => request("/auth/session"),
    profile: () => request("/auth/profile"),
    updateProfile: (formData) => request("/auth/profile", { method: "PUT", body: formData }),
    register: (formData) => request("/auth/register", { method: "POST", body: formData }),
    verify: (email, otp) => request("/auth/verify", { method: "POST", body: JSON.stringify({ email, otp }) }),
    resendVerify: (email) => request("/auth/verify/resend", { method: "POST", body: JSON.stringify({ email }) }),
    login: (email, password) => request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    logout: () => request("/auth/logout", { method: "POST" }),
    forgotPassword: (email) => request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
    resetPassword: (payload) => request("/auth/reset-password", { method: "POST", body: JSON.stringify(payload) }),
    googleLoginUrl: () => BASE + "/auth/google",

    // catalog
    categories: () => request("/categories"),
    products: (params = {}) => {
        const query = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null)));
        return request(`/products?${query.toString()}`);
    },
    product: (id) => request(`/products/${id}`),

    // cart
    cart: () => request("/cart"),
    addToCart: (id, quantity = 1) => request(`/cart/${id}`, { method: "POST", body: JSON.stringify({ quantity }) }),
    updateCart: (id, quantity) => request(`/cart/${id}`, { method: "PUT", body: JSON.stringify({ quantity }) }),
    removeFromCart: (id) => request(`/cart/${id}`, { method: "DELETE" }),

    // checkout / orders
    checkoutInfo: () => request("/checkout"),
    checkout: (payload) => request("/checkout", { method: "POST", body: JSON.stringify(payload) }),
    verifyPayment: (payload) => request("/payment/verify", { method: "POST", body: JSON.stringify(payload) }),
    paymentFailed: (razorpay_order_id) => request("/payment/failed", { method: "POST", body: JSON.stringify({ razorpay_order_id }) }),
    cancelPayment: (orderId) => request(`/payment/cancel/${orderId}`, { method: "POST" }),
    orders: () => request("/orders"),

    // host
    hostDashboard: () => request("/host/dashboard"),
    hostProducts: () => request("/host/products"),
    createHostProduct: (formData) => request("/host/products", { method: "POST", body: formData }),
    updateHostProduct: (id, payload) => request(`/host/products/${id}`, { method: "PUT", body: payload }),
    deleteHostProduct: (id) => request(`/host/products/${id}`, { method: "DELETE" }),
    hostOrders: () => request("/host/orders"),
    updateHostOrderStatus: (id, status) => request(`/host/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),

    // admin
    adminDashboard: (date) => request(`/admin/dashboard${date ? `?date=${date}` : ""}`),
    updateUserRole: (id, role) => request(`/admin/users/${id}/role`, { method: "PUT", body: JSON.stringify({ role }) }),
    updateAdminOrderStatus: (id, status) => request(`/admin/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
    refundOrder: (id) => request(`/admin/orders/${id}/refund`, { method: "POST" })
};
