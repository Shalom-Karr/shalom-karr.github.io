// script.js - Cleveland Marketplace - Complete Final Version (Corrected)

// 1. Supabase Configuration
const SUPABASE_URL = 'https://zudzxwqxpmsamfsrrvpy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1ZHp4d3F4cG1zYW1mc3JydnB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NjAwMTYsImV4cCI6MjA2MjMzNjAxNn0.uj7Xs_7pScIXxlhmKV_Z22_ApXV-3i3-8bNYkrnp7Fc';
const SUPERADMIN_USER_ID = '5c7845ae-0357-48f9-bdad-f02d4cf33ecc';

let supabaseClient;
let currentUser = null;
let isSuperAdmin = false;

// State
let currentLoadedCount = 0;
const ITEMS_PER_PAGE = 12;
let isFetchingListings = false;
let searchDebounceTimeout;
let currentOpenListingId = null;

// Filter State
let currentSearchTerm = '';
let currentMinPrice = null;
let currentMaxPrice = null;
let currentFilterFreeOnly = false;
let currentSortOption = 'created_at_desc';

// DOM Elements
let listingsContainer, searchBar, loadMoreBtn, minPriceInput, maxPriceInput, filterFreeItemsCheckbox, sortListingsSelect, clearFiltersBtn, priceRangeButtons, openFilterBtn, closeFilterBtn, filterSidebar, sidebarOverlay, toastNotification;
let mainListingsView, itemDetailView, postItemModal, editProfileModal, supportChatBtn, loginBtn, signupBtn, editProfileBtn, messagesHeaderBtn, logoutBtnHeader, adminViewBtn, userEmailDisplayHeader, currentYearSpan;

function getElement(id) { return document.getElementById(id); }

function showToast(message, type = 'info', duration = 3500) { 
    const toast = getElement('toastNotification');
    if (!toast) return;
    clearTimeout(toast.toastTimeout);
    toast.textContent = message;
    toast.className = 'toast-notification ' + type + ' show';
    toast.toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, duration);
}

function showModal(modalElement) { if (modalElement) { modalElement.style.display = 'flex'; requestAnimationFrame(() => modalElement.classList.add('modal-visible')); } }
function hideModal(modalElement) { if (modalElement) { modalElement.classList.remove('modal-visible'); setTimeout(() => { if (!modalElement.classList.contains('modal-visible')) modalElement.style.display = 'none' }, 300); } }

function updateAuthUI(user) {
    currentUser = user;
    isSuperAdmin = user && SUPERADMIN_USER_ID && user.id === SUPERADMIN_USER_ID;
    const isLoggedIn = !!user;

    loginBtn.style.display = isLoggedIn ? 'none' : 'inline-flex';
    signupBtn.style.display = isLoggedIn ? 'none' : 'inline-flex';
    messagesHeaderBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';
    editProfileBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';
    logoutBtnHeader.style.display = isLoggedIn ? 'inline-flex' : 'none';
    adminViewBtn.style.display = isSuperAdmin ? 'inline-flex' : 'none';
    if (userEmailDisplayHeader) {
        userEmailDisplayHeader.textContent = isLoggedIn ? user.email : '';
        userEmailDisplayHeader.style.display = isLoggedIn ? 'inline-block' : 'none';
    }
    
    // Refresh listings to show/hide edit/delete buttons if necessary
    if (listingsContainer.innerHTML.trim() !== '' && !listingsContainer.querySelector('.loading-text')) {
        fetchListings(true);
    }
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    showToast("Logged out.", "info");
}

async function handleEditProfile(event) {
    event.preventDefault();
    if (!currentUser) return;
    const form = event.target;
    const newUsername = form.profileUsername.value.trim() || null;
    const newContactInfo = form.profileContactInfo.value.trim() || null;
    const { error } = await supabaseClient.from('profiles').update({ username: newUsername, contact_preference_info: newContactInfo, updated_at: new Date() }).eq('id', currentUser.id);
    if (error) {
        showToast("Error updating profile: " + error.message, "error");
    } else {
        showToast("Profile updated successfully!", "success");
        hideModal(editProfileModal);
        fetchListings(true);
    }
}

