import Image from "next/image";
import Link from "next/link";
import { Facebook, Headphones, Instagram, MapPin, ShieldCheck } from "lucide-react";

export function SavolMegaFooter() {
  return (
    <footer className="savol-footer">
      <section className="savol-footer-bottom">
        <div className="container savol-footer-bottom-grid">
          <div className="savol-footer-company">
            <Image src="/images/logo-branco.png" alt="Savol" width={220} height={62} className="savol-footer-logo" />
            <p>Somos um grupo empresarial familiar, sólido e com forte presença nas regiões do Grande ABC, São Paulo e Baixada Santista.</p>
            <div className="savol-footer-socials">
              <a href="https://www.facebook.com/gruposavol/" target="_blank" rel="noopener noreferrer" aria-label="Facebook Savol">
                <Facebook size={18} />
              </a>
              <a href="https://www.instagram.com/gruposavol/" target="_blank" rel="noopener noreferrer" aria-label="Instagram Savol">
                <Instagram size={18} />
              </a>
            </div>
          </div>

          <div className="savol-footer-nav">
            <h4>Navegação</h4>
            <div>
              <Link href="/institucional">Institucional</Link>
              <Link href="/veiculos">Veículos</Link>
            </div>
            <div>
              <Link href="/contato" className="savol-footer-contact-link">Contato</Link>
            </div>
          </div>

          <div className="savol-footer-hours">
            <h4>Horário de atendimento</h4>
            <p>
              <strong>Vendas:</strong>
              Segunda a sexta das 08h às 19h
              Sábado das 09h às 18h
            </p>
          </div>

          <div className="savol-footer-channels">
            <h4>Canais de atendimento</h4>
            <article>
              <Headphones size={20} />
              <div>
                <strong>Canal de Denúncia:</strong>
                <a href="mailto:ouvidoria@savol.com.br">ouvidoria@savol.com.br</a>
              </div>
            </article>
            <article>
              <ShieldCheck size={20} />
              <div>
                <strong>Canal LGPD:</strong>
                <a href="mailto:lgpd@savol.com.br">lgpd@savol.com.br</a>
              </div>
            </article>
          </div>

          <div className="savol-footer-address">
            <h4>Endereço administrativo</h4>
            <p>
              <MapPin size={18} /> Endereço: Av. Artur de Queirós, 701 - Casa Branca, Santo André - SP, 09015-510
            </p>
            <hr />
            <p>
              SAVOL | SAVOL VEÍCULOS LTDA
              CNPJ: 52.181.468.0001-23
            </p>
          </div>
        </div>

        <div className="savol-footer-copy">
          <div className="container">
            <p>© 2026 Grupo Savol. Todos os direitos reservados.</p>
          </div>
        </div>
      </section>
    </footer>
  );
}
