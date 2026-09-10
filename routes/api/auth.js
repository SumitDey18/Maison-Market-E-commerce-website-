const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const multer = require("multer");

const User = require("../../models/User");
const { requireUser } = require("../../middleware/apiAuth");
const { createOTP, hashOTP, sendOTP } = require("../../services/otp");
const { uploadProfileImage, deleteImage } = require("../../services/cloudinary");

const router = express.Router();

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const userUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.mimetype)) return cb(null, true);
        cb(new Error("Only JPG, JPEG, PNG and WEBP images are allowed."));
    }
});

function cleanEmail(email) { return String(email || "").trim().toLowerCase(); }

function sessionUser(user) {
    return { id: user._id.toString(), name: user.name, email: user.email, role: user.role, profileImage: user.profileImage || "", profileImagePublicId: user.profileImagePublicId || "" };
}

function googleConfigured() {
    return Boolean(String(process.env.GOOGLE_CLIENT_ID || "").trim() && String(process.env.GOOGLE_CLIENT_SECRET || "").trim());
}

function googleCallbackUrl() {
    return String(process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/api/auth/google/callback").trim();
}

router.get("/session", (req, res) => res.json({ user: req.session.user || null }));

router.get("/profile", requireUser, async (req, res, next) => {
    try {
        const user = await User.findById(req.session.user.id).select("name email role profileImage profileImagePublicId");
        if (!user) return res.status(404).json({ message: "User not found." });
        res.json({ user: sessionUser(user) });
    } catch (error) { next(error); }
});

router.put("/profile", requireUser, userUpload.single("profileImage"), async (req, res, next) => {
    try {
        const name = String(req.body.name || "").trim();
        const email = cleanEmail(req.body.email);
        if (!name) {
            return res.status(400).json({ message: "Name is required." });
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: "Please enter a valid email address." });
        }

        const user = await User.findById(req.session.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const existingEmail = await User.findOne({ email, _id: { $ne: user._id } }).select("_id");
        if (existingEmail) {
            return res.status(409).json({ message: "An account with this email already exists." });
        }

        const oldPublicId = user.profileImagePublicId || "";
        user.name = name;
        user.email = email;

        if (req.file) {
            const uploaded = await uploadProfileImage(req.file);
            user.profileImage = uploaded.url;
            user.profileImagePublicId = uploaded.publicId;
        }
        await user.save();

        if (req.file && oldPublicId && oldPublicId !== user.profileImagePublicId) {
            deleteImage(oldPublicId).catch((error) => console.error("Cloudinary old profile image delete failed:", error.message));
        }

        req.session.user = sessionUser(user);
        res.json({ message: "Profile updated successfully.", user: req.session.user });
    } catch (error) {
        next(error);
    }
});

router.post("/register", userUpload.single("profileImage"), async (req, res, next) => {
    try {
        const name = String(req.body.name || "").trim();
        const email = cleanEmail(req.body.email);
        const password = String(req.body.password || "");
        if (!name || !email || password.length < 6) {
            return res.status(400).json({ message: "Name, valid email and a password of at least 6 characters are required." });
        }
        if (await User.findOne({ email })) {
            return res.status(409).json({ message: "An account with this email already exists. Please login to continue." });
        }

        const otp = createOTP();
        const user = await User.create({
            name,
            email,
            password: await bcrypt.hash(password, 10),
            profileImage: "",
            profileImagePublicId: "",
            otpHash: hashOTP(otp),
            otpExpires: new Date(Date.now() + OTP_EXPIRY_MS),
            otpAttempts: 0,
            otpLastSent: new Date()
        });

        if (req.file) {
            try {
                const uploaded = await uploadProfileImage(req.file);
                user.profileImage = uploaded.url;
                user.profileImagePublicId = uploaded.publicId;
                await user.save();
            } catch (uploadError) {
                await User.deleteOne({ _id: user._id });
                return res.status(500).json({ message: uploadError.message });
            }
        }

        try {
            await sendOTP(user.email, otp, "verification");
        } catch (smtpError) {
            await User.deleteOne({ _id: user._id });
            return res.status(500).json({ message: "We could not send the verification email. Please try again shortly." });
        }

        res.status(201).json({ email, message: "Account created. Enter the OTP sent to your email to verify your account." });
    } catch (error) { next(error); }
});

router.post("/verify", async (req, res, next) => {
    try {
        const email = cleanEmail(req.body.email);
        const otp = String(req.body.otp || "").trim();
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found." });
        if (user.isVerified) return res.json({ message: "Already verified. Please sign in.", alreadyVerified: true });
        if (!user.otpHash || !user.otpExpires || user.otpExpires < new Date()) return res.status(400).json({ message: "OTP expired. Please resend OTP." });
        if ((user.otpAttempts || 0) >= OTP_MAX_ATTEMPTS) return res.status(429).json({ message: "Too many incorrect attempts. Please resend OTP." });

        if (hashOTP(otp) !== user.otpHash) {
            user.otpAttempts = (user.otpAttempts || 0) + 1;
            await user.save();
            const remaining = Math.max(0, OTP_MAX_ATTEMPTS - user.otpAttempts);
            return res.status(400).json({ message: `Wrong OTP. Attempts remaining: ${remaining}` });
        }

        user.isVerified = true;
        user.otpHash = undefined;
        user.otpExpires = undefined;
        user.otpAttempts = 0;
        user.otpLastSent = undefined;
        await user.save();
        res.json({ message: "Email verified. You can sign in now." });
    } catch (error) { next(error); }
});

