import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from './stores/auth.js';

const routes = [
    {
        path: '/login',
        name: 'login',
        component: () => import('./components/AuthForm.vue'),
    },
    {
        path: '/',
        name: 'board',
        component: () => import('./components/BoardView.vue'),
        meta: { requiresAuth: true },
    },
];

const router = createRouter({
    history: createWebHashHistory(),
    routes,
});

router.beforeEach((to) => {
    const authStore = useAuthStore();

    // Wait for auth to be ready before guarding
    if (!authStore.ready) return true;

    if (to.meta.requiresAuth && !authStore.user) {
        return { name: 'login' };
    }

    if (to.name === 'login' && authStore.user) {
        return { name: 'board' };
    }

    return true;
});

export default router;
