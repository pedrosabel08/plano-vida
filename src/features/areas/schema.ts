import { z } from "zod";
import { AREA_ICONS } from "./constants";
export const areaSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Dê um nome à área.")
    .max(80, "Use até 80 caracteres."),
  icon: z.enum(AREA_ICONS, { error: "Escolha um ícone." }),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor hexadecimal válida.")
    .transform((value) => value.toUpperCase()),
});
export type AreaInput = z.infer<typeof areaSchema>;
export const areaIdSchema = z.uuid();
export const reorderSchema = z
  .array(z.uuid())
  .refine(
    (ids) => new Set(ids).size === ids.length,
    "A lista contém áreas repetidas.",
  );
