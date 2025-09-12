import { supabase } from './supabase-client.js';

export async function updateHeaderAuthState() {
    const nav = document.querySelector('.main-nav');
    if (!nav) return;

    function isCurrentPage(path) {
        return window.location.pathname.endsWith(path) || (window.location.pathname.endsWith('/') && path === 'index.html');
    }

    async function getUnreadMessageStatus() {
        const { data: convos, error } = await supabase.rpc('get_my_conversations');
        if (error || !convos) return '';
        const hasUnread = convos.some(convo => convo.has_unread_user);
        return hasUnread ? `<span class="unread-indicator"></span>` : '';
    }

    nav.innerHTML = ''; 
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        const unreadIndicatorHTML = await getUnreadMessageStatus();
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        
        let navHTML = '';
        if (profile && profile.role === 'admin') {
            // --- ADMIN NAVIGATION ---
            navHTML = `
                <a href="index.html" class="${isCurrentPage('index.html') ? 'active' : ''}">My Order</a>
                <a href="messages.html" class="nav-link-messages ${isCurrentPage('messages.html') ? 'active' : ''}">My Messages ${unreadIndicatorHTML}</a>
                <a href="profile.html" class="${isCurrentPage('profile.html') ? 'active' : ''}">My Profile</a>
                <a href="admin.html" class="${isCurrentPage('admin.html') ? 'active' : ''}">Admin Panel</a>
                <a href="#" id="logoutLink">Logout</a>
            `;
        } else {
            // --- REGULAR USER NAVIGATION ---
            navHTML = `
                <a href="index.html" class="${isCurrentPage('index.html') ? 'active' : ''}">My Order</a>
                <a href="messages.html" class="nav-link-messages ${isCurrentPage('messages.html') ? 'active' : ''}">My Messages ${unreadIndicatorHTML}</a>
                <a href="profile.html" class="${isCurrentPage('profile.html') ? 'active' : ''}">My Profile</a>
                <a href="volunteer.html" class="${isCurrentPage('volunteer.html') ? 'active' : ''}">Volunteer</a>
                <a href="#" id="logoutLink">Logout</a>
            `;
        }
        
        nav.innerHTML = navHTML;
        
        document.getElementById('logoutLink').addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = 'login.html';
        });

    } else {
        // --- USER IS LOGGED OUT ---
        nav.innerHTML = `
            <a href="index.html" class="${isCurrentPage('index.html') ? 'active' : ''}">Home</a>
            <a href="volunteer.html" class="${isCurrentPage('volunteer.html') ? 'active' : ''}">Volunteer</a>
            <a href="login.html" class="${isCurrentPage('login.html') ? 'active' : ''}">Login</a>
            <a href="signup.html" class="${isCurrentPage('signup.html') ? 'active' : ''}">Sign Up</a>
        `;
    }
}