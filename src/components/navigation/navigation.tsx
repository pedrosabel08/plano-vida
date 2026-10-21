"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  LayoutGrid,
  Settings2,
  CalendarDays,
  Target,
} from "lucide-react";
const items = [
  { href: "/inicio", label: "Início", short: "Início", icon: House },
  {
    href: "/planejamento",
    label: "Planejamento",
    short: "Planejar",
    icon: CalendarDays,
  },
  { href: "/objetivos", label: "Objetivos", short: "Objetivos", icon: Target },
  { href: "/areas", label: "Minhas áreas", short: "Áreas", icon: LayoutGrid },
  {
    href: "/configuracoes",
    label: "Configurações",
    short: "Ajustes",
    icon: Settings2,
  },
];
export function Navigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={mobile ? "Navegação mobile" : "Navegação principal"}
      className={mobile ? "mobile-nav" : "desktop-nav"}
    >
      {items.map(({ href, label, short, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={active ? "nav-item active" : "nav-item"}
          >
            <Icon size={20} strokeWidth={1.7} />
            <span>{mobile ? short : label}</span>
            {active && !mobile && <span className="nav-active-dot" />}
          </Link>
        );
      })}
    </nav>
  );
}
