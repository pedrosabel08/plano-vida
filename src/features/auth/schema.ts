import { z } from "zod";
export const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "Informe como prefere ser chamado.")
    .max(80, "Use até 80 caracteres."),
  timezone: z.string().refine((value) => {
    try {
      new Intl.DateTimeFormat("pt-BR", { timeZone: value });
      return value.includes("/") || value === "UTC";
    } catch {
      return false;
    }
  }, "Escolha um fuso horário válido."),
});
