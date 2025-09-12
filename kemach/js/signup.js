import { supabase } from './supabase-client.js';
import { updateHeaderAuthState } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    await updateHeaderAuthState();

    const signupForm = document.getElementById('signupForm');
    const messageEl = document.getElementById('authMessage');
    const submitBtn = signupForm.querySelector('button[type="submit"]');

    // Redirect if user is already logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.location.href = 'index.html';
        return;
    }

    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        messageEl.textContent = '';
        messageEl.className = 'form-message';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing up...';
        
        const email = signupForm.email.value;
        const password = signupForm.password.value;

        const { error } = await supabase.auth.signUp({ email, password });

        if (error) {
            messageEl.textContent = `Error: ${error.message}`;
            messageEl.className = 'form-message error visible';
        } else {
            messageEl.textContent = 'Success! Please check your email for a verification link to complete your registration.';
            messageEl.className = 'form-message success visible';
            signupForm.reset();
        }
        
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign Up';
    });
});