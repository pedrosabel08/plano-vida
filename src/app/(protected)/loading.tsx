export default function Loading() {
  return (
    <div className="stack" role="status" aria-label="Carregando seu espaço">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-hero" />
      <div className="area-grid">
        {[0, 1, 2].map((n) => (
          <div key={n} className="skeleton skeleton-card" />
        ))}
      </div>
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