router.post("/verify/resend", async (req, res, next) => {
    try {
        const email = cleanEmail(req.body.email);
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found." });
        if (user.isVerified) return res.json({ message: "Already verified. Please sign in.", alreadyVerified: true });

        if (user.otpLastSent && Date.now() - user.otpLastSent.getTime() < OTP_RESEND_COOLDOWN_MS) {
            const wait = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - user.otpLastSent.getTime())) / 1000);
            return res.status(429).json({ message: `Please wait ${wait} seconds before requesting another OTP.` });
        }

        const otp = createOTP();
        try {
            await sendOTP(user.email, otp, "verification");
        } catch (smtpError) {
            return res.status(500).json({ message: "We could not send the OTP email. Please try again shortly." });
        }

        user.otpHash = hashOTP(otp);
        user.otpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
        user.otpAttempts = 0;
        user.otpLastSent = new Date();
        await user.save();
        res.json({ message: "A new OTP has been sent." });
    } catch (error) { next(error); }
});

router.post("/forgot-password", async (req, res, next) => {
    try {
        const email = cleanEmail(req.body.email);
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "No account found with this email." });

        if (user.resetOtpLastSent && Date.now() - user.resetOtpLastSent.getTime() < OTP_RESEND_COOLDOWN_MS) {
            const wait = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - user.resetOtpLastSent.getTime())) / 1000);
            return res.status(429).json({ message: `Please wait ${wait} seconds before requesting another OTP.` });
        }

        const otp = createOTP();
        try {
            await sendOTP(user.email, otp, "reset");
        } catch (smtpError) {
            return res.status(500).json({ message: "OTP could not be sent. Please try again shortly." });
        }

        user.resetOtpHash = hashOTP(otp);
        user.resetOtpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
        user.resetOtpAttempts = 0;
        user.resetOtpLastSent = new Date();
        await user.save();
        res.json({ email, message: "OTP sent. Check your email to reset your password." });
    } catch (error) { next(error); }
});

router.post("/reset-password", async (req, res, next) => {
    try {
        const email = cleanEmail(req.body.email);
        const otp = String(req.body.otp || "").trim();
        const password = String(req.body.password || "");
        const confirmPassword = String(req.body.confirmPassword || "");
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found." });
        if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters." });
        if (password !== confirmPassword) return res.status(400).json({ message: "Passwords do not match." });
        if (!user.resetOtpHash || !user.resetOtpExpires || user.resetOtpExpires < new Date()) return res.status(400).json({ message: "OTP expired. Please request a new OTP." });
        if ((user.resetOtpAttempts || 0) >= OTP_MAX_ATTEMPTS) return res.status(429).json({ message: "Too many incorrect attempts. Please request a new OTP." });

        if (hashOTP(otp) !== user.resetOtpHash) {
            user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
            await user.save();
            const remaining = Math.max(0, OTP_MAX_ATTEMPTS - user.resetOtpAttempts);
            return res.status(400).json({ message: `Wrong OTP. Attempts remaining: ${remaining}` });
        }

        user.password = await bcrypt.hash(password, 10);
        user.resetOtpHash = undefined;
        user.resetOtpExpires = undefined;
        user.resetOtpAttempts = 0;
        user.resetOtpLastSent = undefined;
        await user.save();
        res.json({ message: "Password updated. Please sign in." });
    } catch (error) { next(error); }
});

router.post("/login", async (req, res, next) => {
    try {
        const email = cleanEmail(req.body.email);
        const password = String(req.body.password || "");
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password || ""))) {
            return res.status(401).json({ message: "The email or password you entered is incorrect." });
        }
        if (!user.isVerified) return res.status(403).json({ message: "Please verify your email before signing in.", needsVerification: true, email: user.email });
        req.session.user = sessionUser(user);
        res.json({ user: req.session.user });
    } catch (error) { next(error); }
});

router.post("/logout", (req, res) => req.session.destroy(() => res.json({ success: true })));

router.get("/google", (req, res) => {
    if (!googleConfigured()) return res.status(503).json({ message: "Google authentication is not configured." });
    const state = crypto.randomBytes(24).toString("hex");
    req.session.googleOAuthState = state;
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: googleCallbackUrl(),
        response_type: "code",
        scope: "openid email profile",
        state
    });
    res.redirect("https://accounts.google.com/o/oauth2/v2/auth?" + params.toString());
});

router.get("/google/callback", async (req, res, next) => {
    try {
        if (!googleConfigured()) return res.status(503).send("Google authentication is not configured.");
        if (!req.query.code || req.query.state !== req.session.googleOAuthState) return res.status(400).send("Invalid Google login request.");
        delete req.session.googleOAuthState;

        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code: String(req.query.code),
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: googleCallbackUrl(),
                grant_type: "authorization_code"
            })
        });
        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok || !tokenData.access_token) return res.status(400).send("Google token exchange failed.");

        const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const profile = await profileResponse.json();
        if (!profileResponse.ok || !profile.email || profile.email_verified !== true) return res.status(400).send("Google email could not be verified.");

        const email = cleanEmail(profile.email);
        let user = await User.findOne({ $or: [{ googleId: profile.sub }, { email }] });
        if (!user) {
            user = await User.create({
                name: String(profile.name || email.split("@")[0]).trim(),
                email,
                password: crypto.randomBytes(32).toString("hex"),
                googleId: profile.sub,
                profileImage: profile.picture || "",
                role: "customer",
                isVerified: true
            });
        } else {
            user.googleId = profile.sub;
            user.isVerified = true;
            if (!user.profileImage && profile.picture) user.profileImage = profile.picture;
            if (!user.name && profile.name) user.name = profile.name;
            await user.save();
        }

        req.session.user = sessionUser(user);
        res.redirect("/");
    } catch (error) { next(error); }
});

module.exports = router;
