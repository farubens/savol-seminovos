"use client";

import { useEffect, useMemo, useState } from "react";
import type { ApiStore } from "@/types/home";

const CONTACT_SUBJECTS = ["Seminovos", "Venda seu carro", "Venda por atacado", "Outros"];

type StoresResponse = {
  items?: ApiStore[];
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function ContactForm() {
  const [stores, setStores] = useState<ApiStore[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [storesLoading, setStoresLoading] = useState(true);

  const sortedStores = useMemo(
    () => [...stores].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [stores]
  );

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    fetch("/api/lojas?per_page=60", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((payload: StoresResponse | ApiStore[]) => {
        if (!isActive) return;
        const items = Array.isArray(payload) ? payload : payload.items;
        setStores(Array.isArray(items) ? items : []);
      })
      .catch((error: unknown) => {
        if (!isAbortError(error) && isActive) setStores([]);
      })
      .finally(() => {
        if (isActive) setStoresLoading(false);
      });

    return () => {
      isActive = false;
      if (!controller.signal.aborted) controller.abort();
    };
  }, []);

  return (
    <form className="contact-form" onSubmit={(event) => event.preventDefault()}>
      <label>
        <span>Nome</span>
        <input type="text" name="name" placeholder="Seu nome completo" />
      </label>

      <label>
        <span>E-mail</span>
        <input type="email" name="email" placeholder="seuemail@exemplo.com" />
      </label>

      <label>
        <span>Telefone</span>
        <input type="tel" name="phone" placeholder="(11) 99999-9999" />
      </label>

      <label>
        <span>Unidade</span>
        <select name="unit" defaultValue="">
          <option value="" disabled>
            {storesLoading ? "Carregando unidades..." : "Selecione uma unidade"}
          </option>
          <option value="sem-preferencia">Sem preferência</option>
          {sortedStores.map((store) => (
            <option key={store.id} value={store.name}>
              {store.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Assunto</span>
        <select name="subject" value={selectedSubject} onChange={(event) => setSelectedSubject(event.target.value)}>
          <option value="" disabled>
            Selecione o assunto
          </option>
          {CONTACT_SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      </label>

      {selectedSubject === "Outros" && (
        <label>
          <span>Qual assunto?</span>
          <input type="text" name="otherSubject" placeholder="Descreva o assunto" />
        </label>
      )}

      <label className="contact-form-message">
        <span>Mensagem</span>
        <textarea name="message" rows={6} placeholder="Escreva sua mensagem..." />
      </label>

      <button type="submit">Enviar mensagem</button>
    </form>
  );
}
