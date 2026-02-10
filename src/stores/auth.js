import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as authService from '../services/auth.js';

export const useAuthStore = defineStore('auth', () => {
    const user = ref(null);
    const ready = ref(false);

    function init() {
        authService.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                const sessionUser = authService.getUser(session);
                if (sessionUser) {
                    user.value = sessionUser;
                } else if (event === 'INITIAL_SESSION') {
                    user.value = null;
                }
            }

            if (event === 'SIGNED_OUT') {
                user.value = null;
            }

            if (!ready.value) {
                ready.value = true;
            }
        });
    }

    async function signUp(email, password) {
        await authService.signUp(email, password);
    }

    async function signIn(email, password) {
        await authService.signIn(email, password);
    }

    async function signOut() {
        await authService.signOut();
    }

    return { user, ready, init, signUp, signIn, signOut };
});
