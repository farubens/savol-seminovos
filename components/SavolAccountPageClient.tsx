"use client";

import { type FormEvent, useState } from "react";
import { Eye, Heart, LogOut, UserRound } from "lucide-react";
import { useSavolAccount, type SavedVehicle } from "@/components/SavolAccountProvider";
import { VehicleOfferCard } from "@/components/VehicleOfferCard";

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
      oldPrice={vehicle.oldPrice}
      price={vehicle.price}
      detailUrl={vehicle.url}
      qualityTag={vehicle.qualityTag}
      secondaryHighlights={vehicle.secondaryHighlights}
      delay={index * 0.03}
      variant="grid"
      molicar={vehicle.molicar}
      plate={vehicle.plate}
    />
  );
}

export function SavolAccountPageClient() {
  const { favorites, login, logout, user, visited } = useSavolAccount();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError("Informe seu nome.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError("Informe um e-mail válido.");
      return;
    }

    login({ name: cleanName, email: cleanEmail });
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

          <form className="account-login-form" onSubmit={handleLogin}>
            <label>
              <span>Nome</span>
              <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
            </label>

            <label>
              <span>E-mail</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>

            {error ? <p className="account-form-error">{error}</p> : null}

            <button type="submit">
              <UserRound size={18} /> Entrar
            </button>
          </form>
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
          <p>{user.email}</p>
        </div>
        <button type="button" className="account-logout-btn" onClick={logout}>
          <LogOut size={17} /> Sair
        </button>
      </header>

      <div className="account-stats">
        <article>
          <Heart size={20} />
          <strong>{favorites.length}</strong>
          <span>Favoritos</span>
        </article>
        <article>
          <Eye size={20} />
          <strong>{visited.length}</strong>
          <span>Visitados</span>
        </article>
      </div>

      <section className="account-section">
        <header>
          <h2>Favoritos</h2>
          <p>Veículos que você marcou com coração.</p>
        </header>

        {favorites.length ? (
          <div className="account-vehicle-grid">
            {favorites.map((vehicle, index) => (
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
          <p>Últimos modelos que você abriu na single.</p>
        </header>

        {visited.length ? (
          <div className="account-vehicle-grid">
            {visited.map((vehicle, index) => (
              <SavedVehicleCard key={`visited-${vehicle.id}`} vehicle={vehicle} index={index} />
            ))}
          </div>
        ) : (
          <article className="account-empty-state">
            <Eye size={22} />
            <h3>Nenhum veículo visitado</h3>
            <p>Abra uma single de veículo para começar o histórico.</p>
          </article>
        )}
      </section>
    </section>
  );
}
