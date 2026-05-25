import Image from "next/image";
import Link from "next/link";
import { Facebook, Headphones, Instagram, Linkedin, MapPin, ShieldCheck } from "lucide-react";

export function SavolMegaFooter() {
  return (
    <footer className="savol-footer">
      <section className="savol-footer-bottom">
        <div className="container savol-footer-bottom-grid">
          <div className="savol-footer-company">
            <Image src="/images/logo-branco.png" alt="Savol" width={220} height={62} className="savol-footer-logo" />
            <p>Somos um grupo empresarial familiar, sólido e com forte presença nas regiões do Grande ABC, São Paulo e Baixada Santista.</p>
            <div className="savol-footer-socials">
              <button type="button" aria-label="LinkedIn">
                <Linkedin size={18} />
              </button>
              <button type="button" aria-label="Facebook">
                <Facebook size={18} />
              </button>
              <button type="button" aria-label="Instagram">
                <Instagram size={18} />
              </button>
            </div>
          </div>

          <div className="savol-footer-nav">
            <h4>Navegação</h4>
            <div>
              <Link href="/institucional">Institucional</Link>
              <Link href="/veiculos">Veículos</Link>
            </div>
            <div>
              <button type="button" aria-disabled="true" className="savol-footer-contact-link">Contato</button>
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
                <span>ouvidoria@savol.com.br</span>
              </div>
            </article>
            <article>
              <ShieldCheck size={20} />
              <div>
                <strong>Canal LGPD:</strong>
                <span>lgpd@savol.com.br</span>
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
