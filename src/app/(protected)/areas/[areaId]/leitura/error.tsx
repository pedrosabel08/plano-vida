"use client";
export default function ReadingError({ reset }: { reset: () => void }) {
  return (
    <section className="panel reading-enable" role="alert">
      <h1>Não foi possível carregar Leitura.</h1>
      <p>
        Confira sua conexão e tente novamente. Seus registros continuam salvos.
      </p>
      <button className="button secondary" onClick={reset}>
        Tentar novamente
      </button>
    </section>
  );
}
