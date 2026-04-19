export interface RemoteNote {
    id: string;
    title: string;
    contentList: string[];
}
interface NoteCreatePayload {
    title: string;
    contentList: string[];
}
interface NoteUpdatePayload {
    title?: string;
    contentList?: string[];
}
export declare const getNotesService: () => Promise<RemoteNote[]>;
export declare const createNoteService: <T = unknown>(payload: NoteCreatePayload) => Promise<T>;
export declare const updateNoteService: <T = unknown>(id: string, payload: NoteUpdatePayload) => Promise<T>;
export declare const deleteNoteService: (id: string) => Promise<void>;
export {};
