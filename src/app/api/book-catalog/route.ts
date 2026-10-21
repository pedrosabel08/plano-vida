import { requireOnboardedAccount } from "@/server/repositories/account";
import { searchCatalog } from "@/server/catalog/search";
export async function GET(request: Request) {
  await requireOnboardedAccount();
  const q = new URL(request.url).searchParams.get("q")?.trim() || "";
  const headers = { "Cache-Control": "private, no-store" };
  if (q.length < 2 || q.length > 120)
    return Response.json(
      { error: "Pesquise entre 2 e 120 caracteres." },
      { status: 400, headers },
    );
  try {
    return Response.json({ books: await searchCatalog(q) }, { headers });
  } catch {
    return Response.json(
      {
        error:
          "A busca está indisponível. Adicione manualmente ou tente novamente.",
      },
      { status: 503, headers },
    );
  }
}
