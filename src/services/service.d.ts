export interface RemoteNote {
    id: string;
    title: string;
    contentList: string[];
}
export interface NoteResponse {
    id: string;
    userId: string;
    title: string;
    contentList: any[];
    createdAt: string;
    updatedAt: string;
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
export declare const createNoteService: (payload: NoteCreatePayload) => Promise<NoteResponse>;
export declare const updateNoteService: (id: string, payload: NoteUpdatePayload) => Promise<NoteResponse>;
export declare const deleteNoteService: (id: string) => Promise<{
    id: string;
}>;
export {};
