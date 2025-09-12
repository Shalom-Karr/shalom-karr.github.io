import { supabase } from './supabase-client.js';
import { updateHeaderAuthState } from './auth.js';

// --- GLOBAL STATE ---
let currentUser = null;
let currentOpenConversationId = null;
let activeReply = { id: null, name: null, content: null };

// --- PRIMARY BOOTSTRAP LOGIC ---
document.addEventListener('DOMContentLoaded', async () => {
    // This function from auth.js should handle the main header consistency
    await updateHeaderAuthState();
    
    // Specifically handle the logout link on this page's nav bar for robustness
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.replace('login.html');
        return;
    }
    currentUser = session.user;
    // This single function now handles the entire page flow.
    await checkUserProfile();
});

async function checkUserProfile() {
    const messagesContent = document.getElementById('messages-content');
    try {
        const { data: profile, error } = await supabase.from('profiles').select('first_name, phone_number').eq('id', currentUser.id).single();
        if (error) throw error;

        // If the profile is incomplete, show the mandatory modal.
        if (!profile || !profile.first_name || !profile.phone_number) {
            showProfileCompletionModal(profile);
        } else {
            // If the profile is complete, render the messaging UI.
            renderMessagesUI();
            await fetchAndRenderConversations();
        }
    } catch (error) {
        console.error("Profile check error:", error);
        messagesContent.innerHTML = `<p class="error-message">Could not verify your profile. Please try refreshing the page or contact support if the problem persists.</p>`;
    }
}

function showProfileCompletionModal(profile) {
    const modal = document.getElementById('profileCompletionModal');
    const form = document.getElementById('profileCompletionForm');
    const firstNameInput = document.getElementById('profileModalFirstName');
    const phoneInput = document.getElementById('profileModalPhone');
    const messageEl = document.getElementById('profileModalMessage');
    const submitBtn = form.querySelector('button[type="submit"]');

    // Pre-fill any data that already exists
    firstNameInput.value = profile?.first_name || '';
    phoneInput.value = profile?.phone_number || '';

    // Handle the form submission inside the modal
    form.onsubmit = async (event) => {
        event.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        messageEl.textContent = '';
        messageEl.className = 'form-message';

        const newFirstName = firstNameInput.value.trim();
        const newPhone = phoneInput.value.trim();

        if (!newFirstName || !newPhone) {
            messageEl.textContent = "Both fields are required.";
            messageEl.className = 'form-message error visible';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save and Continue';
            return;
        }

        const { error } = await supabase
            .from('profiles')
            .update({ first_name: newFirstName, phone_number: newPhone })
            .eq('id', currentUser.id);

        if (error) {
            messageEl.textContent = `Error: ${error.message}`;
            messageEl.className = 'form-message error visible';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save and Continue';
        } else {
            // SUCCESS! Hide the modal and re-run the check.
            modal.style.display = 'none';
            // This second call will now find a complete profile and load the messages UI.
            await checkUserProfile();
        }
    };
    
    // Display the modal to the user
    modal.style.display = 'flex';
}

function renderMessagesUI() {
    const messagesContent = document.getElementById('messages-content');
    messagesContent.innerHTML = `
        <button id="startNewConversationBtn" class="button-primary" style="margin-bottom: 20px;">Start New Conversation</button>
        <div class="messages-layout">
            <div id="conversationsListPanel"><p class="loading-text">Loading...</p></div>
            <div id="messageChatPanel">
                <div id="messagesContainer"><p style="text-align:center; padding: 50px; color: #6c757d;">Select a conversation to view messages.</p></div>
                <form id="sendMessageForm" style="display:none;">
                    <div id="replyPreview" style="display: none;">
                        <span id="replyPreviewContent"></span>
                        <button type="button" id="cancelReplyBtn" title="Cancel Reply">×</button>
                    </div>
                    <textarea id="newMessageContent" rows="3" placeholder="Type your message..." required></textarea>
                    <button type="submit" class="button-primary" style="margin-top: 10px;">Send</button>
                </form>
            </div>
        </div>`;
    document.getElementById('startNewConversationBtn').addEventListener('click', startNewConversation);
    document.getElementById('cancelReplyBtn').addEventListener('click', cancelReply);
}

