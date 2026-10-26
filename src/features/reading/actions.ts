"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireOnboardedAccount } from "@/server/repositories/account";
import type { ActionState } from "@/types/actions";
import type { Json } from "@/types/database";
import { bookSchema, logSchema, referenceSchema } from "./schema";
const field = (f: FormData, k: string) => String(f.get(k) || "");
function failed(code?: string): ActionState {
  return {
    status: "error",
    message:
      code === "40001"
        ? "Os dados mudaram. Recarregue antes de editar."
        : code === "23514"
          ? "Confira as páginas: o progresso não pode ultrapassar o total conhecido. Verifique também se o módulo está habilitado."
          : code === "22023"
            ? "Esta operação já foi usada ou a fonte de medição está protegida."
            : "Não foi possível salvar. Confira os dados e tente novamente.",
  };
}
export async function configureReading(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase } = await requireOnboardedAccount();
  const id = z.uuid().safeParse(field(form, "area_id"));
  if (!id.success) return failed();
  const { error } = await supabase.rpc("set_reading_module", {
    p_area_id: id.data,
    p_enabled: field(form, "enabled") !== "false",
  });
  if (error) return failed(error.code);
  revalidatePath("/", "layout");
  return { status: "success", message: "Módulo Leitura atualizado." };
}
export async function saveBook(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase } = await requireOnboardedAccount();
  const mid = z.uuid().safeParse(field(form, "area_module_id"));
  const id = field(form, "id");
  if (!mid.success || (id && !z.uuid().safeParse(id).success)) return failed();
  const parsed = bookSchema.safeParse({
    title: field(form, "title"),
    authors: field(form, "authors")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean),
    total_pages:
      field(form, "total_pages") === "" ? null : field(form, "total_pages"),
    initial_tracking_page: field(form, "initial_tracking_page"),
    cover_url: field(form, "cover_url"),
    isbn_10: field(form, "isbn_10"),
    isbn_13: field(form, "isbn_13"),
    status: field(form, "status"),
  });
  if (!parsed.success)
    return { status: "error", message: parsed.error.issues[0].message };
  let external = null;
  if (!id && field(form, "external_reference")) {
    try {
      const result = referenceSchema.safeParse(
        JSON.parse(field(form, "external_reference")),
      );
      if (!result.success) return failed();
      external = result.data;
    } catch {
      return failed();
    }
  }
  const { error } = await supabase.rpc("save_reading_book", {
    p_module_id: mid.data,
    p_book: {
      ...parsed.data,
      external_reference: external,
      expected_updated_at: field(form, "expected_updated_at"),
    } as Json,
    p_book_id: id || null,
  });
  if (error) return failed(error.code);
  revalidatePath("/", "layout");
  return { status: "success", message: "Livro salvo." };
}
export async function saveReadingLog(
  goalId: string | null,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireOnboardedAccount();
  const book = z.uuid().safeParse(field(form, "book_id"));
  const id = field(form, "id");
  if (!book.success || (id && !z.uuid().safeParse(id).success)) return failed();
  // Goal context is bound by the form, but still treated as untrusted input.
  // All entry points persist through the same canonical ReadingLog operation.
  if (goalId) {
    if (!z.uuid().safeParse(goalId).success) return failed();
    const { data: source, error: sourceError } = await supabase
      .from("goal_sources")
      .select("kind,module,metric,scope,area_module_id,book_id")
      .eq("user_id", user.id)
      .eq("goal_id", goalId)
      .single();
    if (
      sourceError ||
      !source ||
      source.kind !== "MODULE" ||
      source.module !== "READING" ||
      source.metric !== "PAGES_READ" ||
      !source.area_module_id ||
      (source.scope !== "ALL_BOOKS" && source.scope !== "BOOK") ||
      (source.scope === "BOOK" && source.book_id !== book.data)
    ) {
      return failed();
    }
    const { data: selectedBook, error: bookError } = await supabase
      .from("books")
      .select("id")
      .eq("user_id", user.id)
      .eq("area_module_id", source.area_module_id)
      .eq("id", book.data)
      .single();
    if (bookError || !selectedBook) return failed();
  }
  const parsed = logSchema.safeParse({
    read_on: field(form, "read_on"),
    pages: field(form, "pages"),
    operation_id: field(form, "operation_id"),
    is_deleted: field(form, "is_deleted") === "true",
  });
  if (!parsed.success)
    return { status: "error", message: parsed.error.issues[0].message };
  const { error } = await supabase.rpc("save_reading_log", {
    p_book_id: book.data,
    p_log: {
      ...parsed.data,
      expected_updated_at: field(form, "expected_updated_at"),
    },
    p_log_id: id || null,
  });
  if (error) return failed(error.code);
  revalidatePath("/", "layout");
  return {
    status: "success",
    message: parsed.data.is_deleted
      ? "Registro removido."
      : "Leitura registrada.",
  };
}
