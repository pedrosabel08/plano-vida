import { z } from "zod";
import { dateInput } from "@/features/planning/schema";
import { normalizeIsbn } from "@/services/book-catalog/provider";
const page = z.coerce.number().int().min(0).max(2147483647);
const isbn = (pattern: RegExp) =>
  z
    .string()
    .transform((v) => normalizeIsbn(v) || null)
    .refine((v) => v === null || pattern.test(v), "ISBN inválido.");
export const bookSchema = z
  .object({
    title: z.string().trim().min(1, "Informe o título.").max(200),
    authors: z.array(z.string().trim().min(1).max(160)).max(20),
    total_pages: page.positive().nullable(),
    initial_tracking_page: page,
    cover_url: z
      .union([z.url().startsWith("https://").max(2048), z.literal("")])
      .transform((v) => v || null),
    isbn_10: isbn(/^[0-9]{9}[0-9X]$/),
    isbn_13: isbn(/^[0-9]{13}$/),
    status: z.enum(["WANT_TO_READ", "READING", "FINISHED", "ABANDONED"]),
  })
  .refine(
    (v) => v.total_pages === null || v.initial_tracking_page <= v.total_pages,
    "A página inicial não pode ultrapassar o total.",
  );
export const logSchema = z.object({
  read_on: dateInput,
  pages: page.positive("Informe páginas inteiras maiores que zero."),
  operation_id: z.uuid(),
  is_deleted: z.boolean(),
});
export const referenceSchema = z.object({
  provider: z.literal("OPEN_LIBRARY"),
  external_id: z.string().regex(/^\/works\/OL[0-9]+W$/),
  looked_up_at: z.iso.datetime(),
  metadata: z.object({ suggested_pages: page.positive().nullable() }),
});
