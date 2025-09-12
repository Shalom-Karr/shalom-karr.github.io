import { supabase } from './supabase-client.js';
import { updateHeaderAuthState } from './auth.js';

// --- GLOBAL STATE ---
let currentUserId = null;
let adminActiveReply = { id: null, name: null, content: null };

// --- PRIMARY BOOTSTRAP LOGIC ---
document.addEventListener('DOMContentLoaded', async () => {
    // First, build the consistent navigation bar for the entire site.
    await updateHeaderAuthState();

    // Now, proceed with checking if the user is an admin.
    const user = await checkAdmin();
    if (user) {
        // If the user is a verified admin, build the entire page content.
        renderFullAdminPage(user);
    } else {
        // Otherwise, show the access denied message.
        renderAccessDenied();
    }
});

async function checkAdmin() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        // If there's no session at all, deny access immediately.
        return null;
    }
    currentUserId = session.user.id;
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUserId)
            .single();

        if (error) throw error;

        if (profile && profile.role === 'admin') {
            return session.user; // Return the user object on success
        }
        return null; // User is not an admin
    } catch (error) {
        console.error("Error verifying admin status:", error);
        return null; // Deny access on any error
    }
}

function renderAccessDenied() {
    const root = document.getElementById('admin-root');
    root.innerHTML = `
        <div class="container">
            <header>
                <h1>Access Denied</h1>
            </header>
            <main>
                <div class="form-section" style="text-align: center;">
                    <p class="form-message error visible" style="padding: 20px;">
                        You do not have the required permissions to view this page.
                    </p>
                    <a href="index.html" class="button-primary" style="margin-top: 20px;">Return to Home</a>
                </div>
            </main>
        </div>
    `;
}

