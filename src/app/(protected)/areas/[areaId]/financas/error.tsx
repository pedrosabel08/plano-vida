"use client";
export default function Error({ retry }: { retry: () => void }) {
  return (
    <div className="panel specialized-card">
      <h1>Não foi possível carregar Finanças</h1>
      <p role="alert">Confira sua conexão e a atualização do banco.</p>
      <button className="button primary" onClick={retry}>
        Tentar novamente
      </button>
    </div>
  );
}
