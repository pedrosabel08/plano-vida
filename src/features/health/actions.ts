"use server";
import { z } from "zod";
import { dateInput } from "@/features/planning/schema";
import { localToInstant } from "@/domain/health/time";
import {
  field,
  title,
  integer,
  saveEntry,
  failure,
} from "@/features/specialized/mutation";
import { requireOnboardedAccount } from "@/server/repositories/account";
import type { HealthData } from "./types";
import type { ActionState } from "@/types/actions";
export async function saveHealthSettings(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const p = z
    .object({
      sleep_target_minutes: z
        .union([integer(1440), z.literal("")])
        .transform((v) => (v === "" ? null : v)),
    })
    .safeParse({ sleep_target_minutes: field(form, "sleep_target_minutes") });
  return p.success
    ? saveEntry("save_health_setting", form, p.data)
    : { status: "error", message: p.error.issues[0].message };
}
export async function saveSleepLog(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase, profile } = await requireOnboardedAccount();
  const area = z.uuid().safeParse(field(form, "area_id"));
  if (!area.success) return failure();
  const { data, error } = await supabase.rpc("get_health_data", {
    p_area_id: area.data,
  });
  if (error) return failure();
  const existing = (data as unknown as HealthData).nights.find(
    (l) => l.id === field(form, "id"),
  );
  const timezone = existing?.timezone || profile.timezone;
  try {
    const bed_at = localToInstant(
        field(form, "bed_local"),
        timezone,
        field(form, "bed_offset"),
      ),
      wake_at = localToInstant(
        field(form, "wake_local"),
        timezone,
        field(form, "wake_offset"),
      );
    const minutes = (Date.parse(wake_at) - Date.parse(bed_at)) / 60000;
    if (minutes < 1 || minutes > 1440)
      return {
        status: "error",
        message:
          "O despertar deve ocorrer após o início, com duração entre 1 minuto e 24 horas.",
      };
    const energy = field(form, "energy");
    if (
      energy &&
      !z.coerce.number().int().min(1).max(5).safeParse(energy).success
    )
      return failure();
    return saveEntry("save_sleep_log", form, {
      bed_at,
      wake_at,
      timezone,
      energy: energy ? Number(energy) : null,
      is_deleted: field(form, "is_deleted") === "true",
    });
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
}
export async function saveHealthRoutine(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const p = z
    .object({
      title,
      kind: z.enum(["SLEEP", "ORAL"]),
      starts_on: dateInput,
      ends_on: z.union([dateInput, z.literal("")]).transform((v) => v || null),
    })
    .safeParse({
      title: field(form, "title"),
      kind: field(form, "kind"),
      starts_on: field(form, "starts_on"),
      ends_on: field(form, "ends_on"),
    });
  return p.success
    ? saveEntry("save_health_routine", form, p.data)
    : { status: "error", message: p.error.issues[0].message };
}
export async function saveRoutineCheck(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const p = z
    .object({
      routine_id: z.uuid(),
      completed_on: dateInput,
      completed: z.boolean(),
    })
    .safeParse({
      routine_id: field(form, "routine_id"),
      completed_on: field(form, "completed_on"),
      completed: field(form, "completed") === "true",
    });
  return p.success
    ? saveEntry("save_routine_check", form, p.data)
    : { status: "error", message: p.error.issues[0].message };
}
