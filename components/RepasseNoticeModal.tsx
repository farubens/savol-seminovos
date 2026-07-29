"use client";

import { CircleHelp, Store, X } from "lucide-react";
import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function RepasseNoticeModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="repasse-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="repasse-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="repasse-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="repasse-modal-close" onClick={onClose} aria-label="Fechar aviso">
          <X size={20} />
        </button>

        <span className="repasse-modal-icon" aria-hidden="true">
          <Store size={24} />
        </span>
        <p className="repasse-modal-kicker">Condição de repasse</p>
        <h2 id="repasse-modal-title">Veículo em condição de repasse</h2>

        <div className="repasse-modal-explanation">
          <CircleHelp size={19} />
          <p>
            Este veículo é comercializado em condição de repasse e pode não passar pelo mesmo processo de
            preparação dos demais seminovos SAVOL. Consulte a unidade para conhecer seu estado de conservação,
            histórico, eventuais avarias informadas e as condições da negociação.
          </p>
        </div>

        <div className="repasse-modal-actions">
          <button type="button" onClick={onClose}>Entendi</button>
        </div>
      </section>
    </div>
  );
}
