declare const useAuthentication: () => {
    user: import("@supabase/auth-js").User | null;
    loading: boolean;
    logout: () => Promise<void>;
};
export default useAuthentication;
