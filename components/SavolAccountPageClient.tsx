"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Eye, Heart, LogOut, UserRound } from "lucide-react";
import { useSavolAccount, type SavedVehicle } from "@/components/SavolAccountProvider";
import { VehicleOfferCard } from "@/components/VehicleOfferCard";
import type { ApiVehicle } from "@/types/home";

type VehiclesResponse = {
  items?: ApiVehicle[];
};

function toSavedVehicle(vehicle: ApiVehicle): SavedVehicle {
  return {
    id: vehicle.id,
    slug: vehicle.slug,
    url: vehicle.url,
    name: vehicle.name,
    subtitle: vehicle.subtitle,
    image: vehicle.image,
    gallery: vehicle.gallery,
    year: vehicle.year,
    transmission: vehicle.transmission,
    fuel: vehicle.fuel,
    km: vehicle.km,
    store: vehicle.store,
    oldPrice: vehicle.oldPrice,
    price: vehicle.price,
    qualityTag: vehicle.qualityTag,
    secondaryHighlights: vehicle.secondaryHighlights,
    brand: vehicle.brand,
    model: vehicle.model,
    version: vehicle.version,
    color: vehicle.color,
    city: vehicle.city,
    uf: vehicle.uf,
    molicar: vehicle.molicar,
    plate: vehicle.plate,
    armored: vehicle.armored,
    negotiating: vehicle.negotiating
  };
}

function SavedVehicleCard({ vehicle, index }: { vehicle: SavedVehicle; index: number }) {
  return (
    <VehicleOfferCard
      vehicleId={vehicle.id}
      name={vehicle.name}
      subtitle={vehicle.subtitle}
      image={vehicle.image}
      gallery={vehicle.gallery}
      year={vehicle.year}
      transmission={vehicle.transmission}
      fuel={vehicle.fuel}
      km={vehicle.km}
      store={vehicle.store}
      storeId={vehicle.storeId}
      oldPrice={vehicle.oldPrice}
      price={vehicle.price}
      detailUrl={vehicle.url}
      adUrl={vehicle.absoluteUrl}
      qualityTag={vehicle.qualityTag}
      secondaryHighlights={vehicle.secondaryHighlights}
      delay={index * 0.03}
      variant="grid"
      molicar={vehicle.molicar}
      plate={vehicle.plate}
      armored={vehicle.armored}
      negotiating={vehicle.negotiating}
    />
  );
}

