import React from "react";
import { Link } from "../router.jsx";

export default function NotFound() {
    return (
        <main className="empty not-found">
            <p className="eyebrow">404</p>
            <h1>We couldn't find that page.</h1>
            <Link to="/" className="primary-button">Back home</Link>
        </main>
    );
}
