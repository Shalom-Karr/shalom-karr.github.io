// admin.js
// Import the supabase client ONCE
import { supabase } from './supabase-client.js';

// --- DOM Elements ---
const loginView = document.getElementById('login-view');
const adminDashboard = document.getElementById('admin-dashboard');

// ... (other DOM element selections for admin dashboard features) ...
const loginForm = document.getElementById('login-form'); // Get the login form
const adminEmailInput = document.getElementById('admin-email');
const adminPasswordInput = document.getElementById('admin-password');
const loginStatusMessage = document.getElementById('login-status-message');
const logoutBtn = document.getElementById('logout-btn'); // Ensure this is fetched for logout

// --- AUTHENTICATION AND SESSION MANAGEMENT ---

async function handleLogin(email, password) {
    console.log("handleLogin called with:", email); // Debug
    loginStatusMessage.textContent = "Logging in...";
    loginStatusMessage.className = 'status-message status-info hidden';
    loginStatusMessage.classList.remove('hidden');

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            throw error;
        }

        if (data && data.session) {
            loginStatusMessage.textContent = "Login successful! Loading dashboard...";
            loginStatusMessage.className = 'status-message status-success hidden';
            loginStatusMessage.classList.remove('hidden');
            setTimeout(showAdminDashboard, 1000);
        } else {
            throw new Error("Login failed. No session data returned.");
        }
    } catch (error) {
        console.error("Login error:", error);
        loginStatusMessage.textContent = `Login failed: ${error.message.includes('invalid') ? 'Invalid email or password.' : error.message}`;
        loginStatusMessage.className = 'status-message status-error hidden';
        loginStatusMessage.classList.remove('hidden');
    }
}

async function handleLogout() {
    console.log("handleLogout called"); // Debug
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        hideAdminDashboard();
    } catch (error) {
        console.error("Logout error:", error);
        alert(`Logout failed: ${error.message}`);
    }
}

function checkAuthStatus() {
    console.log("checkAuthStatus called"); // Debug
    supabase.auth.getSession().then(({ data, error }) => {
        if (error) {
            console.error("Error fetching session:", error);
            hideAdminDashboard();
        } else if (data.session) {
            console.log("Session found, showing dashboard."); // Debug
            showAdminDashboard();
        } else {
            console.log("No session found, showing login view."); // Debug
            hideAdminDashboard();
        }
    });
}

function showAdminDashboard() {
    console.log("showAdminDashboard called"); // Debug
    loginView.classList.add('hidden');
    adminDashboard.classList.remove('hidden');
    // Only load settings if the settings section is actually part of admin-dashboard
    if (document.getElementById('settings-section')) {
         loadSettings(); // Load settings once the dashboard is visible
    }
}

function hideAdminDashboard() {
    console.log("hideAdminDashboard called"); // Debug
    adminDashboard.classList.add('hidden');
    loginView.classList.remove('hidden');
    if (loginStatusMessage) clearFormStatus(loginStatusMessage); // Clear any pending messages
}

