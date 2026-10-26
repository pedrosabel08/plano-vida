export default function ReadingLoading() {
  return (
    <div
      className="reading-workspace reading-dashboard"
      role="status"
      aria-label="Carregando leitura"
      aria-busy="true"
    >
      <div className="panel reading-area-heading">
        <div>
          <h1>Leitura</h1>
          <p>Carregando sua biblioteca…</p>
        </div>
      </div>
      <div className="reading-loading-grid" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div className="panel reading-skeleton" key={i} />
        ))}
      </div>
    </div>
  );
}
