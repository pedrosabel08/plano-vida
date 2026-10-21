import { Sprout } from "lucide-react";
import Link from "next/link";
export function Brand() {
  return (
    <Link href="/inicio" className="brand" aria-label="Plano de Vida — início">
      <span className="brand-mark">
        <Sprout size={25} strokeWidth={1.7} />
      </span>
      <span>
        Plano de Vida<span className="brand-caption">UM PASSO DE CADA VEZ</span>
      </span>
    </Link>
  );
}
