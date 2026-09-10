const express = require("express");
const Product = require("../../models/Product");

const router = express.Router();

const CATEGORIES = ["Electronics", "Clothing", "Footwear", "Bags", "Home", "Accessories", "Beauty", "Sports", "Books", "Other"];

router.get("/categories", (req, res) => res.json({ categories: CATEGORIES }));

router.get("/products", async (req, res, next) => {
    try {
        const search = String(req.query.search || "").trim();
        const category = String(req.query.category || "").trim();
        const min = req.query.minPrice === "" || req.query.minPrice == null ? null : Number(req.query.minPrice);
        const max = req.query.maxPrice === "" || req.query.maxPrice == null ? null : Number(req.query.maxPrice);
        const sort = String(req.query.sort || "newest");

        const query = { quantity: { $gte: 0 } };
        if (search) query.$or = [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { category: { $regex: search, $options: "i" } }
        ];
        if (category && CATEGORIES.includes(category)) query.category = category;
        if (Number.isFinite(min) || Number.isFinite(max)) {
            query.price = {};
            if (Number.isFinite(min)) query.price.$gte = Math.max(0, min);
            if (Number.isFinite(max)) query.price.$lte = Math.max(0, max);
        }

        const sortMap = { low: { price: 1 }, high: { price: -1 }, newest: { createdAt: -1 }, oldest: { createdAt: 1 } };
        const products = await Product.find(query).populate("owner", "name role").sort(sortMap[sort] || sortMap.newest);
        res.json({ products, categories: CATEGORIES, filters: { search, category, minPrice: req.query.minPrice || "", maxPrice: req.query.maxPrice || "", sort } });
    } catch (error) { next(error); }
});

router.get("/products/:id", async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id).populate("owner", "name role");
        if (!product) return res.status(404).json({ message: "Product not found." });
        res.json({ product });
    } catch (error) { next(error); }
});

module.exports = router;