async function fetchAndRenderConversations() {
    const listPanel = document.getElementById('conversationsListPanel');
    const { data: convos, error } = await supabase.rpc('get_my_conversations');

    if (error) {
        listPanel.innerHTML = '<p class="error-message">Could not load conversations.</p>';
        console.error(error);
        return;
    }
    if (convos.length === 0) {
        listPanel.innerHTML = '<p style="padding: 15px; text-align: center;">No conversations yet.</p>';
        return;
    }

    listPanel.innerHTML = convos.map(convo => `
        <div class="conversation-item ${convo.has_unread_user ? 'unread' : ''}" data-convo-id="${convo.conversation_id}">
            <strong>${convo.topic || 'General Inquiry'}</strong>
            <p style="font-size: 0.9em; color: #6c757d;">${convo.last_message_content ? convo.last_message_content.substring(0, 40) + '...' : 'No messages yet.'}</p>
        </div>
    `).join('');

    listPanel.querySelectorAll('.conversation-item').forEach(item => {
        item.addEventListener('click', () => openConversation(item.dataset.convoId));
    });
}

async function openConversation(conversationId) {
    currentOpenConversationId = conversationId;
    cancelReply();
    document.querySelectorAll('.conversation-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`[data-convo-id="${conversationId}"]`).classList.add('active');
    
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.innerHTML = '<p class="loading-text">Loading messages...</p>';
    document.getElementById('sendMessageForm').style.display = 'block';

    await supabase.from('messages').update({ is_read_by_user: true }).eq('conversation_id', conversationId);

    const { data: messages, error } = await supabase.from('messages')
        .select('*, sender:profiles(id, first_name, last_name, role, admin_display_name)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (error) {
        messagesContainer.innerHTML = '<p class="error-message">Could not load messages.</p>';
        return;
    }
    renderMessages(messages);
    
    document.getElementById('sendMessageForm').onsubmit = handleSendMessage;
    fetchAndRenderConversations();
}

function renderMessages(messages) {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = messages.map(msg => {
        const isSent = msg.sender_id === currentUser.id;
        const senderName = isSent ? 'You' : (msg.sender?.admin_display_name || 'Kemach Staff');
        const replySnippetHTML = msg.reply_snippet ? `<div class="reply-snippet-bubble">${msg.reply_snippet}</div>` : '';

        return `
        <div class="message-wrapper ${isSent ? 'sent' : 'received'}">
            <div class="message-bubble ${isSent ? 'sent' : 'received'}">
                <button class="reply-icon" title="Reply" onclick="setupReply('${msg.id}', '${senderName}', '${msg.content ? msg.content.substring(0, 30).replace(/'/g, "\\'") : ''}')">↪</button>
                <p style="margin:0; font-weight: bold; font-size: 0.8em;">${senderName}</p>
                ${replySnippetHTML}
                <p style="margin:5px 0 0;">${msg.content || ''}</p>
                <small style="font-size: 0.7em; opacity: 0.7; display: block; text-align: right;">${new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
            </div>
        </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
}

window.setupReply = (messageId, senderName, content) => {
    activeReply = { id: messageId, name: senderName, content: content };
    document.getElementById('replyPreviewContent').innerHTML = `Replying to <strong>${senderName}</strong>: "<em>${content}...</em>"`;
    document.getElementById('replyPreview').style.display = 'flex';
    document.getElementById('newMessageContent').focus();
};

function cancelReply() {
    activeReply = { id: null, name: null, content: null };
    const preview = document.getElementById('replyPreview');
    if (preview) preview.style.display = 'none';
}

async function handleSendMessage(event) {
    event.preventDefault();
    const contentInput = document.getElementById('newMessageContent');
    const content = contentInput.value.trim();
    if (!content || !currentOpenConversationId) return;

    contentInput.disabled = true;

    const messagePayload = {
        conversation_id: currentOpenConversationId,
        sender_id: currentUser.id,
        content: content,
        parent_message_id: activeReply.id,
        reply_snippet: activeReply.id ? `Replying to ${activeReply.name}: "${activeReply.content}...` : null
    };

    const { error } = await supabase.from('messages').insert(messagePayload);

    if (error) {
        alert("Error sending message.");
        console.error(error);
    } else {
        contentInput.value = '';
        cancelReply();
        const { data: messages } = await supabase.from('messages').select('*, sender:profiles(id, first_name, last_name, role, admin_display_name)').eq('conversation_id', currentOpenConversationId).order('created_at');
        renderMessages(messages);
    }
    contentInput.disabled = false;
    contentInput.focus();
}

async function startNewConversation() {
    const topic = prompt("What is your question about? (e.g., 'Order #1234', 'Payment Question')");
    if (!topic || topic.trim() === "") return;

    const { data, error } = await supabase.from('conversations').insert({ user_id: currentUser.id, topic: topic }).select().single();
    if (error) {
        alert("Could not start a new conversation.");
    } else {
        await fetchAndRenderConversations();
        openConversation(data.id);
    }
}