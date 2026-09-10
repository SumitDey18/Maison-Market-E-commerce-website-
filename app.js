require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");
const connectDB = require("./config/db");
const seedDemoProducts = require("./services/demoSeed");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.set("trust proxy", 1);

app.use(session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24
    }
}));

app.use("/api", require("./routes/api"));

// Everything below this point serves the React single-page app.
app.use(express.static(path.join(__dirname, "public", "app")));

app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith("/uploads/") || req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(__dirname, "public", "app", "index.html"));
});

app.use((req, res) => {
    res.status(404).json({ message: "Not found." });
});

app.use((err, req, res, next) => {
    console.error("SERVER ERROR:", err);
    const status = err.code === "LIMIT_FILE_SIZE" ? 400 : (err.status || 500);
    const message = err.code === "LIMIT_FILE_SIZE"
        ? "Image is too large. Please upload an image smaller than 5 MB."
        : (err.message || "Something went wrong.");
    res.status(status).json({ message });
});

async function start() {
    try {
        console.log(`Google OAuth: ${process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? "configured" : "NOT configured"}`);
        console.log(`Google callback: ${String(process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/api/auth/google/callback").trim()}`);
        console.log(`Brevo OTP: ${process.env.BREVO_API_KEY && process.env.BREVO_FROM_EMAIL ? "configured" : "NOT configured"}`);

        await connectDB();
        await seedDemoProducts();
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Server was not started because MongoDB is not connected.");
        process.exit(1);
    }
}

start();
