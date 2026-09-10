import React, { useEffect } from "react";
import { useRouter } from "../router.jsx";

export function StatusBadge({ status }) {
    return <span className={`status-pill status-${status}`}>{status}</span>;
}

export function PaymentBadge({ status }) {
    return <span className={`pay-pill pay-${status}`}>{status}</span>;
}

export function Spinner({ label = "Loading..." }) {
    return <div className="spinner-block"><div className="spinner" /><p>{label}</p></div>;
}

export function EmptyState({ children }) {
    return <div className="empty">{children}</div>;
}

// Redirects away (to /login by default) when the guard condition fails.
// While booting is true we render nothing to avoid a login flash.
export function Guard({ allow, booting, redirectTo = "/login", children }) {
    const { navigate } = useRouter();
    useEffect(() => {
        if (!booting && !allow) navigate(redirectTo, { replace: true });
    }, [booting, allow, redirectTo, navigate]);
    if (booting) return <Spinner />;
    if (!allow) return null;
    return children;
}
