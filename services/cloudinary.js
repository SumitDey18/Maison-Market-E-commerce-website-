const crypto = require("crypto");

function required(name) {
    const value = String(process.env[name] || "").trim();
    if (!value) throw new Error(`${name} is not configured.`);
    return value;
}

function cloudinaryConfigured() {
    return Boolean(
        String(process.env.CLOUDINARY_CLOUD_NAME || "").trim() &&
        String(process.env.CLOUDINARY_API_KEY || "").trim() &&
        String(process.env.CLOUDINARY_API_SECRET || "").trim()
    );
}

function sign(params, secret) {
    const toSign = Object.keys(params)
        .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "")
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join("&");
    return crypto.createHash("sha1").update(toSign + secret).digest("hex");
}

async function uploadProfileImage(file) {
    if (!cloudinaryConfigured()) {
        throw new Error("Profile image storage is not configured. Add the Cloudinary environment variables.");
    }

    const cloudName = required("CLOUDINARY_CLOUD_NAME");
    const apiKey = required("CLOUDINARY_API_KEY");
    const apiSecret = required("CLOUDINARY_API_SECRET");
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "maison-market/profiles";
    const signature = sign({ folder, timestamp }, apiSecret);

    const form = new FormData();
    form.append("file", new Blob([file.buffer], { type: file.mimetype }), file.originalname);
    form.append("api_key", apiKey);
    form.append("timestamp", String(timestamp));
    form.append("folder", folder);
    form.append("signature", signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: form
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.secure_url || !data.public_id) {
        throw new Error(data.error?.message || "Cloudinary profile image upload failed.");
    }

    return { url: data.secure_url, publicId: data.public_id };
}

async function deleteImage(publicId) {
    if (!publicId || !cloudinaryConfigured()) return;

    const cloudName = required("CLOUDINARY_CLOUD_NAME");
    const apiKey = required("CLOUDINARY_API_KEY");
    const apiSecret = required("CLOUDINARY_API_SECRET");
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = sign({ public_id: publicId, timestamp }, apiSecret);

    const form = new URLSearchParams({
        public_id: publicId,
        api_key: apiKey,
        timestamp: String(timestamp),
        signature
    });

    await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: form
    });
}

module.exports = { cloudinaryConfigured, uploadProfileImage, deleteImage };
