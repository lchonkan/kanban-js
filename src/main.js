import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router.js';
import { supabase } from './services/supabase.js';

// Handle Supabase email confirmation redirect.
// With hash-based routing, the auth tokens land in the hash fragment
// (e.g. #access_token=…&refresh_token=…). Vue Router would interpret
// this as a route path and overwrite the hash before the Supabase
// client's async initializer can read it. We intercept the tokens
// here, set the session manually, and clean the URL for the router.
const hash = window.location.hash.substring(1);
if (hash.includes('access_token=') && hash.includes('refresh_token=')) {
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (accessToken && refreshToken) {
        // Clean the hash immediately so Vue Router starts with a valid route
        history.replaceState(null, '', window.location.pathname + '#/');
        // Set the session — onAuthStateChange will fire SIGNED_IN
        await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
        });
    }
}

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
