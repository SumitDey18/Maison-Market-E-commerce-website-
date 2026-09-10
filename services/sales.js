const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

function istDateKey(date) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date(date));
}

function istDayRange(dateKey) {
    const [y, m, d] = String(dateKey).split("-").map(Number);
    if (!y || !m || !d) return null;
    const start = new Date(Date.UTC(y, m - 1, d) - (5 * 60 + 30) * 60 * 1000);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
}

function addDays(dateKey, days) {
    const [y, m, d] = dateKey.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d) + days * 86400000);
    return date.toISOString().slice(0, 10);
}

async function calculateSales(from, to) {
    const filter = {
        createdAt: { $gte: from, $lt: to },
        paymentStatus: { $in: ["paid", "cod"] },
        status: { $ne: "cancelled" }
    };

    const orders = await Order.find(filter)
        .populate({ path: "items.product", select: "owner name" })
        .populate("user", "name email")
        .sort({ createdAt: 1 });

    const hosts = await User.find({ role: "host" }).select("name email profileImage").sort({ name: 1 });
    const hostMap = new Map(hosts.map(h => [h._id.toString(), {
        id: h._id.toString(), name: h.name, email: h.email, profileImage: h.profileImage, total: 0
    }]));

    for (const order of orders) {
        if (order.paymentStatus === "paid" && order.status === "cancelled") continue;
        for (const item of order.items || []) {
            const product = item.product;
            const hostId = item.host ? item.host.toString() : (product && product.owner ? product.owner.toString() : null);
            if (!hostId) continue;
            if (!hostMap.has(hostId)) {
                const owner = product && product.owner ? await User.findById(product.owner).select("name email profileImage") : null;
                hostMap.set(hostId, { id: hostId, name: owner?.name || "Unknown Host", email: owner?.email || "", profileImage: owner?.profileImage, total: 0 });
            }
            const sale = Number(item.price || 0) * Number(item.quantity || 0);
            hostMap.get(hostId).total += sale;
        }
    }

    const total = [...hostMap.values()].reduce((sum, h) => sum + h.total, 0);
    return { hosts: [...hostMap.values()], total, orders };
}

async function getHostSales(hostId, dateKey) {
    const range = istDayRange(dateKey);
    if (!range) throw new Error("Invalid date. Use YYYY-MM-DD.");
    const filter = {
        createdAt: { $gte: range.start, $lt: range.end },
        paymentStatus: { $in: ["paid", "cod"] },
        status: { $ne: "cancelled" }
    };
    const orders = await Order.find(filter).populate({ path: "items.product", select: "owner" });
    let total = 0;
    for (const order of orders) {
        for (const item of order.items || []) {
            const owner = item.host ? item.host.toString() : (item.product?.owner ? item.product.owner.toString() : "");
            if (owner === hostId.toString()) total += Number(item.price || 0) * Number(item.quantity || 0);
        }
    }
    return Math.round(total * 100) / 100;
}

async function getDailySalesHistory(startKey, endKey) {
    const startRange = istDayRange(startKey);
    const endRange = istDayRange(addDays(endKey, 1));
    const { hosts } = await calculateSales(startRange.start, endRange.end);
    const hostIds = hosts.map(h => h.id);

    const orders = await Order.find({
        createdAt: { $gte: startRange.start, $lt: endRange.end },
        paymentStatus: { $in: ["paid", "cod"] },
        status: { $ne: "cancelled" }
    }).populate({ path: "items.product", select: "owner" });

    const map = new Map();
    for (const order of orders) {
        const day = istDateKey(order.createdAt);
        if (!map.has(day)) map.set(day, new Map());
        const dayMap = map.get(day);
        for (const item of order.items || []) {
            const hostId = item.host ? item.host.toString() : (item.product?.owner ? item.product.owner.toString() : null);
            if (!hostId) continue;
            const amount = Number(item.price || 0) * Number(item.quantity || 0);
            dayMap.set(hostId, (dayMap.get(hostId) || 0) + amount);
        }
    }

    const rows = [];
    for (let day = startKey; day <= endKey; day = addDays(day, 1)) {
        const dayMap = map.get(day) || new Map();
        const row = { date: day, hosts: {}, total: 0 };
        for (const hostId of hostIds) {
            const amount = Math.round((dayMap.get(hostId) || 0) * 100) / 100;
            row.hosts[hostId] = amount;
            row.total += amount;
        }
        row.total = Math.round(row.total * 100) / 100;
        rows.push(row);
    }
    return { hosts, rows };
}

async function getHostSalesHistory(hostId, startKey, endKey) {
    const startRange = istDayRange(startKey);
    const endRange = istDayRange(addDays(endKey, 1));
    const orders = await Order.find({
        createdAt: { $gte: startRange.start, $lt: endRange.end },
        paymentStatus: { $in: ["paid", "cod"] },
        status: { $ne: "cancelled" }
    }).populate({ path: "items.product", select: "owner" });

    const map = new Map();
    for (const order of orders) {
        const day = istDateKey(order.createdAt);
        for (const item of order.items || []) {
            const owner = item.host ? item.host.toString() : (item.product?.owner ? item.product.owner.toString() : "");
            if (owner !== hostId.toString()) continue;
            const amount = Number(item.price || 0) * Number(item.quantity || 0);
            map.set(day, (map.get(day) || 0) + amount);
        }
    }
    const rows = [];
    for (let day = startKey; day <= endKey; day = addDays(day, 1)) {
        rows.push({ date: day, total: Math.round((map.get(day) || 0) * 100) / 100 });
    }
    return rows;
}

module.exports = { istDateKey, istDayRange, addDays, calculateSales, getHostSales, getDailySalesHistory, getHostSalesHistory };
