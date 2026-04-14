interface NoteCreatePayload {
    title: string;
    contentList: string[];
}
interface NoteUpdatePayload {
    title?: string;
    contentList?: string[];
}
export interface RemoteNote {
    id: string;
    title: string;
    contentList: string[];
}
export declare const getNotes: () => Promise<RemoteNote[]>;
export declare const createNote: <T = unknown>(payload: NoteCreatePayload) => Promise<T>;
export declare const updateNote: <T = unknown>(id: string, payload: NoteUpdatePayload) => Promise<T>;
export {};
