import React, { useEffect, useState } from "react";
import { useRouter } from "../router.jsx";
import { useApp } from "../context/AppContext.jsx";
import { api } from "../api.js";
import ProductCard from "../components/ProductCard.jsx";
import { Spinner, EmptyState } from "../components/Bits.jsx";

const SORTS = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "low", label: "Price: low to high" },
    { value: "high", label: "Price: high to low" }
];

export default function Shop() {
    const { navigate } = useRouter();
    const { user, refreshCart, notify } = useApp();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: "", category: "", minPrice: "", maxPrice: "", sort: "newest" });

    async function load(current = filters) {
        setLoading(true);
        try {
            const data = await api.products(current);
            setProducts(data.products);
            setCategories(data.categories);
        } catch (err) {
            notify(err.message, "error");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

    function updateFilter(patch) {
        const next = { ...filters, ...patch };
        setFilters(next);
        load(next);
    }

    async function addToCart(product) {
        if (!user) return navigate("/login");
        try {
            await api.addToCart(product._id, 1);
            await refreshCart();
            notify(`${product.name} added to your bag.`, "success");
        } catch (err) {
            notify(err.message, "error");
        }
    }

    return (
        <main className="shop-page">
            <section className="shop-intro">
                <div>
                    <p className="eyebrow">THE EVERYDAY EDIT</p>
                    <h1>Objects with<br /><em>good energy.</em></h1>
                </div>
                <p className="intro-copy">Thoughtful pieces for slower mornings, better workdays, and the little rituals in between.</p>
            </section>

            <div className="shop-toolbar">
                <div className="category-list">
                    <button className={filters.category === "" ? "selected" : ""} onClick={() => updateFilter({ category: "" })}>All</button>
                    {categories.map((item) => (
                        <button key={item} className={filters.category === item ? "selected" : ""} onClick={() => updateFilter({ category: item })}>{item}</button>
                    ))}
                </div>
                <label className="search">
                    <span>&#8981;</span>
                    <input value={filters.search} onChange={(e) => updateFilter({ search: e.target.value })} placeholder="Search the collection" />
                </label>
            </div>

            <div className="shop-filters">
                <label>Min price<input type="number" min="0" value={filters.minPrice} onChange={(e) => updateFilter({ minPrice: e.target.value })} /></label>
                <label>Max price<input type="number" min="0" value={filters.maxPrice} onChange={(e) => updateFilter({ maxPrice: e.target.value })} /></label>
                <label>Sort<select value={filters.sort} onChange={(e) => updateFilter({ sort: e.target.value })}>{SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
            </div>

            {loading ? <Spinner label="Loading the collection..." /> : (
                <div className="product-grid">
                    {products.map((product) => <ProductCard key={product._id} product={product} onAdd={addToCart} />)}
                </div>
            )}
            {!loading && !products.length && <EmptyState>Nothing here yet. Try another category or search term.</EmptyState>}
        </main>
    );
}
