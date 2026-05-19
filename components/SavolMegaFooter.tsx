import Image from "next/image";
import Link from "next/link";
import { Facebook, Headphones, Instagram, Linkedin, MapPin, MessageCircle, PhoneCall, ShieldCheck } from "lucide-react";

type FooterUnit = {
  name: string;
  address: string;
  phone: string;
  whatsapp?: string;
};

type FooterBrandBlock = {
  key: string;
  label: string;
  logo: string;
  logoWidth: number;
  logoHeight: number;
  units: FooterUnit[];
};

const FOOTER_COLUMNS: FooterBrandBlock[][] = [
  [
    {
      key: "toyota",
      label: "TOYOTA",
      logo: "/images/brands/toyota.png",
      logoWidth: 130,
      logoHeight: 36,
      units: [
        {
          name: "Unidade Savol Toyota Santo André",
          address: "Av. Artur de Queirós, 469 - Casa Branca, Santo André - SP, 09015-510",
          phone: "(11) 4979-6000",
          whatsapp: "(11) 4979-6000"
        },
        {
          name: "Unidade Savol Toyota São Bernardo do Campo",
          address: "Av. Senador Vergueiro, 2332 - Anchieta, São Bernardo do Campo - SP, 09600-004",
          phone: "(11) 3809-1000",
          whatsapp: "(11) 4979-6000"
        },
        {
          name: "Unidade Savol Toyota Mauá",
          address: "Av. João Ramalho, 1853 - Vila Noêmia, Mauá - SP, 09371-520",
          phone: "(11) 4979-6000",
          whatsapp: "(11) 4979-6000"
        },
        {
          name: "Unidade Savol Toyota Praia Grande",
          address: "Av. Guilhermina, 1021 - Guilhermina, Praia Grande - SP, 11701-500",
          phone: "(13) 3476-7000",
          whatsapp: "(11) 4979-6000"
        },
        {
          name: "Unidade Savol Toyota Dom Pedro II",
          address: "Av. Dom Pedro II, 2500 - Santo André - SP, 09080-110",
          phone: "(11) 4979-6000",
          whatsapp: "(11) 4979-6000"
        }
      ]
    },
    {
      key: "volkswagen",
      label: "VW",
      logo: "/images/brands/volkswagen.png",
      logoWidth: 90,
      logoHeight: 38,
      units: [
        {
          name: "Unidade Savol Volkswagen Santo André",
          address: "Av. Artur de Queirós, 701 - Casa Branca, Santo André - SP, 09015-510",
          phone: "(11) 4435-1000",
          whatsapp: "(11) 4435-1000"
        },
        {
          name: "Unidade Savol Volkswagen Pereira Barreto",
          address: "Av. Pereira Barreto, 888 - Paraíso, Santo André - SP",
          phone: "(11) 4435-1000",
          whatsapp: "(11) 4435-1000"
        }
      ]
    }
  ],
  [
    {
      key: "peugeot",
      label: "PEUGEOT",
      logo: "/images/brands/peugeot.svg",
      logoWidth: 122,
      logoHeight: 32,
      units: [
        {
          name: "Unidade Savol Peugeot Santo André",
          address: "Av. Artur de Queirós, 426 - Casa Branca, Santo André - SP, 09015-510",
          phone: "(11) 3381-1000",
          whatsapp: "(11) 3381-1005"
        },
        {
          name: "Unidade Savol Peugeot São Bernardo do Campo",
          address: "Av. Senador Vergueiro, 2302 - Anchieta, São Bernardo do Campo - SP, 09600-004",
          phone: "(11) 3381-1000",
          whatsapp: "(11) 3381-1005"
        },
        {
          name: "Unidade Savol Peugeot São Caetano do Sul",
          address: "Av. Goiás, 2155 - Santo Antônio, São Caetano do Sul - SP, 09521-300",
          phone: "(11) 3381-1000",
          whatsapp: "(11) 3381-1005"
        }
      ]
    },
    {
      key: "citroen",
      label: "CITROËN",
      logo: "/images/brands/citroen.png",
      logoWidth: 124,
      logoHeight: 36,
      units: [
        {
          name: "Unidade Savol Citroën Santo André",
          address: "Av. Artur de Queirós, 424 - Casa Branca, Santo André - SP, 09015-510",
          phone: "(11) 3381-1001",
          whatsapp: "(11) 3381-1005"
        },
        {
          name: "Unidade Savol Citroën São Bernardo do Campo",
          address: "Av. Senador Vergueiro, 2302 - Rudge Ramos, São Bernardo do Campo - SP, 09600-004",
          phone: "(11) 3381-1001",
          whatsapp: "(11) 3381-1005"
        },
        {
          name: "Unidade Savol Citroën São Caetano do Sul",
          address: "Av. Goiás, 2155 - Santo Antônio, São Caetano do Sul - SP, 09521-300",
          phone: "(11) 3381-1001",
          whatsapp: "(11) 3381-1005"
        }
      ]
    }
  ],
  [
    {
      key: "fiat",
      label: "FIAT",
      logo: "/images/brands/fiat.svg",
      logoWidth: 98,
      logoHeight: 30,
      units: [
        {
          name: "Unidade Savol Fiat Santo André",
          address: "Av. Artur de Queirós, 414 - Casa Branca, Santo André - SP, 09015-510",
          phone: "(11) 3319-1000",
          whatsapp: "(11) 3319-1000"
        },
        {
          name: "Unidade Savol Fiat São Caetano do Sul",
          address: "Av. Goiás, 2145 - Barcelona, São Caetano do Sul - SP, 09550-001",
          phone: "(11) 3319-1000",
          whatsapp: "(11) 3319-1000"
        },
        {
          name: "Unidade Savol Fiat São Bernardo do Campo",
          address: "Av. Senador Vergueiro, 2348 - Anchieta, São Bernardo do Campo - SP, 09600-004",
          phone: "(11) 3319-1000",
          whatsapp: "(11) 3319-1000"
        }
      ]
    },
    {
      key: "kia",
      label: "KIA",
      logo: "/images/brands/kia.png",
      logoWidth: 110,
      logoHeight: 32,
      units: [
        {
          name: "Unidade Savol Kia Santo André",
          address: "Av. Artur de Queirós, 727 - Casa Branca, Santo André - SP, 09015-510",
          phone: "(11) 3381-1010",
          whatsapp: "(11) 4331-1000"
        },
        {
          name: "Unidade Savol Kia São Paulo",
          address: "Av. Nazaré, 444 - Ipiranga, São Paulo - SP, 04262-000",
          phone: "(11) 3381-1010",
          whatsapp: "(11) 4331-1000"
        }
      ]
    }
  ],
  [
    {
      key: "mg",
      label: "MG",
      logo: "/images/brands/mg.png",
      logoWidth: 90,
      logoHeight: 32,
      units: [
        {
          name: "Unidade Savol MG Motor",
          address: "Av. Goiás, 3048 - Santo Antônio, São Caetano do Sul - SP, 09521-310",
          phone: "(11) 3809-1010"
        }
      ]
    },
    {
      key: "jetour",
      label: "JETOUR",
      logo: "/images/brands/jetour.webp",
      logoWidth: 126,
      logoHeight: 30,
      units: [
        {
          name: "Unidade Savol Jetour",
          address: "Av. D. Pedro II, 2550 - Campestre, Santo André - SP",
          phone: "(11) 3319-1010"
        },
        {
          name: "Unidade Savol Jetour São Caetano do Sul",
          address: "Alameda Terracota, 545 - Piso 1 (Térreo) - Cerâmica, São Caetano do Sul - SP, 09531-190",
          phone: "(11) 3319-1010"
        }
      ]
    }
  ]
];

