# Maison Market — React + Express E-commerce

A full-stack e-commerce site: **React (Vite) single-page frontend** talking to a **JSON REST API** built with Express, MongoDB/Mongoose, and Razorpay. There is no server-rendered HTML or CSS anywhere — the whole UI is React, styled with a single hand-written stylesheet (no CSS framework).

## Roles

- **Customer** — browse, search/filter, cart, checkout (COD or Razorpay), order history.
- **Host** — everything a customer can do, plus a studio for managing their own products, viewing orders containing their products, and a daily sales dashboard.
- **Admin** — everything, plus every user's role management, every order, refunds, and a sales-by-host history table.

## Project layout

```
app.js                 Express entry point — API + serves the built React app
routes/api/             All REST endpoints (auth, products, cart, orders, host, admin)
middleware/apiAuth.js   Session + role-based auth guards (JSON responses)
models/                 Mongoose schemas (User, Product, Order)
services/               OTP delivery, daily sales calculations, demo product seeding
client/                 React frontend source (Vite)
  src/
    api.js              Typed fetch client for every endpoint
    router.jsx           Tiny dependency-free pushState router
    context/AppContext.jsx  Session, cart, and toast state
    components/          Header, Footer, ProductCard, shared UI bits
    pages/                One file per route
    styles.css            The entire site's styling
public/uploads-style assets are served from /uploads; the built frontend is output to public/app
```

## Setup

1. **Install dependencies** (run this on your own machine — not inside a container with foreign-platform `node_modules`):
   ```
   npm install
   ```
2. **Environment variables** — copy `.env.example` to `.env` and fill in:
   - `MONGO_URL` — a MongoDB connection string (Atlas or local).
   - `SESSION_SECRET` — any long random string.
   - `BREVO_API_KEY` / `BREVO_FROM_EMAIL` — required if you want OTP emails. The verified sender must match `BREVO_FROM_EMAIL`. If missing, registration/reset returns an email configuration error instead of falsely reporting that an email was sent.
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` — required for "Continue with Google". For local development the callback is `http://localhost:3000/api/auth/google/callback`.
   - `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — optional. If left blank, customers can still check out with Cash on Delivery; the Razorpay option is disabled in the UI.
3. **Build the React frontend:**
   ```
   npm run build
   ```
   This runs Vite and outputs static files into `public/app`, which `app.js` serves.
4. **Start the server:**
   ```
   npm start
   ```
   Visit `http://localhost:3000`.

### Development mode

`npm run dev` starts the Vite dev server (hot reload) on its own port. Run `npm start` in a second terminal for the API, and either proxy `/api` in Vite or just use `npm run build && npm start` for a single-port experience — the app is small enough that a rebuild-and-refresh loop is usually simplest.

### Helper scripts

- `npm run seed` — populates a handful of demo products.
- `npm run admin` — interactive prompt to create or promote a user to `admin`.

## How the pieces fit together

- **Auth**: session cookies (`express-session`), bcrypt-hashed passwords, email OTP verification on signup, forgot/reset password via OTP, optional Google OAuth (implemented directly against Google's OAuth endpoints, no Passport dependency).
- **Catalog**: public `/api/products` with search, category, price range, and sort — no login required to browse.
- **Cart & checkout**: cart lives on the `User` document; checkout captures a delivery address (with an optional "use my current location" geolocation button) and either places a Cash-on-Delivery order immediately or creates a Razorpay order and opens Razorpay's checkout widget client-side, verifying the payment signature server-side before confirming stock and clearing the cart.
- **Host studio**: hosts manage only their own products and see only orders containing their products; a small sales service (`services/sales.js`) computes daily totals in IST.
- **Admin dashboard**: tabbed view over all users (with role changes), all products, all orders (with status updates and Razorpay refunds), and a full daily sales-by-host history table.

## Notes

- This was converted from an EJS + plain-CSS server-rendered app to a React SPA + JSON API. All EJS views and the old `/customer`, `/host`, `/admin` server-rendered routes have been removed; every route is now client-side, backed entirely by `/api/*`.
- `node_modules` and the previous built `public/app` bundle are not included — run `npm install` and `npm run build` as above.


## Persistent profile pictures
Profile pictures are stored in Cloudinary instead of the server's local filesystem. This is required for Render and other ephemeral hosting platforms, where files saved to `uploads/` can disappear after a restart/deploy and are not shared between devices.

Add these environment variables to your deployment (never commit real secrets):
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

After deploying this version, upload the profile picture once again. The new Cloudinary URL is saved in MongoDB, so it will remain available after logout, login, restarts, redeploys, and login from another device.
