import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Store } from "lucide-react";

export function SellYourCarCta() {
  return (
    <section className="container sell">
      <div className="sell-brand-card">
        <Image src="/images/nova-savol-cta.png" alt="Consultora SAVOL com chave do carro" width={1154} height={1536} className="sell-brand-image" />
      </div>
      <div className="sell-copy">
        <h2>Venda seu carro</h2>
        <p>Aqui no Grupo SAVOL você vende seu carro com segurança, agilidade e atendimento especializado.</p>
        <Link href="/venda-seu-carro" className="btn">
          Quero vender
        </Link>
      </div>
      <ul className="sell-checks">
        <li>
          <ShieldCheck size={18} /> Transparência na avaliação
        </li>
        <li>
          <ShieldCheck size={18} /> Processo seguro
        </li>
        <li>
          <Store size={18} /> Divulgação pelo Grupo SAVOL
        </li>
      </ul>
    </section>
  );
}