async function fetchListings(isNewSearchOrFilter = true) {
    if (isFetchingListings) return;
    isFetchingListings = true;
    
    if (isNewSearchOrFilter) {
        currentLoadedCount = 0;
        listingsContainer.innerHTML = '<p class="loading-text">Loading...</p>';
    }
    loadMoreBtn.style.display = 'none';

    let query = supabaseClient.from('listings_with_author_info').select('*', { count: 'exact' }).range(currentLoadedCount, currentLoadedCount + ITEMS_PER_PAGE - 1);

    if (currentSearchTerm) query.or(`name.ilike.%${currentSearchTerm}%,description.ilike.%${currentSearchTerm}%`);
    
    if (currentFilterFreeOnly) {
        query.or('price.eq.0,price.ilike.free');
    } else {
        if (currentMinPrice !== null && currentMinPrice >= 0) query.gte('price', currentMinPrice);
        if (currentMaxPrice !== null && currentMaxPrice > 0) query.lte('price', currentMaxPrice);
    }
    
    const sortParts = currentSortOption.split('_');
    const sortDirection = sortParts.pop();
    const sortColumn = sortParts.join('_');
    query.order(sortColumn, { ascending: sortDirection === 'asc' });

    const { data: listings, error, count } = await query;
    isFetchingListings = false;

    if (error) {
        listingsContainer.innerHTML = `<p class="loading-text" style="color:red;">Error fetching data. Please try again.</p>`;
        console.error("Fetch Error:", error);
        return;
    }

    if (isNewSearchOrFilter) listingsContainer.innerHTML = '';
    
    if (listings.length === 0 && currentLoadedCount === 0) {
        listingsContainer.innerHTML = '<p class="loading-text">No items match your criteria.</p>';
        return;
    }

    listings.forEach(listing => {
        const card = document.createElement('div');
        card.className = 'listing-card';
        card.dataset.itemId = listing.id;

        let displayPrice = 'Free';
        if (listing.price && parseFloat(listing.price) > 0) {
            displayPrice = '$' + parseFloat(listing.price).toFixed(2);
        }
        
        const sellerDisplayName = listing.author_username || listing.author_email || 'A User';
        const date = new Date(listing.created_at).toLocaleDateString();
        const tagColor = displayPrice === 'Free' ? 'var(--secondary-color)' : 'var(--success-color)';

        card.innerHTML = `
            <div class="card-image-container">
                <img src="${listing.image_url || ''}" alt="${listing.name || 'Item'}" loading="lazy" 
                     style="display: ${listing.image_url ? 'block' : 'none'};" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="no-image-placeholder" style="display: ${listing.image_url ? 'none' : 'flex'};">
                    ${listing.name || 'Untitled Item'}
                </div>
                <div class="card-overlay">
                    <h3 class="card-title-overlay">${listing.name || 'Untitled Item'}</h3>
                </div>
                <div class="price-tag">
                    <svg viewBox="0 0 50 60" preserveAspectRatio="none">
                        <path d="M0,0 H50 V45 L25,60 L0,45 Z" fill="${tagColor}"/>
                    </svg>
                    <span class="price-text">${displayPrice}</span>
                </div>
            </div>
            <div class="card-content">
                <small>By ${sellerDisplayName} on ${date}</small>
            </div>
        `;
        listingsContainer.appendChild(card);
    });

    currentLoadedCount += listings.length;
    if (listings.length > 0 && currentLoadedCount < count) {
        loadMoreBtn.style.display = 'block';
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

async function showItemDetailPage(itemId) {
    if (!itemId) return;
    currentOpenListingId = itemId;
    mainListingsView.style.display = 'none';
    itemDetailView.style.display = 'block';
    itemDetailView.innerHTML = `<button id="backToListingsBtnFromDetail" class="button-outline">← Back to All Cleveland Listings</button>
                               <div id="itemDetailContent"><p class="loading-text">Loading item details...</p></div>
                               <hr style="margin: 30px 0;">
                               <div id="itemCommentsSection" style="display:none;"></div>`;
    
    getElement('backToListingsBtnFromDetail').addEventListener('click', () => {
        mainListingsView.style.display = 'block';
        itemDetailView.style.display = 'none';
        history.pushState({}, '', '/');
        document.title = "Cleveland Marketplace";
    });

    const itemDetailContentEl = getElement('itemDetailContent');

    try {
        const { data: item, error } = await supabaseClient.from('listings_with_author_info').select('*').eq('id', itemId).single();
        if (error || !item) throw error || new Error("Item not found");

        document.title = `${item.name || 'Item'} - Cleveland Marketplace`;
        
        let displayPrice = 'Free';
        if (item.price && parseFloat(item.price) > 0) {
            displayPrice = '$' + parseFloat(item.price).toFixed(2);
        }
        const sellerDisplayName = item.author_username || item.author_email || 'A User';

        itemDetailContentEl.innerHTML = `
            <div class="item-detail-grid">
                <div class="image-detail-wrapper">
                    <img src="${item.image_url || ''}" alt="${item.name}" class="detail-view-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="display: ${item.image_url ? 'block' : 'none'};">
                    <div class="no-image-placeholder-detail" style="display:${item.image_url ? 'none' : 'flex'};">Image not available</div>
                </div>
                <div class="item-info-wrapper">
                    <h2 id="detailItemName">${item.name}</h2>
                    <p class="price-display" id="detailItemPrice">${displayPrice}</p>
                    <a href="messages.html" id="messageSellerBtn" class="button-primary" style="margin-bottom: 25px; text-decoration: none; display: inline-block;">Message Seller</a>
                    <h3>Description:</h3>
                    <p id="detailItemDescription">${(item.description || 'No description provided.').replace(/\n/g, '<br>')}</p>
                    <div id="detailItemSellerInfo">
                        <h3>Seller Information:</h3>
                        <p id="sellerNameDisplay">${sellerDisplayName}</p>
                    </div>
                    <h3>Contact Info:</h3>
                    <p id="detailItemContact">${item.contact_info}</p>
                    <small id="detailItemPostedDate">Posted: ${new Date(item.created_at).toLocaleString()}</small>
                </div>
            </div>`;
        
        fetchComments(itemId);
    } catch (error) {
        console.error("Error showing item detail:", error);
        itemDetailContentEl.innerHTML = '<p class="loading-text" style="color:red;">Could not load item details. It may have been removed.</p>';
    }
}

async function fetchComments(listingId) {
    const commentsSection = getElement('itemCommentsSection');
    if (!commentsSection) return;
    commentsSection.style.display = 'block';
    commentsSection.innerHTML = `<h3>Comments</h3><div id="commentsList"><p class="loading-text">Loading comments...</p></div>`;
    
    if (currentUser) {
        commentsSection.insertAdjacentHTML('beforeend', `<form id="addCommentForm" style="margin-top: 20px;">
            <h4>Leave a Comment</h4>
            <textarea id="commentContent" rows="3" placeholder="Write your comment..." required></textarea>
            <button type="submit" class="button-primary" style="margin-top: 10px;">Post Comment</button>
        </form>`);
        getElement('addCommentForm').addEventListener('submit', handlePostComment);
    }

    const commentsListEl = getElement('commentsList');
    try {
        const { data: comments, error } = await supabaseClient.from('comments_with_commenter_info').select('*').eq('listing_id', listingId).order('created_at', { ascending: true });
        if (error) throw error;
        commentsListEl.innerHTML = '';
        if (comments.length === 0) {
            commentsListEl.innerHTML = `<p>No comments yet. Be the first!</p>`;
        } else {
            comments.forEach(comment => {
                const commentDiv = document.createElement('div');
                commentDiv.className = 'comment';
                const authorName = comment.commenter_username || comment.commenter_email || 'A User';
                let deleteBtnHTML = '';
                if (currentUser && (currentUser.id === comment.user_id || isSuperAdmin)) {
                    deleteBtnHTML = `<button class="delete-comment-btn" data-comment-id="${comment.id}">Delete</button>`;
                }
                commentDiv.innerHTML = `
                    <p class="comment-author">${authorName}</p>
                    <p class="comment-date">${new Date(comment.created_at).toLocaleString()}</p>
                    <p class="comment-content">${comment.content.replace(/\n/g, '<br>')}</p>
                    ${deleteBtnHTML}
                `;
                commentDiv.querySelector('.delete-comment-btn')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Implement deleteComment function
                });
                commentsListEl.appendChild(commentDiv);
            });
        }
    } catch (error) {
        commentsListEl.innerHTML = `<p style="color:red">Could not load comments.</p>`;
    }
}

