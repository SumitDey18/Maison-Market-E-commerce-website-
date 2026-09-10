const express = require("express");
const Product = require("../../models/Product");
const { requireRole } = require("../../middleware/apiAuth");

const router = express.Router();
const canShop = requireRole("customer", "host", "admin");

function money(value) { return Math.round(Number(value) * 100) / 100; }

async function loadCart(user) {
    await user.populate("cart.product");
    user.cart = user.cart.filter(item => item.product);
    for (const item of user.cart) if (item.quantity > item.product.quantity) item.quantity = item.product.quantity;
    user.cart = user.cart.filter(item => item.quantity > 0);
    await user.save();
}

function cartResponse(user) {
    const items = user.cart.map(item => ({ product: item.product, quantity: item.quantity }));
    const total = money(items.reduce((sum, item) => sum + item.product.price * item.quantity, 0));
    return { items, total };
}

router.get("/cart", canShop, async (req, res, next) => {
    try {
        await loadCart(req.currentUser);
        res.json(cartResponse(req.currentUser));
    } catch (error) { next(error); }
});

router.post("/cart/:id", canShop, async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Product not found." });
        const qty = Number(req.body.quantity || 1);
        if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ message: "Invalid quantity." });

        const item = req.currentUser.cart.find(x => x.product && x.product.toString() === product._id.toString());
        const newQty = item ? item.quantity + qty : qty;
        if (newQty > product.quantity) return res.status(400).json({ message: "Not enough stock available." });
        if (item) item.quantity = newQty; else req.currentUser.cart.push({ product: product._id, quantity: qty });

        await req.currentUser.save();
        await req.currentUser.populate("cart.product");
        res.json(cartResponse(req.currentUser));
    } catch (error) { next(error); }
});

router.put("/cart/:id", canShop, async (req, res, next) => {
    try {
        const qty = Number(req.body.quantity);
        const item = req.currentUser.cart.find(x => x.product && x.product.toString() === req.params.id);
        if (!item) return res.status(404).json({ message: "Cart item not found." });

        if (!Number.isInteger(qty) || qty < 1) {
            req.currentUser.cart = req.currentUser.cart.filter(x => x.product.toString() !== req.params.id);
            await req.currentUser.save();
            await req.currentUser.populate("cart.product");
            return res.json(cartResponse(req.currentUser));
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            req.currentUser.cart = req.currentUser.cart.filter(x => x.product.toString() !== req.params.id);
            await req.currentUser.save();
            await req.currentUser.populate("cart.product");
            return res.json(cartResponse(req.currentUser));
        }
        if (qty > product.quantity) return res.status(400).json({ message: `Only ${product.quantity} item(s) are available for ${product.name}.` });

        item.quantity = qty;
        await req.currentUser.save();
        await req.currentUser.populate("cart.product");
        res.json(cartResponse(req.currentUser));
    } catch (error) { next(error); }
});

router.delete("/cart/:id", canShop, async (req, res, next) => {
    try {
        req.currentUser.cart = req.currentUser.cart.filter(item => !item.product || item.product.toString() !== req.params.id);
        await req.currentUser.save();
        await req.currentUser.populate("cart.product");
        res.json(cartResponse(req.currentUser));
    } catch (error) { next(error); }
});

module.exports = router;
