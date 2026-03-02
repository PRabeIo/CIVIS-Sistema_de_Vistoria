
import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NAV_BY_TIPO } from "../../../utils/navConfig";

function getStoredUser() {
  try {
    const raw = localStorage.getItem("usuario");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function Navbar({ onLogout, tipo: tipoProp, userId: userIdProp }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const stored = getStoredUser();
  const tipo = tipoProp ?? stored?.tipo ?? stored?.type ?? null;
  const userId = userIdProp ?? stored?.id ?? null;

  const linksCfg = NAV_BY_TIPO[tipo] || [];

  const links = useMemo(() => {
    const ctx = { userId };
    return linksCfg.map((item) => {
      const to = typeof item.to === "function" ? item.to(ctx) : item.to;
      return { ...item, to, isActive: location.pathname === to };
    });
  }, [linksCfg, location.pathname, userId]);

  const doLogout = () => {
    if (onLogout) return onLogout();
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  return (
    <header className="civis-navbar">
      <div
        className="civis-navbar__logo"
        role="button"
        tabIndex={0}
        onClick={() => navigate("/home")}
        onKeyDown={(e) => e.key === "Enter" && navigate("/home")}
      >
        CIVIS
      </div>

      <nav className={`civis-navbar__links ${menuOpen ? "is-open" : ""}`}>
        {links.map((l) => (
          <a
            key={l.label}
            href="#"
            className={`civis-navbar__link ${l.isActive ? "is-active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setMenuOpen(false);
              navigate(l.to);
            }}
          >
            {l.label}
          </a>
        ))}

        <button className="civis-navbar__logout civis-navbar__logout--mobile" onClick={doLogout}>
          Sair
        </button>
      </nav>

      <button
        className="civis-navbar__toggle"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Menu"
      >
        ☰
      </button>

      <button className="civis-navbar__logout civis-navbar__logout--desktop" onClick={doLogout}>
        Sair
      </button>
    </header>
  );
}