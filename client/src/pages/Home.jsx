import React from "react";
import { useRouter } from "../router.jsx";

export default function Home() {
    const { navigate } = useRouter();
    return (
        <main className="home">
            <section className="hero">
                <div className="hero-copy">
                    <p className="eyebrow">A SMALLER, BETTER STORE</p>
                    <h1>Make room for<br /><em>the lovely.</em></h1>
                    <p>Useful things, well made. A considered collection for home, self, and the spaces between.</p>
                    <button className="primary-button" onClick={() => navigate("/shop")}>Explore the collection <span>&#8599;</span></button>
                </div>
                <div className="hero-art">
                    <div className="sun" />
                    <div className="arch arch-one" />
                    <div className="arch arch-two" />
                    <div className="art-label">VOL. 01<br /><small>THE SOFT OPENING</small></div>
                </div>
            </section>
            <section className="manifesto">
                <p className="eyebrow">OUR POINT OF VIEW</p>
                <h2>Less noise.<br /><em>More meaning.</em></h2>
                <p>We find the pieces that earn their place. Materials you want to touch, forms you want to live with, and details that make ordinary days feel a little more yours.</p>
            </section>
            <section className="value-strip">
                <div><h3>Free returns</h3><p>30 days, no questions.</p></div>
                <div><h3>Verified hosts</h3><p>Every seller is vetted.</p></div>
                <div><h3>Cash or card</h3><p>Razorpay or pay on delivery.</p></div>
            </section>
        </main>
    );
}
