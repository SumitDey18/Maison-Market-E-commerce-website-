import React from "react";

export default function Footer() {
    return (
        <footer className="site-footer">
            <span>Maison Market</span>
            <span>Curated for the considered life.</span>
            <span>&copy; {new Date().getFullYear()}</span>
        </footer>
    );
}
