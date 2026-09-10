const express = require("express");
const Razorpay = require("razorpay");

const Product = require("../../models/Product");
const User = require("../../models/User");
const Order = require("../../models/Order");
const { requireRole } = require("../../middleware/apiAuth");
const { istDateKey, istDayRange, calculateSales, getDailySalesHistory } = require("../../services/sales");

const router = express.Router();
const requireAdmin = requireRole("admin");

const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
    : null;

router.get("/dashboard", requireAdmin, async (req, res, next) => {
    try {
        const [products, orders, users] = await Promise.all([
            Product.find().populate("owner", "name role").sort({ createdAt: -1 }),
            Order.find().populate("user", "name email").sort({ createdAt: -1 }),
            User.find().select("name email role isVerified profileImage").sort({ createdAt: -1 })
        ]);

        const today = istDateKey(new Date());
        const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || "")) ? String(req.query.date) : today;
        const selectedRange = istDayRange(selectedDate);
        const selectedSales = await calculateSales(selectedRange.start, selectedRange.end);

        let firstDate = today;
        const firstSale = await Order.findOne({ paymentStatus: { $in: ["paid", "cod"] }, status: { $ne: "cancelled" } }).sort({ createdAt: 1 }).select("createdAt");
        if (firstSale) firstDate = istDateKey(firstSale.createdAt);
        const salesHistory = await getDailySalesHistory(firstDate, today);
        const history = salesHistory.rows;
        const historyHosts = salesHistory.hosts;

        const stats = {
            users: users.length,
            products: products.length,
            orders: orders.length,
            sales: history.reduce((sum, row) => sum + row.total, 0),
            todaySales: history.find(row => row.date === today)?.total || 0,
            pending: orders.filter(o => o.status === "pending").length,
            delivered: orders.filter(o => o.status === "delivered").length,
            cancelled: orders.filter(o => o.status === "cancelled").length
        };

        res.json({ products, orders, users, stats, today, selectedDate, selectedSales, history, historyHosts });
    } catch (error) { next(error); }
});

router.put("/users/:id/role", requireAdmin, async (req, res, next) => {
    try {
        const allowed = ["customer", "host", "admin"];
        if (!allowed.includes(req.body.role)) return res.status(400).json({ message: "Invalid role." });
        if (req.params.id === req.currentUser._id.toString() && req.body.role !== "admin") return res.status(400).json({ message: "You cannot remove your own admin role here." });
        const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select("name email role isVerified profileImage");
        res.json({ user });
    } catch (error) { next(error); }
});

router.put("/orders/:id/status", requireAdmin, async (req, res, next) => {
    try {
        const allowed = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
        if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid status." });
        const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        res.json({ order });
    } catch (error) { next(error); }
});

router.post("/orders/:id/refund", requireAdmin, async (req, res, next) => {
    try {
        if (!razorpay) return res.status(400).json({ message: "Razorpay keys are not configured." });
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Order not found." });
        if (order.paymentStatus !== "paid" || !order.razorpayPaymentId) return res.status(400).json({ message: "Only a successfully paid Razorpay order can be refunded." });
        if (order.paymentStatus === "refunded" || order.refundId) return res.json({ message: "This order is already refunded.", order });

        const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
            amount: Math.round(order.total * 100),
            speed: "normal",
            notes: { orderId: order._id.toString() }
        });

        order.refundId = refund.id;
        order.paymentStatus = "refunded";
        order.status = "cancelled";
        await order.save();
        res.json({ order });
    } catch (error) {
        console.error("REFUND ERROR:", error);
        res.status(500).json({ message: "Refund failed: " + error.message });
    }
});

module.exports = router;
