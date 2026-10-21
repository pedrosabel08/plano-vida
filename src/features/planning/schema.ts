import { z } from "zod";
import { compare, decimal, ZERO } from "@/domain/performance/fraction";
import { validDate, mondayForDate } from "@/lib/dates/weeks";
export const decimalInput = z
  .string()
  .trim()
  .max(40, "Use até 40 caracteres para o valor.")
  .regex(
    /^\d+(?:[.,]\d+)?$/,
    "Informe um número válido, sem separador de milhares.",
  )
  .transform((v) => v.replace(",", "."));
export const positiveInput = decimalInput.refine(
  (v) => compare(decimal(v), ZERO) > 0,
  "O alvo deve ser maior que zero.",
);
export const dateInput = z.string().refine(validDate, "Data inválida.");
export const weekInput = dateInput.refine(
  (v) => mondayForDate(v) === v,
  "Selecione o início de uma semana.",
);
export const optionalId = z
  .union([z.uuid(), z.literal("")])
  .transform((v) => v || null);
export const goalSchema = z
  .object({
    title: z.string().trim().min(1, "Informe o título da meta.").max(160),
    type: z.enum(["QUANTITY", "FREQUENCY", "AVERAGE", "COMPLETION"]),
    unit: z.string().trim().min(1, "Informe a unidade.").max(40),
    target: positiveInput,
    basis: z.enum(["WEEKLY", "DAILY"]),
    frequency_mode: z.enum(["OCCURRENCES", "DISTINCT_DAYS"]),
    expected_observations: z.coerce.number().int().min(1).max(7),
    observation_unit: z.string().trim().min(1).max(40),
    objective_id: optionalId,
    state: z.enum(["ACTIVE", "CANCELLED"]),
  })
  .superRefine((v, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    if (v.type === "FREQUENCY" && decimal(v.target).d !== "1")
      issue("Frequência exige um alvo inteiro.");
    if (v.type === "COMPLETION" && (v.target !== "1" || v.basis !== "WEEKLY"))
      issue("Conclusão é binária e semanal.");
    if (v.type === "AVERAGE" && v.basis !== "WEEKLY")
      issue("A meta de média usa observações da semana.");
    if (
      v.frequency_mode === "DISTINCT_DAYS" &&
      (v.type !== "FREQUENCY" ||
        Number(v.target) * (v.basis === "DAILY" ? 7 : 1) > 7)
    )
      issue("A contagem de dias não pode planejar mais de sete dias.");
  });
export const objectiveSchema = z
  .object({
    title: z.string().trim().min(1, "Informe o título do objetivo.").max(160),
    area_id: optionalId,
    type: z.enum(["QUANTITATIVE", "PERCENTAGE", "QUALITATIVE"]),
    target: z.union([positiveInput, z.null()]),
    current_value: z.union([decimalInput, z.null()]),
    unit: z.string().trim().max(40).nullable(),
    due_date: z.union([dateInput, z.literal("")]).transform((v) => v || null),
    state: z.enum(["ACTIVE", "COMPLETED"]),
  })
  .superRefine((v, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    if (v.type === "QUALITATIVE") {
      if (v.target !== null || v.current_value !== null || v.unit !== null)
        issue("Objetivos qualitativos não exigem progresso numérico.");
    } else {
      if (v.target === null || v.current_value === null || !v.unit)
        issue("Informe alvo, progresso e unidade.");
      if (
        v.type === "PERCENTAGE" &&
        (v.target !== "100" || v.unit !== "%" || Number(v.current_value) > 100)
      )
        issue("O progresso percentual deve estar entre 0 e 100.");
    }
  });
export const recordSchema = z.object({
  recorded_on: dateInput,
  value: decimalInput.nullable(),
  completed: z.boolean().nullable(),
  operation_id: z.uuid(),
});
