"use client";

import { useRef, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";

const testimonials = [
  {
    id: "marcos",
    name: "Marcos Aparecido Lima",
    avatar: "ML",
    period: "há 2 meses",
    source: "3 avaliações no Google",
    message:
      "Gostaria de registrar meu agradecimento pelo atendimento recebido recentemente na compra de um T-Cross, em especial ao Sr. Daniel Palomares, extremamente gentil, educado e muito profissional em todos os momentos. Sua atenção, paciência e disposição em ajudar fizeram toda a diferença na minha experiência. A SAVOL tem muita sorte em tê-lo como profissional. Parabéns pelo excelente trabalho e muito obrigado pelo cuidado e dedicação!"
  },
  {
    id: "fabio",
    name: "Fabio Anicheli",
    avatar: "FA",
    period: "há 2 meses",
    source: "5 avaliações no Google",
    message:
      "Fui até a SAVOL para comprar um Virtus Exclusive e fui atendido pelo vendedor Vitor. Ele foi transparente e atencioso durante todo o processo: pedido do veículo, emissão do boleto para pagamento, entrega e pós-venda. Nota 10, muito atencioso. Indico muito este profissional."
  },
  {
    id: "leandro",
    name: "Leandro Cardozo Soares",
    avatar: "LS",
    period: "há 2 meses",
    source: "19 avaliações no Google",
    message:
      "Quero deixar registrado o alto profissionalismo da recepcionista Brenda Helloa, que atenciosamente e prontamente me ajudou com um favor sobre histórico de revisão de um veículo que possuo. Sua dedicação é fora do normal. Parabéns Brenda e SAVOL por ter uma profissional desta qualidade."
  },
  {
    id: "thayane",
    name: "Thayane Moitinho",
    avatar: "TM",
    period: "há 3 meses",
    source: "5 avaliações no Google",
    message:
      "Só tenho elogios para essa concessionária. Em todas as revisões e reparos, o atendimento dos consultores técnicos foi impecável: educados, atenciosos e muito profissionais. Sempre me senti bem orientada e segura com o serviço prestado. Parabéns à equipe!"
  },
  {
    id: "audrey",
    name: "Audrey Cossovan",
    avatar: "AC",
    period: "há 6 meses",
    source: "12 avaliações no Google",
    message:
      "Atendimento excelente. O consultor Alyson me atendeu prontamente, foi muito solícito e me auxiliou na questão do carro. O atendimento foi excepcional e toda a evolução do processo foi realizada com muito sucesso. Obrigado a todos."
  },
  {
    id: "fabiana",
    name: "Fabiana Cardoso",
    avatar: "FC",
    period: "há 11 meses",
    source: "11 avaliações no Google",
    message:
      "Esse é meu segundo carro zero comprado nessa concessionária da Arthur de Queiroz. Estou amando meu T-Cross Highline 2025 e fui muito bem atendida pelo consultor Oliveira, que explicou tudo direitinho durante o processo. Eu e minha família ficamos ainda mais encantados com o conforto, estabilidade e segurança. Super recomendo comprar nessa concessionária."
  }
];

export function TestimonialsSection() {
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef({
    pointerId: -1,
    isDragging: false,
    startX: 0,
    startScrollLeft: 0
  });

  const scrollByStep = (direction: "left" | "right") => {
    const slider = sliderRef.current;
    if (!slider) return;
    const firstCard = slider.querySelector<HTMLElement>(".testimonial-card");
    const step = firstCard ? firstCard.offsetWidth + 20 : Math.floor(slider.clientWidth * 0.9);
    slider.scrollBy({
      left: direction === "right" ? step : -step,
      behavior: "smooth"
    });
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const slider = sliderRef.current;
    if (!slider) return;
    dragState.current.pointerId = event.pointerId;
    dragState.current.isDragging = true;
    dragState.current.startX = event.clientX;
    dragState.current.startScrollLeft = slider.scrollLeft;
    slider.classList.add("is-dragging");
    slider.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const slider = sliderRef.current;
    if (!slider || !dragState.current.isDragging) return;
    const delta = event.clientX - dragState.current.startX;
    slider.scrollLeft = dragState.current.startScrollLeft - delta;
  };

  const onPointerUpOrCancel = (event: PointerEvent<HTMLDivElement>) => {
    const slider = sliderRef.current;
    if (!slider || dragState.current.pointerId !== event.pointerId) return;
    dragState.current.isDragging = false;
    dragState.current.pointerId = -1;
    slider.classList.remove("is-dragging");
    if (slider.hasPointerCapture(event.pointerId)) {
      slider.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <section className="testimonials-wrap">
      <div className="container testimonials-shell">
        <p className="testimonials-kicker">
          <span>SAVOL</span>
          <span>Excelência que gera confiança</span>
        </p>

        <div className="section-title-row testimonials-title-row">
          <h2>O que dizem nossos clientes</h2>
          <div className="testimonials-nav">
            <button
              type="button"
              className="testimonials-nav-btn"
              aria-label="Depoimento anterior"
              onClick={() => scrollByStep("left")}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="testimonials-nav-btn"
              aria-label="Próximo depoimento"
              onClick={() => scrollByStep("right")}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div
          className="testimonials-carousel"
          ref={sliderRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUpOrCancel}
          onPointerCancel={onPointerUpOrCancel}
        >
          {testimonials.map((testimonial) => (
            <article className="testimonial-card" key={testimonial.id}>
              <div className="testimonial-card-top">
                <div className="testimonial-rating">
                  <div className="testimonial-stars" aria-label="5 estrelas">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={`star-${testimonial.id}-${index}`} size={18} fill="currentColor" strokeWidth={0} />
                    ))}
                  </div>
                  <span className="testimonial-time">{testimonial.period}</span>
                </div>

                <span className="testimonial-quote-icon" aria-hidden="true">
                  <Quote size={20} />
                </span>
              </div>

              <p className="testimonial-message">"{testimonial.message}"</p>
              <div className="testimonial-divider" />

              <div className="testimonial-footer">
                <span className="testimonial-avatar">{testimonial.avatar}</span>
                <div>
                  <strong>{testimonial.name}</strong>
                  <p>{testimonial.source}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="testimonials-brand-line" aria-hidden="true">
          <span />
          SAVOL
          <span />
        </p>
      </div>
    </section>
  );
}
