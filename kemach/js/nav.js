import { supabase } from './supabase-client.js';

// This is the single source of truth for the site's navigation bar.
// It runs on every page that includes the script tag.

document.addEventListener('DOMContentLoaded', async () => {
    const navContainer = document.getElementById('main-nav-container');
    if (!navContainer) {
        console.error("Fatal Error: Navigation container with ID 'main-nav-container' not found.");
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        // --- USER IS LOGGED IN ---
        
        // Check for unread messages
        const { data: convos } = await supabase.rpc('get_my_conversations');
        const hasUnread = convos && convos.some(convo => convo.has_unread_user);
        const unreadIndicatorHTML = hasUnread ? `<span class="unread-indicator"></span>` : '';

        // Check for admin role
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        
        let navHTML = '';
        if (profile && profile.role === 'admin') {
            // --- ADMIN NAVIGATION ---
            navHTML = `
                <a href="index.html">My Order</a>
                <a href="messages.html" class="nav-link-messages">My Messages ${unreadIndicatorHTML}</a>
                <a href="profile.html">My Profile</a>
                <a href="admin.html">Admin Panel</a>
                <a href="#" id="logoutLink">Logout</a>
            `;
        } else {
            // --- REGULAR USER NAVIGATION ---
            navHTML = `
                <a href="index.html">My Order</a>
                <a href="messages.html" class="nav-link-messages">My Messages ${unreadIndicatorHTML}</a>
                <a href="profile.html">My Profile</a>
                <a href="volunteer.html">Volunteer</a>
                <a href="#" id="logoutLink">Logout</a>
            `;
        }
        
        navContainer.innerHTML = navHTML;
        
        // Attach logout event listener
        document.getElementById('logoutLink').addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = 'login.html';
        });

    } else {
        // --- USER IS LOGGED OUT ---
        navContainer.innerHTML = `
            <a href="index.html">Home</a>
            <a href="volunteer.html">Volunteer</a>
            <a href="login.html">Login</a>
            <a href="signup.html">Sign Up</a>
        `;
    }
});