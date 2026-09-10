const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Product = require("../../models/Product");
const Order = require("../../models/Order");
const { requireRole } = require("../../middleware/apiAuth");
const { istDateKey, getHostSales, getHostSalesHistory } = require("../../services/sales");

const router = express.Router();
const CATEGORIES = ["Electronics", "Clothing", "Footwear", "Bags", "Home", "Accessories", "Beauty", "Sports", "Books", "Other"];
const canManageProducts = requireRole("host", "admin");

const uploadFolder = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder, { recursive: true });

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadFolder),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `${Date.now()}-${Math.round(Math.random() * 1000000)}${ext}`);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (allowed.includes(file.mimetype)) return cb(null, true);
        cb(new Error("Only JPG, JPEG, PNG and WEBP images are allowed."));
    }
});

router.get("/dashboard", canManageProducts, async (req, res, next) => {
    try {
        if (req.currentUser.role === "admin") return res.status(403).json({ message: "Admins use the admin dashboard." });

        const today = istDateKey(new Date());
        const todaySales = await getHostSales(req.currentUser._id, today);

        const successfulOrders = await Order.find({ paymentStatus: { $in: ["paid", "cod"] }, status: { $ne: "cancelled" } })
            .select("createdAt items")
            .populate({ path: "items.product", select: "owner" })
            .sort({ createdAt: 1 });

        let firstDate = today;
        for (const order of successfulOrders) {
            const belongs = (order.items || []).some(item => {
                const owner = item.host ? item.host.toString() : (item.product?.owner ? item.product.owner.toString() : "");
                return owner === req.currentUser._id.toString();
            });
            if (belongs) { firstDate = istDateKey(order.createdAt); break; }
        }

        const history = await getHostSalesHistory(req.currentUser._id, firstDate, today);
        const totalSales = history.reduce((sum, row) => sum + row.total, 0);
        res.json({ today, todaySales, history, totalSales, user: { id: req.currentUser._id, name: req.currentUser.name } });
    } catch (error) { next(error); }
});

router.get("/products", canManageProducts, async (req, res, next) => {
    try {
        const products = req.currentUser.role === "admin"
            ? await Product.find().populate("owner", "name role").sort({ createdAt: -1 })
            : await Product.find({ owner: req.currentUser._id }).sort({ createdAt: -1 });
        res.json({ products, categories: CATEGORIES });
    } catch (error) { next(error); }
});

router.post("/products", canManageProducts, upload.single("image"), async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ message: "Product image is required." });

        const price = Number(req.body.price);
        const quantity = Number(req.body.quantity);
        if (!req.body.name || !Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity < 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: "Invalid product data." });
        }

        const product = await Product.create({
            name: req.body.name.trim(),
            price,
            category: CATEGORIES.includes(req.body.category) ? req.body.category : "Other",
            description: req.body.description || "",
            quantity,
            image: "/uploads/" + req.file.filename,
            owner: req.currentUser._id
        });

        res.status(201).json({ product });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        next(error);
    }
});

router.put("/products/:id", canManageProducts, upload.single("image"), async (req, res, next) => {
    try {
        const filter = req.currentUser.role === "admin" ? { _id: req.params.id } : { _id: req.params.id, owner: req.currentUser._id };
        const product = await Product.findOne(filter);
        if (!product) return res.status(403).json({ message: "Product not found or access denied." });

        const price = Number(req.body.price);
        const quantity = Number(req.body.quantity);
        if (!req.body.name || !Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity < 0) {
            return res.status(400).json({ message: "Invalid product data." });
        }

        product.name = req.body.name.trim();
        product.price = price;
        product.category = CATEGORIES.includes(req.body.category) ? req.body.category : "Other";
        product.description = req.body.description || "";
        product.quantity = quantity;

        // If a new image was uploaded, replace the old product image.
        if (req.file) {
            const oldImage = product.image;
            product.image = "/uploads/" + req.file.filename;
            if (oldImage) {
                const oldImageFile = path.join(uploadFolder, path.basename(oldImage));
                if (fs.existsSync(oldImageFile)) fs.unlinkSync(oldImageFile);
            }
        }

        await product.save();
        res.json({ product });
    } catch (error) { next(error); }
});

router.delete("/products/:id", canManageProducts, async (req, res, next) => {
    try {
        const filter = req.currentUser.role === "admin" ? { _id: req.params.id } : { _id: req.params.id, owner: req.currentUser._id };
        const product = await Product.findOne(filter);
        if (!product) return res.status(403).json({ message: "Product not found or access denied." });

        if (product.image) {
            const imageFile = path.join(uploadFolder, path.basename(product.image));
            if (fs.existsSync(imageFile)) fs.unlinkSync(imageFile);
        }

        await product.deleteOne();
        res.json({ success: true });
    } catch (error) { next(error); }
});

router.get("/orders", canManageProducts, async (req, res, next) => {
    try {
        let orders;
        if (req.currentUser.role === "admin") {
            orders = await Order.find().populate("user", "name email").sort({ createdAt: -1 });
        } else {
            const myProducts = await Product.find({ owner: req.currentUser._id }).select("_id");
            const productIds = myProducts.map(product => product._id);
            orders = await Order.find({ "items.product": { $in: productIds } }).populate("user", "name email").sort({ createdAt: -1 });
        }
        res.json({ orders });
    } catch (error) { next(error); }
});

router.put("/orders/:id/status", canManageProducts, async (req, res, next) => {
    try {
        const allowed = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
        if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid order status." });

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Order not found." });

        if (req.currentUser.role !== "admin") {
            const myProductIds = await Product.find({ owner: req.currentUser._id }).distinct("_id");
            const belongsToHost = order.items.some(item => item.product && myProductIds.some(id => id.toString() === item.product.toString()));
            if (!belongsToHost) return res.status(403).json({ message: "You can only update orders containing your products." });
        }

        order.status = req.body.status;
        await order.save();
        res.json({ order });
    } catch (error) { next(error); }
});

module.exports = router;
