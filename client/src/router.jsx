import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const RouterContext = createContext(null);

function getLocation() {
    return { pathname: window.location.pathname, search: window.location.search };
}

export function RouterProvider({ children }) {
    const [location, setLocation] = useState(getLocation());

    const navigate = useCallback((to, opts = {}) => {
        if (opts.replace) window.history.replaceState({}, "", to);
        else window.history.pushState({}, "", to);
        setLocation(getLocation());
        if (!opts.keepScroll) window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        const onPop = () => setLocation(getLocation());
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
    }, []);

    return <RouterContext.Provider value={{ ...location, navigate }}>{children}</RouterContext.Provider>;
}

export function useRouter() {
    return useContext(RouterContext);
}

export function Link({ to, children, className, onClick, ...rest }) {
    const { navigate } = useRouter();
    return (
        <a
            href={to}
            className={className}
            {...rest}
            onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                event.preventDefault();
                if (onClick) onClick(event);
                navigate(to);
            }}
        >
            {children}
        </a>
    );
}
