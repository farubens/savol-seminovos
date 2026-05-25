import Image from "next/image";
import Link from "next/link";
import { Facebook, Instagram, Search } from "lucide-react";

type HeaderProps = {
  active?: "home" | "veiculos" | "lojas" | "venda" | "institucional" | "contato";
};

export function SiteHeader({ active = "home" }: HeaderProps) {
  return (
    <>
      <div className="topbar">
        <div className="container topbar-inner">
          <div className="topbar-social-spacer" aria-hidden="true" />
          <p className="topbar-schedule">Segunda a sexta: 08h às 19h | Sábado: 09h às 18h</p>
          <div className="topbar-social" aria-label="Redes sociais">
            <a className="topbar-social-link" href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook Savol">
              <Facebook size={14} />
            </a>
            <a className="topbar-social-link" href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram Savol">
              <Instagram size={14} />
            </a>
          </div>
        </div>
      </div>

      <header className="header container">
        <Image src="/images/logo.png" alt="Savol" width={200} height={48} className="site-logo" />
        <nav>
          <Link className={active === "home" ? "active" : ""} href="/">
            Home
          </Link>
          <Link className={active === "veiculos" ? "active" : ""} href="/veiculos">
            Veículos
          </Link>
          <Link className={active === "lojas" ? "active" : ""} href="/lojas">
            Lojas
          </Link>

          <div className={`nav-item-has-submenu ${active === "venda" ? "is-active" : ""}`}>
            <Link className={active === "venda" ? "active" : ""} href="/venda-seu-carro" aria-haspopup="menu">
              Venda seu carro
            </Link>
            <div className="nav-submenu" role="menu" aria-label="Submenu de venda">
              <Link href="/venda-seu-carro" role="menuitem">
                Venda seu carro
              </Link>
              <Link href="/venda-por-atacado" role="menuitem">
                Venda por atacado
              </Link>
            </div>
          </div>

          <Link className={active === "institucional" ? "active" : ""} href="/institucional">
            Institucional
          </Link>
          <button type="button" className="btn btn-sm" aria-disabled="true">
            Contato
          </button>
          <Link href="/veiculos" className="icon-btn" aria-label="Buscar">
            <Search size={16} />
          </Link>
        </nav>
      </header>
    </>
  );
}
