export interface INotes {
  id?: string;
  title: string;
  thinkings: string[];
}

export type IsLoggedType = "online" | "offline" | "loading";

export type WaitingResponseType =
  | "creatingNote"
  | "deletingNote"
  | "editingNote"
  | "none";
