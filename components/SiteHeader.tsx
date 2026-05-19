import Image from "next/image";
import Link from "next/link";
import { Heart, Phone, Search } from "lucide-react";

type HeaderProps = {
  active?: "home" | "veiculos" | "lojas" | "servicos" | "venda" | "institucional" | "contato";
};

export function SiteHeader({ active = "home" }: HeaderProps) {
  return (
    <>
      <div className="topbar">
        <div className="container topbar-inner">
          <p>
            <Phone size={14} /> Atendimento
          </p>
          <p>(11) 2222-3333</p>
          <p>Segunda a sexta: 08h às 19h | Sábado: 08h às 18h</p>
          <p>
            <Heart size={14} /> Meus favoritos
          </p>
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
          <Link className={active === "servicos" ? "active" : ""} href="/servicos">
            Serviços
          </Link>
          <Link className={active === "venda" ? "active" : ""} href="/venda-seu-carro">
            Venda seu carro
          </Link>
          <Link className={active === "institucional" ? "active" : ""} href="/institucional">
            Institucional
          </Link>
          <Link className="btn btn-sm" href="/contato">
            Contato
          </Link>
          <Link href="/veiculos" className="icon-btn" aria-label="Buscar">
            <Search size={16} />
          </Link>
        </nav>
      </header>
    </>
  );
}