// ... (other utility functions like toggleSection, showStatus, clearFormStatus, etc. remain the same) ...
// ... (SCHEDULE MANAGEMENT, DOCUMENT UPLOADS, SETTINGS MANAGEMENT functions remain the same) ...

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired."); // Debug

    // Initial check for login form
    if (!loginForm) {
        console.error("Login form not found!");
        return; // Stop if essential elements are missing
    }
    if (!logoutBtn) {
        console.warn("Logout button not found, logout functionality will not work.");
    }


    checkAuthStatus(); // Check auth status when the DOM is ready

    // Add login form submission listener
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent default form submission
        console.log("Login form submitted."); // Debug
        const email = adminEmailInput.value;
        const password = adminPasswordInput.value;
        await handleLogin(email, password);
    });

    // Add logout button listener (Ensure logoutBtn is correctly fetched)
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // ... (Add other event listeners for admin dashboard sections) ...
    const adminControls = document.getElementById('admin-controls');
    const manageSchedulesSection = document.getElementById('manage-schedules-section');
    const scheduleFormSection = document.getElementById('schedule-form-section');
    const uploadDocumentSection = document.getElementById('upload-document-section');
    const settingsSection = document.getElementById('settings-section');

    const manageSchedulesBtn = document.getElementById('manage-schedules-btn');
    const uploadDocumentBtn = document.getElementById('upload-document-btn');
    const manageSettingsBtn = document.getElementById('manage-settings-btn');
    const addNewScheduleBtn = document.getElementById('add-new-schedule-btn');

    const closeManageSchedulesBtn = manageSchedulesSection.querySelector('.close-section-btn');
    const closeScheduleFormBtn = scheduleFormSection.querySelector('.close-section-btn');
    const closeUploadDocBtn = uploadDocumentSection.querySelector('.close-section-btn');
    const closeSettingsBtn = settingsSection.querySelector('.close-section-btn');

    if (closeManageSchedulesBtn) closeManageSchedulesBtn.addEventListener('click', () => toggleSection(adminControls));
    if (closeScheduleFormBtn) closeScheduleFormBtn.addEventListener('click', () => toggleSection(manageSchedulesSection));
    if (closeUploadDocBtn) closeUploadDocBtn.addEventListener('click', () => toggleSection(adminControls));
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => toggleSection(adminControls));

    if (manageSchedulesBtn) manageSchedulesBtn.addEventListener('click', () => {
        toggleSection(manageSchedulesSection);
        loadSchedules();
    });

    if (uploadDocumentBtn) uploadDocumentBtn.addEventListener('click', () => {
        toggleSection(uploadDocumentSection);
        const uploadFormForDoc = document.getElementById('upload-document-form'); // Ensure unique ID for this form
        if (uploadFormForDoc) uploadFormForDoc.reset();
        if (document.getElementById('upload-status')) clearFormStatus(document.getElementById('upload-status'));
        const docFileUploadInput = document.getElementById('doc_file_upload');
        if (docFileUploadInput) docFileUploadInput.value = null;
        const linksContainer = uploadDocumentSection.querySelector('.document-links');
        if (linksContainer) linksContainer.innerHTML = '<p><small>Select a file to upload.</small></p>';
    });

    if (manageSettingsBtn) manageSettingsBtn.addEventListener('click', () => {
        toggleSection(settingsSection);
        loadSettings();
    });
    
    if(addNewScheduleBtn) addNewScheduleBtn.addEventListener('click', () => {
        clearScheduleForm();
        toggleSection(scheduleFormSection);
        if(document.getElementById('schedule-form-title')) document.getElementById('schedule-form-title').textContent = 'Add New Schedule';
    });
    
    const scheduleForm = document.getElementById('schedule-form');
    if (scheduleForm) {
        scheduleForm.addEventListener('submit', async (e) => {
            // ... (schedule form submission logic) ...
            // This needs the full implementation from previous response
            e.preventDefault();
            const id = document.getElementById('schedule-id').value;
            const displayName = document.getElementById('display_name').value.trim();
            // ... gather other schedule form data ...
            const scheduleData = { /* ... construct object ... */ };
            // ... call Supabase to insert/update schedule_data ...
        });
    }

    const uploadDocumentForm = document.getElementById('upload-document-form');
    if (uploadDocumentForm) {
        uploadDocumentForm.addEventListener('submit', async (e) => {
            // ... (document upload form submission logic) ...
            // This needs the full implementation from previous response
            e.preventDefault();
            const file = document.getElementById('doc_file_upload').files[0];
            const displayName = document.getElementById('doc_display_name_upload').value.trim();
            const category = document.getElementById('doc_category_upload').value;
            // ... call Supabase storage and DB insert ...
        });
    }

    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveSettings();
        });
    }
});

// --- Utility Functions, Schedule Management, Document Uploads, Settings Management ---
// Make sure these are correctly defined as in the previous full admin.js example.
// For brevity, I'm omitting them here, but they are essential.
// You need the implementations for:
// toggleSection, showStatus, clearFormStatus, clearScheduleForm, formatDriveLink,
// downloadDriveLink, updateDocumentLinksDisplay, loadSchedules,
// populateScheduleFormForEdit, handleDeleteSchedule, loadSettings, saveSettings.
// (These were provided in the previous comprehensive admin.js)

function toggleSection(sectionToShow) {
    const adminControls = document.getElementById('admin-controls');
    const manageSchedulesSection = document.getElementById('manage-schedules-section');
    const scheduleFormSection = document.getElementById('schedule-form-section');
    const uploadDocumentSection = document.getElementById('upload-document-section');
    const settingsSection = document.getElementById('settings-section');

    const sections = [
        adminControls,
        manageSchedulesSection,
        scheduleFormSection,
        uploadDocumentSection,
        settingsSection
    ];
    sections.forEach(section => {
        if (!section) return; // Guard against null sections
        if (section === sectionToShow) {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
    });
}

function showStatus(message, type = 'info', element) {
    if (!element) return;
    element.textContent = message;
    element.className = `status-message status-${type} hidden`; // Ensure 'hidden' is used correctly
    element.classList.remove('hidden');
}

function clearFormStatus(element) {
    if (element) {
        element.textContent = '';
        element.classList.add('hidden');
    }
}

function clearScheduleForm() {
    const scheduleForm = document.getElementById('schedule-form');
    if (scheduleForm) scheduleForm.reset();
    
    const scheduleIdInput = document.getElementById('schedule-id');
    if(scheduleIdInput) scheduleIdInput.value = '';
    
    // ... clear other schedule form inputs ...
    if (document.getElementById('schedule-form-status')) clearFormStatus(document.getElementById('schedule-form-status'));
    if (document.getElementById('schedule-form-title')) document.getElementById('schedule-form-title').textContent = 'Add New Schedule';
}

// ... (Include the implementations for loadSchedules, loadSettings, saveSettings, etc. from previous response)
// For this focused fix, the main issue is the login event listener.

// --- SCHEDULE MANAGEMENT (Placeholder - you need the full functions) ---
async function loadSchedules() { console.log("loadSchedules called (ensure full implementation)"); }
// --- DOCUMENT UPLOADS (Placeholder) ---
// --- SETTINGS MANAGEMENT (Placeholder) ---
async function loadSettings() { console.log("loadSettings called (ensure full implementation)"); }
async function saveSettings() { console.log("saveSettings called (ensure full implementation)"); }