async function handlePostComment(event) {
    event.preventDefault();
    if (!currentUser || !currentOpenListingId) return;
    const content = getElement('commentContent').value.trim();
    if (!content) {
        showToast("Comment cannot be empty.", "error");
        return;
    }
    const { error } = await supabaseClient.from('comments').insert({ listing_id: currentOpenListingId, user_id: currentUser.id, content: content });
    if (error) {
        showToast("Error posting comment: " + error.message, "error");
    } else {
        showToast("Comment posted!", "success");
        fetchComments(currentOpenListingId);
    }
}

function handleFilterChange() {
    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(() => {
        currentSearchTerm = searchBar.value.trim();
        currentMinPrice = minPriceInput.value !== '' ? parseFloat(minPriceInput.value) : null;
        currentMaxPrice = maxPriceInput.value !== '' ? parseFloat(maxPriceInput.value) : null;
        currentFilterFreeOnly = filterFreeItemsCheckbox.checked;
        currentSortOption = sortListingsSelect.value;
        if (document.activeElement === minPriceInput || document.activeElement === maxPriceInput) {
            priceRangeButtons.forEach(btn => btn.classList.remove('active'));
        }
        if (currentFilterFreeOnly) {
            priceRangeButtons.forEach(btn => btn.classList.remove('active'));
            minPriceInput.value = '';
            maxPriceInput.value = '';
            currentMinPrice = 0;
            currentMaxPrice = 0;
        }
        fetchListings(true);
    }, 400);
}

