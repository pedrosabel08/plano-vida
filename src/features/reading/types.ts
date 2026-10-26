export type AreaModule = {
  id: string;
  user_id: string;
  area_id: string;
  module: "READING" | "STUDIES";
  enabled: boolean;
  created_at: string;
  updated_at: string;
};
export type BookStatus = "WANT_TO_READ" | "READING" | "FINISHED" | "ABANDONED";
export type Book = {
  id: string;
  user_id: string;
  area_module_id: string;
  title: string;
  authors: string[];
  total_pages: number | null;
  initial_tracking_page: number;
  cover_url: string | null;
  isbn_10: string | null;
  isbn_13: string | null;
  status: BookStatus;
  created_at: string;
  updated_at: string;
};
export type ReadingBook = Book & { current_page: number };
export type ReadingLog = {
  id: string;
  user_id: string;
  book_id: string;
  read_on: string;
  pages: number;
  operation_id: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};
export type ExternalBookReference = {
  id: string;
  user_id: string;
  book_id: string;
  provider: "OPEN_LIBRARY";
  external_id: string;
  looked_up_at: string;
  imported_at: string;
  metadata: Record<string, string | number | null>;
};
export type ReadingData = {
  module: AreaModule | null;
  books: ReadingBook[];
  logs: ReadingLog[];
  references: ExternalBookReference[];
};
export const BOOK_STATUS: Record<BookStatus, string> = {
  WANT_TO_READ: "Quero ler",
  READING: "Lendo",
  FINISHED: "Concluído",
  ABANDONED: "Abandonado",
};
