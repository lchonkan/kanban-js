import { supabase } from './supabase.js';

export async function signUp(email, password) {
    const redirectTo = window.location.origin + window.location.pathname;
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
    });
    if (error) throw error;
    return data;
}

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
}

export async function getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
}

export async function resendConfirmation(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw error;
}

export function getUser(session) {
    return session?.user ?? null;
}
