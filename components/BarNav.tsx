"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/bar", label: "Pedidos" },
  { href: "/bar/menu", label: "Menú" },
  { href: "/bar/qr", label: "Códigos QR" },
];

export default function BarNav({ barName, children }: { barName: string; children?: React.ReactNode }) {
  const path = usePathname();

  async function logout() {
    await fetch("/api/bar/logout", { method: "POST" });
    window.location.href = "/bar/login";
  }

  return (
    <nav className="bar-nav no-print">
      <span className="brand">{barName}</span>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={`navlink ${path === l.href ? "active" : ""}`}>
          {l.label}
        </Link>
      ))}
      <span className="grow" />
      {children}
      <button className="btn btn-ghost" onClick={logout}>Salir</button>
    </nav>
  );
}
