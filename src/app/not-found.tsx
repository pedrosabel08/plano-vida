import Link from "next/link";
export default function NotFound() {
  return (
    <main className="standalone-state">
      <span className="eyebrow">PÁGINA NÃO ENCONTRADA</span>
      <h1>Vamos voltar ao seu caminho.</h1>
      <Link href="/inicio" className="button primary">
        Ir para o início
      </Link>
    </main>
  );
}
