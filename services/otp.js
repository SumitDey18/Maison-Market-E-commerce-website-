const crypto = require("crypto");

function createOTP() {
    return crypto.randomInt(100000, 1000000).toString();
}

function hashOTP(otp) {
    return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

function getBrevoConfig() {
    const apiKey = String(process.env.BREVO_API_KEY || "").trim();
    const fromEmail = String(process.env.BREVO_FROM_EMAIL || "").trim().toLowerCase();
    const fromName = String(process.env.BREVO_FROM_NAME || "Maison Market").trim();

    if (!apiKey || !fromEmail) return null;
    return { apiKey, fromEmail, fromName };
}

async function sendOTP(email, otp, type = "verification") {
    const recipient = String(email || "").trim().toLowerCase();
    if (!recipient) throw new Error("Recipient email is missing.");

    const config = getBrevoConfig();

    // Email delivery is intentionally strict: if Brevo is not configured,
    // registration/reset should not claim that an OTP was emailed.
    if (!config) {
        console.error("OTP email not sent: BREVO_API_KEY or BREVO_FROM_EMAIL is missing.");
        console.log(`[OTP DEBUG] (${type}) for ${recipient}: ${otp}`);
        throw new Error("Brevo email service is not configured.");
    }

    const { apiKey, fromEmail, fromName } = config;
    const isReset = type === "reset";

    const subject = isReset
        ? "Maison Market - Password Reset OTP"
        : "Maison Market - Email Verification OTP";

    const message = isReset
        ? "Use this OTP to reset your Maison Market password."
        : "Use this OTP to verify your Maison Market email address.";

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            accept: "application/json",
            "api-key": apiKey,
            "content-type": "application/json"
        },
        body: JSON.stringify({
            sender: { name: fromName, email: fromEmail },
            to: [{ email: recipient }],
            subject,
            textContent:
                `${message}\n\nYour OTP is ${otp}. It expires in 5 minutes. ` +
                "If you did not request this, ignore this email.",
            htmlContent: `
                <div style="font-family:Arial,sans-serif;background:#f6f7fb;padding:30px">
                    <div style="max-width:520px;margin:auto;background:#fff;padding:32px;border-radius:16px;border:1px solid #e5e7eb">
                        <h2 style="margin:0 0 12px;color:#111827">Maison Market</h2>
                        <p style="color:#475569">${message}</p>
                        <div style="font-size:34px;font-weight:700;letter-spacing:8px;text-align:center;margin:28px 0;color:#111827">${otp}</div>
                        <p style="color:#64748b">This OTP expires in <b>5 minutes</b>.</p>
                        <p style="color:#94a3b8;font-size:13px">If you did not request this code, you can safely ignore this email.</p>
                    </div>
                </div>`
        })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        console.error("Brevo OTP error:", {
            statusCode: response.status,
            message: data.message || "Brevo API request failed."
        });
        console.log(`[OTP DEBUG] (${type}) for ${recipient}: ${otp}`);
        throw new Error(data.message || `Brevo email request failed with status ${response.status}.`);
    }

    console.log(`OTP email sent through Brevo: ${data.messageId || "success"}`);
    return { sentByEmail: true, messageId: data.messageId };
}

module.exports = { createOTP, hashOTP, sendOTP };
