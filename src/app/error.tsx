"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="standalone-state">
      <span className="eyebrow">VAMOS TENTAR DE NOVO</span>
      <h1>Não foi possível carregar seu espaço.</h1>
      <p>Confira sua conexão e tente novamente.</p>
      <button className="button primary" onClick={reset}>
        Tentar novamente
      </button>
    </main>
  );
}