export function SavolAccountPageClient() {
  const { favoriteIds, favorites, isSyncing, login, logout, register, user, visited, visitedIds } = useSavolAccount();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerPasswordConfirmation, setRegisterPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [catalogVehicles, setCatalogVehicles] = useState<SavedVehicle[]>([]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();

    fetch("/api/veiculos?per_page=200", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((payload: VehiclesResponse) => {
        const items = Array.isArray(payload.items) ? payload.items : [];
        setCatalogVehicles(items.map(toSavedVehicle));
      })
      .catch(() => setCatalogVehicles([]));

    return () => controller.abort();
  }, [user]);

  const resolvedFavorites = useMemo(
    () => favoriteIds.map((id) => favorites.find((vehicle) => vehicle.id === id) ?? catalogVehicles.find((vehicle) => vehicle.id === id)).filter(Boolean) as SavedVehicle[],
    [catalogVehicles, favoriteIds, favorites]
  );

  const resolvedVisited = useMemo(
    () => visitedIds.map((id) => visited.find((vehicle) => vehicle.id === id) ?? catalogVehicles.find((vehicle) => vehicle.id === id)).filter(Boolean) as SavedVehicle[],
    [catalogVehicles, visited, visitedIds]
  );

  const selectAuthMode = (nextMode: "login" | "register") => {
    setAuthMode(nextMode);
    setError("");
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanEmail = loginEmail.trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError("Informe um e-mail válido.");
      return;
    }

    if (!loginPassword) {
      setError("Informe sua senha.");
      return;
    }

    setSubmitting(true);
    const result = await login({ email: cleanEmail, password: loginPassword });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message || "Não foi possível entrar agora.");
      return;
    }

    setError("");
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanEmail = registerEmail.trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError("Informe um e-mail válido.");
      return;
    }

    if (registerPassword.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (registerPassword !== registerPasswordConfirmation) {
      setError("As senhas não conferem.");
      return;
    }

    setSubmitting(true);
    const result = await register({
      email: cleanEmail,
      password: registerPassword,
      passwordConfirmation: registerPasswordConfirmation
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message || "Não foi possível criar sua conta agora.");
      return;
    }

    setError("");
  };

  if (!user) {
    return (
      <section className="container account-page account-page--login">
        <div className="account-login-panel">
          <div>
            <p className="account-kicker">Área do cliente</p>
            <h1>Entre para ver seus favoritos</h1>
            <p>Salve veículos, acompanhe os modelos que você já visitou e retome sua busca quando quiser.</p>
          </div>

          <div className="account-auth-card">
            <div className="account-auth-tabs" role="tablist" aria-label="Acesso à conta">
              <button type="button" className={authMode === "login" ? "is-active" : ""} onClick={() => selectAuthMode("login")}>
                Entrar
              </button>
              <button type="button" className={authMode === "register" ? "is-active" : ""} onClick={() => selectAuthMode("register")}>
                Cadastrar
              </button>
            </div>

            {authMode === "login" ? (
              <form className="account-login-form" onSubmit={handleLogin}>
                <label>
                  <span>E-mail</span>
                  <input type="email" autoComplete="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} />
                </label>

                <label>
                  <span>Senha</span>
                  <input type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} />
                </label>

                {error ? <p className="account-form-error">{error}</p> : null}

                <button type="submit" disabled={submitting}>
                  <UserRound size={18} /> {submitting ? "Entrando..." : "Entrar"}
                </button>
              </form>
            ) : (
              <form className="account-login-form" onSubmit={handleRegister}>
                <label>
                  <span>E-mail</span>
                  <input type="email" autoComplete="email" value={registerEmail} onChange={(event) => setRegisterEmail(event.target.value)} />
                </label>

                <label>
                  <span>Nova senha</span>
                  <input type="password" autoComplete="new-password" value={registerPassword} onChange={(event) => setRegisterPassword(event.target.value)} />
                </label>

                <label>
                  <span>Confirmar senha</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={registerPasswordConfirmation}
                    onChange={(event) => setRegisterPasswordConfirmation(event.target.value)}
                  />
                </label>

                {error ? <p className="account-form-error">{error}</p> : null}

                <button type="submit" disabled={submitting}>
                  <UserRound size={18} /> {submitting ? "Cadastrando..." : "Cadastrar"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="container account-page">
      <header className="account-head">
        <div>
          <p className="account-kicker">Minha conta</p>
          <h1>Olá, {user.name}</h1>
          <p>{user.email}{isSyncing ? " · sincronizando..." : ""}</p>
        </div>
        <button type="button" className="account-logout-btn" onClick={logout}>
          <LogOut size={17} /> Sair
        </button>
      </header>

      <div className="account-stats">
        <article>
          <Heart size={20} />
          <strong>{favoriteIds.length}</strong>
          <span>Favoritos</span>
        </article>
        <article>
          <Eye size={20} />
          <strong>{visitedIds.length}</strong>
          <span>Visitados</span>
        </article>
      </div>

      <section className="account-section">
        <header>
          <h2>Favoritos</h2>
          <p>Veículos que você marcou com coração.</p>
        </header>

        {resolvedFavorites.length ? (
          <div className="account-vehicle-grid">
            {resolvedFavorites.map((vehicle, index) => (
              <SavedVehicleCard key={`favorite-${vehicle.id}`} vehicle={vehicle} index={index} />
            ))}
          </div>
        ) : (
          <article className="account-empty-state">
            <Heart size={22} />
            <h3>Nenhum favorito ainda</h3>
            <p>Toque no coração dos cards para montar sua lista.</p>
          </article>
        )}
      </section>

      <section className="account-section">
        <header>
          <h2>Veículos visitados</h2>
          <p>Últimos modelos que você abriu na página do veículo.</p>
        </header>

        {resolvedVisited.length ? (
          <div className="account-vehicle-grid">
            {resolvedVisited.map((vehicle, index) => (
              <SavedVehicleCard key={`visited-${vehicle.id}`} vehicle={vehicle} index={index} />
            ))}
          </div>
        ) : (
          <article className="account-empty-state">
            <Eye size={22} />
            <h3>Nenhum veículo visitado</h3>
            <p>Abra a página de um veículo para começar o histórico.</p>
          </article>
        )}
      </section>
    </section>
  );
}