function clearAllFilters() {
    searchBar.value = '';
    minPriceInput.value = '';
    maxPriceInput.value = '';
    sortListingsSelect.value = 'created_at_desc';
    filterFreeItemsCheckbox.checked = false;
    priceRangeButtons.forEach(btn => btn.classList.remove('active'));
    currentSearchTerm = '';
    currentMinPrice = null;
    currentMaxPrice = null;
    currentFilterFreeOnly = false;
    currentSortOption = 'created_at_desc';
    fetchListings(true);
}

function assignDOMElements() {
    listingsContainer = getElement('listingsContainer');
    searchBar = getElement('searchBar');
    loadMoreBtn = getElement('loadMoreBtn');
    minPriceInput = getElement('minPrice');
    maxPriceInput = getElement('maxPrice');
    filterFreeItemsCheckbox = getElement('filterFreeItems');
    sortListingsSelect = getElement('sortListings');
    clearFiltersBtn = getElement('clearFiltersBtn');
    priceRangeButtons = document.querySelectorAll('.price-range-btn');
    openFilterBtn = getElement('openFilterBtn');
    closeFilterBtn = getElement('closeFilterBtn');
    filterSidebar = getElement('filterSidebar');
    sidebarOverlay = getElement('sidebarOverlay');
    toastNotification = getElement('toastNotification');
    mainListingsView = getElement('mainListingsView');
    itemDetailView = getElement('itemDetailView');
    postItemModal = getElement('postItemModal');
    editProfileModal = getElement('editProfileModal');
    supportChatBtn = getElement('supportChatBtn');
    loginBtn = getElement('loginBtn');
    signupBtn = getElement('signupBtn');
    editProfileBtn = getElement('editProfileBtn');
    messagesHeaderBtn = getElement('messagesHeaderBtn');
    logoutBtnHeader = getElement('logoutBtnHeader');
    adminViewBtn = getElement('adminViewBtn');
    userEmailDisplayHeader = getElement('userEmailDisplayHeader');
    currentYearSpan = getElement('currentYear');
}