// --- DYNAMIC PAGE & MODAL RENDERING ---
function renderFullAdminPage(user) {
    const root = document.getElementById('admin-root');
    
    root.innerHTML = `
        <div class="container">
            <header>
                <h1>Welcome, Admin</h1>
                <p class="tagline">Logged in as: ${user.email}</p>
            </header>
            <main id="admin-content">
                <section class="form-section">
                    <h2>Admin Settings</h2>
                    <div class="form-group" style="max-width: 400px;">
                        <label for="adminDisplayName">Your Display Name in Chats:</label>
                        <input type="text" id="adminDisplayName" placeholder="e.g., Sarah (Kemach Staff)">
                        <button id="saveAdminNameBtn" class="button-primary" style="margin-top: 10px;">Save Name</button>
                    </div>
                </section>
                <section class="form-section">
                    <h2>Manage Messages</h2>
                    <div id="adminMessagesContainer"><p class="loading-text">Loading messages...</p></div>
                </section>
                <section class="form-section">
                    <h2>Manage Products</h2>
                    <button id="addProductBtn" class="button-primary">Add New Product</button>
                    <div id="productListContainer" class="admin-table-container"></div>
                </section>
                <section class="form-section">
                    <h2>Manage Users</h2>
                    <div id="userListContainer" class="admin-table-container"></div>
                </section>
                <section class="form-section">
                    <h2>Manage Website Content</h2>
                    <button id="editBannerBtn" class="button-outline">Edit Homepage Banners</button>
                    <button id="editTermsBtn" class="button-outline">Edit Terms & Conditions</button>
                    <button id="editContactBtn" class="button-outline">Edit Contact Us Page</button>
                </section>
            </main>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', `
        <!-- MODAL: Product Management --><div id="productModal" class="modal"><div class="modal-content"><span class="close-button">&times;</span><h2 id="modalTitle">Add New Product</h2><form id="productForm"><input type="hidden" id="productId"><div class="form-group"><label for="productName">Product Name *</label><input type="text" id="productName" required></div><div class="form-group"><label for="productDescription">Description</label><input type="text" id="productDescription"></div><div class="form-group"><label for="productPrice">Price *</label><input type="number" id="productPrice" step="0.01" min="0" required></div><div class="form-group"><label for="productCategory">Category *</label><input type="text" id="productCategory" placeholder="e.g., Pantry, Meat, Dairy" required></div><div class="form-group"><label for="productMaxQuantity">Max Quantity *</label><input type="number" id="productMaxQuantity" min="1" value="4" required></div><div class="form-group"><label><input type="checkbox" id="productIsActive" checked> Active</label></div><button type="submit" class="button-primary">Save Product</button></form></div></div>
        <!-- MODAL: Banner Management --><div id="bannerModal" class="modal"><div class="modal-content"><span class="close-button">&times;</span><h2>Edit Homepage Banners</h2><form id="bannerForm"><section class="form-section"><h3>Info Banner</h3><div class="form-group"><label for="infoBannerText1">Banner Text (Line 1)</label><input type="text" id="infoBannerText1"></div><div class="form-group"><label for="infoBannerText2">Banner Text (Line 2)</label><input type="text" id="infoBannerText2"></div></section><section class="form-section"><h3>Header Main Banner</h3><div class="form-group"><label for="headerTitle">Main Title</label><input type="text" id="headerTitle"></div><div class="form-group"><label for="headerSubtitle">Subtitle</label><input type="text" id="headerSubtitle"></div></section><button type="submit" class="button-primary">Save Banners</button></form></div></div>
        <!-- MODAL: Static Content --><div id="staticContentModal" class="modal"><div class="modal-content"><span class="close-button">&times;</span><h2 id="staticContentModalTitle">Edit Page Content</h2><form id="staticContentForm"><input type="hidden" id="staticContentPageName"><div class="form-group"><label for="staticContentTextArea">Page Content (HTML)</label><textarea id="staticContentTextArea" rows="15"></textarea></div><button type="submit" class="button-primary">Save Content</button></form></div></div>
        <!-- MODAL: Messages --><div id="messageThreadModal" class="modal"><div class="modal-content" style="max-width: 800px;"><span class="close-button">&times;</span><h2 id="messageModalTitle">Conversation</h2><div id="adminConvoInfoPanel" class="admin-convo-info-panel"></div><div id="messageModalBody" style="max-height: 50vh; overflow-y: auto;"></div><form id="adminReplyForm" style="margin-top: 15px;"><input type="hidden" id="adminReplyConversationId"><div id="adminReplyPreview" style="display: none;"><span id="adminReplyPreviewContent"></span><button type="button" id="cancelAdminReplyBtn" title="Cancel Reply">&times;</button></div><textarea id="adminReplyContent" rows="3" required placeholder="Type your reply..."></textarea><button type="submit" class="button-primary" style="margin-top: 10px;">Send Reply</button></form></div></div>
    `);

    attachAdminEventListeners();
    fetchAllAdminData();
}

function attachAdminEventListeners() {
    const productModal = document.getElementById('productModal');
    const bannerModal = document.getElementById('bannerModal');
    const staticContentModal = document.getElementById('staticContentModal');
    const messageThreadModal = document.getElementById('messageThreadModal');

    document.getElementById('saveAdminNameBtn').addEventListener('click', saveAdminDisplayName);
    document.getElementById('addProductBtn').addEventListener('click', () => openAddModal());
    document.getElementById('editBannerBtn').addEventListener('click', () => openBannerModal());
    document.getElementById('editTermsBtn').addEventListener('click', () => openStaticContentModal('terms'));
    document.getElementById('editContactBtn').addEventListener('click', () => openStaticContentModal('contact'));
    document.getElementById('productForm').addEventListener('submit', handleSaveProduct);
    document.getElementById('bannerForm').addEventListener('submit', handleSaveBannerSettings);
    document.getElementById('staticContentForm').addEventListener('submit', handleSaveStaticContent);
    document.getElementById('adminReplyForm').addEventListener('submit', handleAdminReply);
    document.getElementById('cancelAdminReplyBtn').addEventListener('click', cancelAdminReply);

    productModal.querySelector('.close-button').addEventListener('click', () => productModal.style.display = 'none');
    bannerModal.querySelector('.close-button').addEventListener('click', () => bannerModal.style.display = 'none');
    staticContentModal.querySelector('.close-button').addEventListener('click', () => staticContentModal.style.display = 'none');
    messageThreadModal.querySelector('.close-button').addEventListener('click', () => {
        messageThreadModal.style.display = 'none';
        fetchAndRenderAdminMessages();
    });

    window.onclick = (event) => {
        if (event.target == productModal) productModal.style.display = 'none';
        if (event.target == bannerModal) bannerModal.style.display = 'none';
        if (event.target == staticContentModal) staticContentModal.style.display = 'none';
        if (event.target == messageThreadModal) {
            messageThreadModal.style.display = 'none';
            fetchAndRenderAdminMessages();
        }
    };
}

function fetchAllAdminData() {
    Promise.all([
        loadAdminDisplayName(),
        fetchAndRenderAdminMessages(),
        fetchAndRenderProducts(),
        fetchAndRenderUsers()
    ]);
}

async function loadAdminDisplayName() {
    const { data: profile } = await supabase.from('profiles').select('admin_display_name').eq('id', currentUserId).single();
    if (profile && profile.admin_display_name) {
        document.getElementById('adminDisplayName').value = profile.admin_display_name;
    }
}

async function saveAdminDisplayName() {
    const newName = document.getElementById('adminDisplayName').value.trim();
    if (!newName) { alert("Display name cannot be empty."); return; }
    const { error } = await supabase.from('profiles').update({ admin_display_name: newName }).eq('id', currentUserId);
    if (error) { alert("Error saving name: " + error.message); } else { alert("Display name updated successfully!"); }
}

async function fetchAndRenderAdminMessages() {
    const container = document.getElementById('adminMessagesContainer');
    const { data: convos, error } = await supabase.rpc('get_admin_conversations_overview');
    if (error) { container.innerHTML = `<p class="error-message">Failed to load messages.</p>`; console.error(error); return; }
    if (convos.length === 0) { container.innerHTML = '<p>No user messages at this time.</p>'; return; }
    container.innerHTML = `<table class="admin-table"><thead><tr><th>User</th><th>Topic</th><th>Last Message</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        ${convos.map(c => `<tr class="${c.has_unread_admin ? 'unread-row' : ''}"><td>${c.initiator_name || c.initiator_email}</td><td>${c.topic}</td><td>${c.last_message_at ? new Date(c.last_message_at).toLocaleString() : 'N/A'}</td><td>${c.has_unread_admin ? '<strong>New Message</strong>' : 'Viewed'}</td><td><button class="button-outline view-thread-btn" data-convo-id='${c.conversation_id}'>View/Reply</button></td></tr>`).join('')}
        </tbody></table>`;
    document.querySelectorAll('.view-thread-btn').forEach(btn => {
        const convoData = convos.find(c => c.conversation_id === btn.dataset.convoId);
        btn.addEventListener('click', () => openMessageThreadModal(convoData));
    });
}

async function openMessageThreadModal(convoData) {
    cancelAdminReply();
    document.getElementById('adminReplyConversationId').value = convoData.conversation_id;
    document.getElementById('messageModalTitle').textContent = `Re: ${convoData.topic}`;
    document.getElementById('adminConvoInfoPanel').innerHTML = `<p><strong>User:</strong> ${convoData.initiator_name || 'N/A'}</p><p><strong>Email:</strong> <a href="mailto:${convoData.initiator_email}">${convoData.initiator_email}</a></p><p><strong>Phone:</strong> <a href="tel:${convoData.initiator_phone}">${convoData.initiator_phone || 'N/A'}</a></p>`;
    const modalBody = document.getElementById('messageModalBody');
    modalBody.innerHTML = '<p class="loading-text">Loading thread...</p>';
    document.getElementById('messageThreadModal').style.display = 'block';
    await supabase.from('messages').update({ is_read_by_admin: true }).eq('conversation_id', convoData.conversation_id);
    const { data: messages, error } = await supabase.from('messages').select('*, sender:profiles(id, first_name, role, admin_display_name)').eq('conversation_id', convoData.conversation_id).order('created_at', { ascending: true });
    if (error) { modalBody.innerHTML = '<p class="error-message">Could not load messages.</p>'; return; }
    modalBody.innerHTML = messages.map(msg => {
        const isAdminSender = msg.sender && msg.sender.role === 'admin';
        const senderName = isAdminSender ? (msg.sender.admin_display_name || 'Kemach Staff') : (msg.sender ? msg.sender.first_name : 'User');
        const replySnippetHTML = msg.reply_snippet ? `<div class="reply-snippet-bubble">${msg.reply_snippet}</div>` : '';
        return `<div class="message-wrapper ${isAdminSender ? 'sent' : 'received'}"><div class="message-bubble ${isAdminSender ? 'sent' : 'received'}"><button class="reply-icon" title="Reply" onclick="setupAdminReply('${msg.id}', '${senderName}', '${msg.content ? msg.content.substring(0, 30).replace(/'/g, "\\'") : ''}')">↪</button><p style="margin:0; font-weight: bold; font-size: 0.8em;">${senderName}</p>${replySnippetHTML}<p style="margin:5px 0 0;">${msg.content || ''}</p></div></div>`;
    }).join('');
    modalBody.scrollTop = modalBody.scrollHeight;
}

