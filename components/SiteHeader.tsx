"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Facebook, Heart, Instagram, Menu, Search, ShieldCheck, X } from "lucide-react";

type HeaderProps = {
  active?: "home" | "veiculos" | "lojas" | "venda" | "atacado" | "lojistas" | "institucional" | "contato" | "conta";
  showEnvNote?: boolean;
};

export function SiteHeader({ active = "home", showEnvNote = false }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      if (!searchWrapRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [searchOpen]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchTerm.trim();
    const destination = query ? `/veiculos?q=${encodeURIComponent(query)}` : "/veiculos";

    setSearchOpen(false);
    setMobileMenuOpen(false);
    router.push(destination);
  };

  return (
    <>
      <div className="topbar">
        <div className="container topbar-inner">
          <div className="topbar-social-spacer" aria-hidden="true" />
          <p className="topbar-schedule">Segunda a sexta: 08h às 19h | Sábado: 09h às 18h</p>
          <div className="topbar-social" aria-label="Redes sociais">
            <a className="topbar-social-link" href="https://www.facebook.com/gruposavol/" target="_blank" rel="noopener noreferrer" aria-label="Facebook SAVOL">
              <Facebook size={14} />
            </a>
            <a className="topbar-social-link" href="https://www.instagram.com/gruposavol/" target="_blank" rel="noopener noreferrer" aria-label="Instagram SAVOL">
              <Instagram size={14} />
            </a>
          </div>
        </div>
      </div>

      <div className="site-header-sticky">
        <header className={`header container${mobileMenuOpen ? " is-mobile-open" : ""}`}>
          <Link href="/" aria-label="Ir para a página inicial">
            <Image src="/images/logo.png" alt="SAVOL" width={200} height={48} className="site-logo" />
          </Link>

          <button
            type="button"
            className="header-menu-btn"
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((current) => !current)}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <nav className={`site-nav${mobileMenuOpen ? " is-open" : ""}`}>
            <Link className={active === "home" ? "active" : ""} href="/">
              Home
            </Link>
            <Link className={active === "veiculos" ? "active" : ""} href="/veiculos">
              Veículos
            </Link>
            <Link className={active === "lojas" ? "active" : ""} href="/lojas">
              Lojas
            </Link>
            <Link className={active === "venda" ? "active" : ""} href="/venda-seu-carro">
              Venda seu carro
            </Link>
            <Link className={active === "atacado" ? "active" : ""} href="/venda-por-atacado">
              Venda por atacado
            </Link>
            <Link className={active === "lojistas" ? "active" : ""} href="/venda-para-lojistas">
              Venda para Lojistas
            </Link>

            <Link className={active === "institucional" ? "active" : ""} href="/institucional">
              Institucional
            </Link>
            <Link className={`btn btn-sm ${active === "contato" ? "active" : ""}`} href="/contato">
              Contato
            </Link>
            <div className={`header-search${searchOpen ? " is-open" : ""}`} ref={searchWrapRef}>
              <button
                type="button"
                className="icon-btn header-search-trigger"
                aria-label={searchOpen ? "Fechar busca" : "Buscar"}
                aria-expanded={searchOpen}
                aria-controls="header-search-panel"
                onClick={() => setSearchOpen((current) => !current)}
              >
                {searchOpen ? <X size={16} /> : <Search size={16} />}
              </button>
              <form className="header-search-panel" id="header-search-panel" role="search" onSubmit={submitSearch}>
                <label htmlFor="header-search-input">Buscar seminovo</label>
                <div className="header-search-field">
                  <Search size={17} />
                  <input
                    ref={searchInputRef}
                    id="header-search-input"
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Modelo, marca, ano..."
                  />
                  <button type="submit" aria-label="Buscar veículos">
                    <Search size={16} />
                  </button>
                </div>
              </form>
            </div>
            <Link href="/minha-conta" className={`icon-btn ${active === "conta" ? "active" : ""}`} aria-label="Minha conta e favoritos">
              <Heart size={16} />
            </Link>
          </nav>
        </header>
      </div>

      {showEnvNote && (
        <div className="header-env-strip">
          <div className="container header-env-strip-inner">
            <span className="header-env-icon" aria-hidden="true">
              <ShieldCheck size={32} />
            </span>
            <p className="header-env-title">SAVOL SEMINOVOS</p>
            <span className="header-env-divider" aria-hidden="true" />
            <p className="header-env-copy">Veículos selecionados e atendimento com a segurança do Grupo SAVOL.</p>
          </div>
        </div>
      )}
    </>
  );
}