function setupEventListeners() {
    openFilterBtn.addEventListener('click', () => document.body.classList.add('sidebar-open'));
    closeFilterBtn.addEventListener('click', () => document.body.classList.remove('sidebar-open'));
    sidebarOverlay.addEventListener('click', () => document.body.classList.remove('sidebar-open'));
    
    searchBar.addEventListener('input', handleFilterChange);
    minPriceInput.addEventListener('input', handleFilterChange);
    maxPriceInput.addEventListener('input', handleFilterChange);
    sortListingsSelect.addEventListener('change', handleFilterChange);
    filterFreeItemsCheckbox.addEventListener('change', handleFilterChange);
    clearFiltersBtn.addEventListener('click', clearAllFilters);
    loadMoreBtn.addEventListener('click', () => fetchListings(false));
    
    priceRangeButtons.forEach(button => {
        button.addEventListener('click', () => {
            priceRangeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            minPriceInput.value = '';
            maxPriceInput.value = '';
            filterFreeItemsCheckbox.checked = false;
            currentMinPrice = button.dataset.min ? parseFloat(button.dataset.min) : null;
            currentMaxPrice = button.dataset.max ? parseFloat(button.dataset.max) : null;
            currentFilterFreeOnly = false;
            fetchListings(true);
        });
    });

    logoutBtnHeader.addEventListener('click', handleLogout);

    editProfileBtn.addEventListener('click', async () => {
        if (!currentUser) { window.location.href = 'login.html'; return; }
        const { data: profile } = await supabaseClient.from('profiles').select('username, contact_preference_info').eq('id', currentUser.id).single();
        getElement('profileUsername').value = profile?.username || '';
        getElement('profileContactInfo').value = profile?.contact_preference_info || '';
        getElement('profileEmail').value = currentUser.email;
        showModal(editProfileModal);
    });

    getElement('editProfileForm').addEventListener('submit', handleEditProfile);
    
    getElement('postItemBtn').addEventListener('click', async () => {
        if (!currentUser) { window.location.href = 'login.html'; return; }
        const { data: profile } = await supabaseClient.from('profiles').select('contact_preference_info').eq('id', currentUser.id).single();
        getElement('post_itemContact').value = profile?.contact_preference_info || '';
        showModal(postItemModal);
    });
    
    getElement('postItemForm').addEventListener('submit', (e) => { e.preventDefault(); showToast('Posting item...', 'info'); hideModal(postItemModal); fetchListings(true); });

    supportChatBtn.addEventListener('click', () => { window.location.href = currentUser ? 'messages.html' : 'login.html'; });

    listingsContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.listing-card');
        if (card) {
            const listingId = card.dataset.itemId;
            history.pushState({ listingId }, '', `/listing/${listingId}`);
            showItemDetailPage(listingId);
        }
    });

    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.listingId) {
            showItemDetailPage(e.state.listingId);
        } else {
            mainListingsView.style.display = 'block';
            itemDetailView.style.display = 'none';
            document.title = "Cleveland Marketplace";
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    assignDOMElements();
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    setupEventListeners();
    
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        updateAuthUI(session ? session.user : null);
    });

    const { data: { session } } = await supabaseClient.auth.getSession();
    updateAuthUI(session ? session.user : null);

    const pathParts = window.location.pathname.split('/').filter(p => p);
    if (pathParts[0] === 'listing' && pathParts[1]) {
        await showItemDetailPage(pathParts[1]);
    } else {
        await fetchListings(true);
    }
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
});