window.setupAdminReply = (messageId, senderName, content) => {
    adminActiveReply = { id: messageId, name: senderName, content: content };
    document.getElementById('adminReplyPreviewContent').innerHTML = `Replying to <strong>${senderName}</strong>: "<em>${content}...</em>"`;
    document.getElementById('adminReplyPreview').style.display = 'flex';
    document.getElementById('adminReplyContent').focus();
};

function cancelAdminReply() {
    adminActiveReply = { id: null, name: null, content: null };
    const preview = document.getElementById('adminReplyPreview');
    if (preview) preview.style.display = 'none';
}

async function handleAdminReply(event) {
    event.preventDefault();
    const conversationId = document.getElementById('adminReplyConversationId').value;
    const contentInput = document.getElementById('adminReplyContent');
    const content = contentInput.value.trim();
    if (!content || !conversationId) return;
    contentInput.disabled = true;
    const messagePayload = { conversation_id: conversationId, sender_id: currentUserId, content: content, parent_message_id: adminActiveReply.id, reply_snippet: adminActiveReply.id ? `Replying to ${adminActiveReply.name}: "${adminActiveReply.content}...` : null };
    const { error } = await supabase.from('messages').insert(messagePayload);
    if (error) { alert('Error sending reply.'); } else {
        contentInput.value = '';
        cancelAdminReply();
        const topic = document.getElementById('messageModalTitle').textContent.replace('Re: ', '');
        const { data: convo } = await supabase.from('conversations').select('user:profiles(first_name, email, phone_number)').eq('id', conversationId).single();
        const convoData = { conversation_id: conversationId, topic: topic, initiator_name: convo.user.first_name, initiator_email: convo.user.email, initiator_phone: convo.user.phone_number };
        await openMessageThreadModal(convoData);
        await fetchAndRenderAdminMessages();
    }
    contentInput.disabled = false;
    contentInput.focus();
}