export function SavolMegaFooter() {
  return (
    <footer className="savol-footer">
      <section className="savol-footer-network">
        <div className="container savol-footer-network-grid">
          {FOOTER_COLUMNS.map((column, columnIndex) => (
            <div className="savol-footer-brand-column" key={`footer-col-${columnIndex}`}>
              {column.map((brand) => (
                <article className="savol-footer-brand-block" key={brand.key}>
                  <header className="savol-footer-brand-head">
                    <Image src={brand.logo} alt={brand.label} width={brand.logoWidth} height={brand.logoHeight} />
                    <strong>{brand.label}</strong>
                  </header>

                  <div className="savol-footer-units">
                    {brand.units.map((unit) => (
                      <div className="savol-footer-unit" key={`${brand.key}-${unit.name}`}>
                        <h4>{unit.name}</h4>
                        <p>{unit.address}</p>

                        <div className="savol-footer-contacts">
                          <span>
                            <PhoneCall size={14} /> Telefone: {unit.phone}
                          </span>
                          {unit.whatsapp ? (
                            <span className="savol-footer-contact-whatsapp">
                              <MessageCircle size={14} /> WhatsApp: {unit.whatsapp}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="savol-footer-bottom">
        <div className="container savol-footer-bottom-grid">
          <div className="savol-footer-company">
            <Image src="/images/logo-branco.png" alt="Savol" width={220} height={62} />
            <p>Somos um grupo empresarial familiar, sólido e com forte presença nas regiões do Grande ABC, São Paulo e Baixada Santista.</p>
            <div className="savol-footer-socials">
              <a href="#" aria-label="LinkedIn">
                <Linkedin size={18} />
              </a>
              <a href="#" aria-label="Facebook">
                <Facebook size={18} />
              </a>
              <a href="#" aria-label="Instagram">
                <Instagram size={18} />
              </a>
            </div>
          </div>

          <div className="savol-footer-nav">
            <h4>Navegação</h4>
            <div>
              <Link href="/institucional">Institucional</Link>
              <Link href="/veiculos">Veículos</Link>
              <Link href="/servicos">Serviços</Link>
            </div>
            <div>
              <Link href="/ajuda">Ajuda</Link>
              <Link href="/contato">Contato</Link>
            </div>
          </div>

          <div className="savol-footer-hours">
            <h4>Horário de atendimento</h4>
            <p>
              <strong>Vendas:</strong>
              Segunda a sexta das 08h às 19h
              Sábado das 09h às 18h
            </p>
            <p>
              <strong>Pós-vendas e peças:</strong>
              Segunda a sexta das 08h às 18h
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
              <MapPin size={18} /> Av. Eng. Caetano Álvares, 5000
              São Paulo - SP
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

