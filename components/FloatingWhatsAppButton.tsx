import Image from "next/image";

const WHATSAPP_PHONE = "551122223333";
const WHATSAPP_TEXT = encodeURIComponent("Ola! Quero atendimento da Savol.");

export function FloatingWhatsAppButton() {
  return (
    <a
      href={`https://wa.me/${WHATSAPP_PHONE}?text=${WHATSAPP_TEXT}`}
      className="floating-whatsapp-btn"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Atendimento pelo WhatsApp"
    >
      <Image
        src="/images/whatsapp_icon.png"
        alt=""
        width={28}
        height={28}
        className="floating-whatsapp-icon"
      />
      <span>WhatsApp</span>
    </a>
  );
}