async function fetchAndRenderProducts() {
    const container = document.getElementById('productListContainer');
    const { data: products, error } = await supabase.from('products').select('*').order('category').order('name');
    if (error) { container.innerHTML = `<p class="error-message">Failed to load products.</p>`; return; }
    container.innerHTML = `<table class="admin-table"><thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Active</th><th>Actions</th></tr></thead><tbody id="productList">${products.map(p => `<tr data-id="${p.id}"><td>${p.name}</td><td>${p.category}</td><td>$${p.price.toFixed(2)}</td><td>${p.is_active ? 'Yes' : 'No'}</td><td class="actions"><button class="button-outline edit-btn">Edit</button><button class="button-danger delete-btn">Delete</button></td></tr>`).join('')}</tbody></table>`;
    document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => openEditModal(e, products)));
    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDeleteProduct));
}

function openAddModal() {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('modalTitle').textContent = 'Add New Product';
    document.getElementById('productIsActive').checked = true;
    document.getElementById('productModal').style.display = 'block';
}

function openEditModal(event, products) {
    const id = event.target.closest('tr').dataset.id;
    const product = products.find(p => p.id == id);
    if (!product) return;
    document.getElementById('modalTitle').textContent = 'Edit Product';
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.description;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productMaxQuantity').value = product.max_quantity;
    document.getElementById('productIsActive').checked = product.is_active;
    document.getElementById('productModal').style.display = 'block';
}

async function handleSaveProduct(event) {
    event.preventDefault();
    const id = document.getElementById('productId').value;
    const productData = { name: document.getElementById('productName').value.trim(), description: document.getElementById('productDescription').value.trim(), price: parseFloat(document.getElementById('productPrice').value), category: document.getElementById('productCategory').value.trim(), max_quantity: parseInt(document.getElementById('productMaxQuantity').value), is_active: document.getElementById('productIsActive').checked };
    if (!productData.name || isNaN(productData.price) || productData.price < 0 || isNaN(productData.max_quantity) || productData.max_quantity <= 0) { alert("Please fill in all required fields."); return; }
    const { error } = id ? await supabase.from('products').update(productData).eq('id', id) : await supabase.from('products').insert([productData]);
    if (error) { alert('Error saving product: ' + error.message); } else { document.getElementById('productModal').style.display = 'none'; await fetchAndRenderProducts(); }
}

