const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const Product = require("../../models/Product");
const Order = require("../../models/Order");
const { requireRole } = require("../../middleware/apiAuth");

const router = express.Router();
const canShop = requireRole("customer", "host", "admin");

const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
    : null;

function money(value) { return Math.round(Number(value) * 100) / 100; }
function cartTotal(user) {
    return money(user.cart.reduce((sum, item) => sum + (item.product ? item.product.price * item.quantity : 0), 0));
}

async function loadCart(user) {
    await user.populate("cart.product");
    user.cart = user.cart.filter(item => item.product);
    for (const item of user.cart) if (item.quantity > item.product.quantity) item.quantity = item.product.quantity;
    user.cart = user.cart.filter(item => item.quantity > 0);
    await user.save();
}

async function reduceStock(items) {
    const changed = [];
    for (const item of items) {
        const result = await Product.updateOne({ _id: item.product, quantity: { $gte: item.quantity } }, { $inc: { quantity: -item.quantity } });
        if (result.modifiedCount !== 1) {
            for (const previous of changed) await Product.updateOne({ _id: previous.product }, { $inc: { quantity: previous.quantity } });
            return false;
        }
        changed.push(item);
    }
    return true;
}

router.get("/checkout", canShop, async (req, res, next) => {
    try {
        await loadCart(req.currentUser);
        if (!req.currentUser.cart.length) return res.status(400).json({ message: "Your bag is empty." });
        res.json({ total: cartTotal(req.currentUser), razorpayAvailable: Boolean(razorpay), razorpayKey: razorpay ? process.env.RAZORPAY_KEY_ID : null });
    } catch (error) { next(error); }
});

router.post("/checkout", canShop, async (req, res, next) => {
    try {
        await loadCart(req.currentUser);
        if (!req.currentUser.cart.length) return res.status(400).json({ message: "Your bag is empty." });

        const { name, phone, address, city, state, pincode, latitude, longitude, paymentMethod } = req.body;
        if (!name || !phone || !address || !city || !state || !pincode) return res.status(400).json({ message: "Please fill all delivery fields." });
        if (!["razorpay", "cod"].includes(paymentMethod)) return res.status(400).json({ message: "Invalid payment method." });
        for (const item of req.currentUser.cart) if (item.product.quantity < item.quantity) return res.status(400).json({ message: `Not enough stock for ${item.product.name}.` });

        const items = req.currentUser.cart.map(item => ({ product: item.product._id, name: item.product.name, price: item.product.price, quantity: item.quantity, host: item.product.owner }));
        const deliveryAddress = { name, phone, address, city, state, pincode, latitude: latitude ? Number(latitude) : undefined, longitude: longitude ? Number(longitude) : undefined };
        const order = await Order.create({ user: req.currentUser._id, items, total: cartTotal(req.currentUser), address: deliveryAddress, paymentMethod });
        req.currentUser.addresses.push(deliveryAddress);
        await req.currentUser.save();

        if (paymentMethod === "cod") {
            if (!await reduceStock(order.items)) {
                order.status = "cancelled"; order.paymentStatus = "failed"; await order.save();
                return res.status(409).json({ message: "Stock changed while placing the order. Please try again." });
            }
            order.status = "confirmed"; order.paymentStatus = "cod"; await order.save();
            req.currentUser.cart = []; await req.currentUser.save();
            return res.status(201).json({ order, paymentRequired: false });
        }

        if (!razorpay) return res.status(200).json({ order, paymentRequired: true, razorpayOrder: null, key: null, reason: "Razorpay TEST keys are not configured on the server." });

        try {
            const razorpayOrder = await razorpay.orders.create({ amount: Math.round(order.total * 100), currency: "INR", receipt: order._id.toString() });
            order.razorpayOrderId = razorpayOrder.id;
            await order.save();
            res.status(201).json({ order, paymentRequired: true, razorpayOrder, key: process.env.RAZORPAY_KEY_ID, reason: null });
        } catch (error) {
            order.paymentStatus = "failed"; await order.save();
            next(error);
        }
    } catch (error) { next(error); }
});

router.post("/payment/verify", canShop, async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.json({ success: false, message: "Payment response is incomplete." });

        const order = await Order.findOne({ razorpayOrderId: razorpay_order_id, user: req.currentUser._id });
        if (!order) return res.json({ success: false, message: "Order not found." });
        if (order.paymentStatus === "paid") return res.json({ success: true, message: "Payment already verified." });
        if (order.paymentStatus === "refunded") return res.json({ success: false, message: "This payment was refunded." });
        if (!process.env.RAZORPAY_KEY_SECRET) return res.json({ success: false, message: "Razorpay secret is missing." });

        const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
        if (expected.length !== razorpay_signature.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature))) {
            order.paymentStatus = "failed"; await order.save();
            return res.json({ success: false, message: "Invalid payment signature." });
        }

        const locked = await Order.findOneAndUpdate({ _id: order._id, paymentStatus: "pending" }, { $set: { paymentStatus: "processing" } }, { new: true });
        if (!locked) return res.json({ success: false, message: "Payment is already being processed. Refresh orders shortly." });

        const stockUpdated = await reduceStock(locked.items);
        locked.razorpayPaymentId = razorpay_payment_id;
        locked.razorpaySignature = razorpay_signature;

        if (!stockUpdated) {
            locked.paymentStatus = "refunded";
            locked.status = "cancelled";
            if (razorpay) {
                try {
                    const refund = await razorpay.payments.refund(razorpay_payment_id, { amount: Math.round(locked.total * 100), speed: "normal", notes: { orderId: locked._id.toString(), reason: "Stock unavailable" } });
                    locked.refundId = refund.id;
                } catch (refundError) {
                    console.error("REFUND ERROR:", refundError.message);
                    locked.paymentStatus = "paid"; locked.status = "pending"; await locked.save();
                    return res.json({ success: false, message: "Payment verified, but stock changed. Automatic refund could not be completed; contact admin." });
                }
            }
            await locked.save();
            return res.json({ success: false, message: "Payment was verified but stock changed. The payment has been refunded." });
        }

        locked.paymentStatus = "paid"; locked.status = "confirmed"; await locked.save();
        req.currentUser.cart = []; await req.currentUser.save();
        res.json({ success: true });
    } catch (error) { next(error); }
});

router.post("/payment/failed", canShop, async (req, res, next) => {
    try {
        const order = await Order.findOne({ razorpayOrderId: req.body.razorpay_order_id, user: req.currentUser._id, paymentStatus: { $in: ["pending", "processing"] } });
        if (order) { order.paymentStatus = "failed"; await order.save(); }
        res.json({ success: true });
    } catch (error) { next(error); }
});

router.post("/payment/cancel/:id", canShop, async (req, res, next) => {
    try {
        const order = await Order.findOne({ _id: req.params.id, user: req.currentUser._id, paymentStatus: { $in: ["pending", "processing"] } });
        if (order) { order.paymentStatus = "failed"; await order.save(); }
        res.json({ success: true });
    } catch (error) { next(error); }
});

router.get("/orders", canShop, async (req, res, next) => {
    try {
        const orders = await Order.find({ user: req.currentUser._id }).sort({ createdAt: -1 });
        res.json({ orders });
    } catch (error) { next(error); }
});

module.exports = router;
