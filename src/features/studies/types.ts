export type OwnedEntry = {
  id: string;
  user_id: string;
  area_id: string;
  created_at: string;
  updated_at: string;
};
export type StudySubject = OwnedEntry & {
  title: string;
  target_minutes: number | null;
  archived: boolean;
  objective_id: string | null;
};
export type StudySession = OwnedEntry & {
  subject_id: string;
  studied_on: string;
  minutes: number;
  notes: string;
  is_deleted: boolean;
};
export type StudiesData = {
  subjects: StudySubject[];
  sessions: StudySession[];
};