async function handleDeleteProduct(event) {
    const id = event.target.closest('tr').dataset.id;
    if (confirm('Are you sure you want to delete this product?')) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) { alert('Error deleting product: ' + error.message); } else { await fetchAndRenderProducts(); }
    }
}

async function fetchAndRenderUsers() {
    const container = document.getElementById('userListContainer');
    const { data: users, error } = await supabase.from('profiles').select('*').order('email');
    if (error) { container.innerHTML = `<p class="error-message">Failed to load users.</p>`; return; }
    container.innerHTML = `<table class="admin-table"><thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Actions</th></tr></thead><tbody id="userList">${users.map(user => `<tr data-user-id="${user.id}"><td>${user.email || 'N/A'}</td><td>${user.first_name || ''} ${user.last_name || ''}</td><td>${user.role}</td><td class="actions">${user.id !== currentUserId && user.role !== 'admin' ? `<button class="button-outline promote-btn">Make Admin</button>` : ''}${user.id !== currentUserId && user.role === 'admin' ? `<button class="button-outline demote-btn">Make User</button>` : ''}</td></tr>`).join('')}</tbody></table>`;
    container.querySelectorAll('.promote-btn').forEach(btn => btn.addEventListener('click', (e) => updateUserRole(e.target.closest('tr').dataset.userId, 'admin')));
    container.querySelectorAll('.demote-btn').forEach(btn => btn.addEventListener('click', (e) => updateUserRole(e.target.closest('tr').dataset.userId, 'user')));
}

async function updateUserRole(userId, newRole) {
    if (!confirm(`Are you sure you want to change this user's role to "${newRole}"?`)) return;
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) { alert('Error updating role: ' + error.message); } else { alert('User role updated successfully.'); }
    await fetchAndRenderUsers();
}

function openBannerModal() {
    document.getElementById('bannerForm').reset();
    fetchBannerSettingsForModal();
    document.getElementById('bannerModal').style.display = 'block';
}

async function fetchBannerSettingsForModal() {
    const { data } = await supabase.from('settings').select('*').limit(1).single();
    if (data) {
        document.getElementById('infoBannerText1').value = data.info_banner_text_1 || '';
        document.getElementById('infoBannerText2').value = data.info_banner_text_2 || '';
        document.getElementById('headerTitle').value = data.header_title || '';
        document.getElementById('headerSubtitle').value = data.header_subtitle || '';
    }
}

async function handleSaveBannerSettings(event) {
    event.preventDefault();
    const bannerData = { info_banner_text_1: document.getElementById('infoBannerText1').value, info_banner_text_2: document.getElementById('infoBannerText2').value, header_title: document.getElementById('headerTitle').value, header_subtitle: document.getElementById('headerSubtitle').value };
    const { data: existing } = await supabase.from('settings').select('id').limit(1).single();
    const { error } = existing ? await supabase.from('settings').update(bannerData).eq('id', existing.id) : await supabase.from('settings').insert(bannerData);
    if (error) { alert('Error saving banner settings: ' + error.message); } else { alert('Banner settings saved successfully!'); document.getElementById('bannerModal').style.display = 'none'; }
}

function openStaticContentModal(pageName) {
    document.getElementById('staticContentPageName').value = pageName;
    document.getElementById('staticContentModalTitle').textContent = `Edit ${pageName === 'terms' ? 'Terms & Conditions' : 'Contact Us'} Page`;
    document.getElementById('staticContentTextArea').value = 'Loading...';
    supabase.from('static_content').select('content_html').eq('page_name', pageName).single().then(({ data }) => {
        document.getElementById('staticContentTextArea').value = data ? data.content_html || '' : '';
    });
    document.getElementById('staticContentModal').style.display = 'block';
}

async function handleSaveStaticContent(event) {
    event.preventDefault();
    const pageName = document.getElementById('staticContentPageName').value;
    const contentHtml = document.getElementById('staticContentTextArea').value;
    const { error } = await supabase.from('static_content').upsert({ page_name: pageName, content_html: contentHtml }, { onConflict: 'page_name' });
    if (error) { alert('Error saving content: ' + error.message); } else { alert('Page content saved successfully!'); document.getElementById('staticContentModal').style.display = 'none'; }
}