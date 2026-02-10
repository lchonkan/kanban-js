<template>
    <div class="auth-page-wrapper">
        <div class="auth-container">
            <h1 class="auth-brand">KAN BAN JS</h1>
            <div class="auth-card">
                <h2>{{ isSignUp ? 'Create Account' : 'Sign In' }}</h2>
                <form @submit.prevent="handleSubmit" autocomplete="on">
                    <div class="auth-field">
                        <label for="auth-email">Email</label>
                        <input
                            id="auth-email"
                            v-model="email"
                            type="email"
                            placeholder="you@example.com"
                            autocomplete="email"
                            required
                        />
                    </div>
                    <div class="auth-field">
                        <label for="auth-password">Password</label>
                        <input
                            id="auth-password"
                            v-model="password"
                            type="password"
                            placeholder="••••••••"
                            autocomplete="current-password"
                            minlength="6"
                            required
                        />
                    </div>
                    <p class="auth-error">{{ errorMsg }}</p>
                    <button class="auth-submit-btn" type="submit" :disabled="submitting">
                        {{ submitLabel }}
                    </button>
                </form>
                <p class="auth-toggle-text">
                    <a href="#" @click.prevent="toggleMode">{{ toggleLabel }}</a>
                </p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth.js';

const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const errorMsg = ref('');
const isSignUp = ref(false);
const submitting = ref(false);

const submitLabel = computed(() => {
    if (submitting.value) return isSignUp.value ? 'Creating account…' : 'Signing in…';
    return isSignUp.value ? 'Create Account' : 'Sign In';
});

const toggleLabel = computed(() =>
    isSignUp.value ? 'Already have an account? Sign in' : "Don't have an account? Create one"
);

function toggleMode() {
    isSignUp.value = !isSignUp.value;
    errorMsg.value = '';
}

async function handleSubmit() {
    errorMsg.value = '';

    const trimmedEmail = email.value.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        errorMsg.value = 'Please enter a valid email address.';
        return;
    }
    if (isSignUp.value && password.value.length < 6) {
        errorMsg.value = 'Password must be at least 6 characters.';
        return;
    }

    submitting.value = true;

    try {
        if (isSignUp.value) {
            await authStore.signUp(trimmedEmail, password.value);
        } else {
            await authStore.signIn(trimmedEmail, password.value);
        }
    } catch (err) {
        errorMsg.value = err.message || 'Authentication failed. Please try again.';
        submitting.value = false;
    }
}

function resetForm() {
    email.value = '';
    password.value = '';
    errorMsg.value = '';
    isSignUp.value = false;
    submitting.value = false;
}

defineExpose({ resetForm });
</script>

<style scoped>
.auth-page-wrapper {
    position: fixed;
    inset: 0;
    z-index: 200;
    background-color: var(--auth-bg);
    overflow-y: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fade-in 0.25s ease-out forwards;
}

form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}
</style>
