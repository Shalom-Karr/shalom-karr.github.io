import { supabase } from './supabase-client.js';
import { updateHeaderAuthState } from './auth.js';

// --- GLOBAL STATE ---
let currentUser = null;
let userProfile = null;
let products = [];
let userOrder = null;
let bannerSettings = {};

// --- DOM ELEMENTS ---
const productGrid = document.getElementById('product-grid');
const cartItemsList = document.getElementById('cart-items');
const subtotalEl = document.getElementById('subtotal');
const totalCostEl = document.getElementById('total-cost');
const saveOrderBtn = document.getElementById('saveOrderBtn');
const cartStatusMessage = document.getElementById('cart-status-message');
const profileModal = document.getElementById('profileModal');
const profileForm = document.getElementById('profileForm');
const closeButton = profileModal.querySelector('.close-button');
const profileFormMessageEl = document.getElementById('profile-form-message');

// Banner Elements
const infoBannerLine1 = document.getElementById('info-banner-line1');
const infoBannerLine2 = document.getElementById('info-banner-line2');
const mainTitle = document.getElementById('main-title');
const mainSubtitle = document.getElementById('main-subtitle');

// "Other City" elements
const citySelect = document.getElementById('city');
const otherCityGroup = document.getElementById('otherCityGroup');
const otherCityInput = document.getElementById('other_city');

// --- HELPER FUNCTIONS ---
function showStatusMessage(element, message, type = 'info', duration = 4000) {
    element.textContent = message;
    element.className = `form-message ${type} visible`;
    if (type !== 'saving') {
        setTimeout(() => {
            element.textContent = '';
            element.className = 'form-message';
        }, duration);
    }
}

function isProfileComplete(profile) {
    if (!profile) return false;
    const requiredFields = [ 'last_name', 'first_name', 'mailing_title', 'address', 'city', 'family_members', 'staying_home', 'has_email_access', 'association_husband', 'association_wife' ];
    for (const field of requiredFields) {
        if (profile[field] === null || profile[field] === undefined || profile[field] === '') return false;
        if (field === 'city' && profile[field] === 'Other' && (!profile['other_city'] || profile['other_city'].trim() === '')) {
            return false;
        }
    }
    return true;
}

// --- INITIALIZATION & DATA FETCHING ---
async function initPage() {
    await updateHeaderAuthState();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.replace('login.html');
        return;
    }
    currentUser = session.user;

    try {
        await Promise.all([ fetchProfile(), fetchAndRenderProducts(), fetchUserOrder(), fetchBannerSettings() ]);
        updateBannerContent();
        populateOrderQuantities();
        updateCart();
        setupEventListeners();

        if (!isProfileComplete(userProfile)) {
            if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
                showStatusMessage(cartStatusMessage, 'Please complete your profile to continue.', 'info', 5000);
                setTimeout(() => { window.location.href = 'profile.html'; }, 2500);
            }
        }

    } catch (error) {
        const errorMessage = error.message || 'An unknown error occurred.';
        productGrid.innerHTML = `<p class="form-message error visible">Failed to load page data: ${errorMessage}</p>`;
        console.error("Initialization Error:", error);
    }
}

async function fetchProfile() {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    if (error && error.code !== 'PGRST116') {
        throw new Error('Could not fetch your profile.');
    }
    userProfile = data || { id: currentUser.id, email: currentUser.email };
}

async function fetchAndRenderProducts() {
    const { data, error } = await supabase.from('products').select('*').eq('is_active', true).order('category').order('name');
    if (error) throw new Error('Could not load products.');
    products = data;
    const productsByCategory = products.reduce((acc, p) => { (acc[p.category] = acc[p.category] || []).push(p); return acc; }, {});
    productGrid.innerHTML = Object.entries(productsByCategory).map(([category, items]) => `
        <section class="product-category-section"><h2 class="section-title">${category}</h2><div class="product-grid-inner">
        ${items.map(product => `<div class="product-card"><h3>${product.name}</h3><p class="product-description">${product.description || ''}</p><p class="product-price">$${product.price.toFixed(2)}</p><select data-product-id="${product.id}">${Array.from({ length: product.max_quantity + 1 }, (_, i) => `<option value="${i}">${i}</option>`).join('')}</select></div>`).join('')}
        </div></section>`).join('');
}

async function fetchUserOrder() {
    const { data, error } = await supabase.from('orders').select('order_items').eq('user_id', currentUser.id).single();
    if (error && error.code !== 'PGRST116') throw new Error('Could not fetch your order history.');
    userOrder = data;
}

async function fetchBannerSettings() {
    const { data, error } = await supabase.from('settings').select('*').limit(1).single();
    if (error && error.code !== 'PGRST116') throw new Error('Could not load banner settings.');
    bannerSettings = data || {};
}

function updateBannerContent() {
    infoBannerLine1.innerHTML = bannerSettings.info_banner_text_1 || '<strong>Order Deadline:</strong> Not set';
    infoBannerLine2.innerHTML = bannerSettings.info_banner_text_2 || '<strong>Pickup Day:</strong> Not set';
    mainTitle.textContent = bannerSettings.header_title || 'Yom Tov Order Program';
    mainSubtitle.textContent = bannerSettings.header_subtitle || 'Select your items below.';
}

// --- UI & FORM LOGIC ---
function populateProfileForm() {
    if (!userProfile) return;
    for (const key in userProfile) {
        const element = profileForm.elements[key];
        if (element) {
            if (element.type === 'radio') {
                const radioToSelect = document.querySelector(`input[name="${key}"][value="${userProfile[key]}"]`);
                if (radioToSelect) radioToSelect.checked = true;
            } else {
                element.value = userProfile[key] || '';
            }
        }
    }
    if (profileForm.email) profileForm.email.value = currentUser.email;

    // Handle "Other City" logic
    const isOtherCity = !['Beachwood', 'Cleveland Heights', 'Shaker Heights', 'University Heights', 'Wickliffe'].includes(userProfile.city);
    if (isOtherCity && userProfile.city) {
        citySelect.value = 'Other';
        otherCityGroup.style.display = 'block';
        otherCityInput.required = true;
        otherCityInput.value = userProfile.city; // The actual custom city name
    } else {
        citySelect.value = userProfile.city || '';
        otherCityGroup.style.display = 'none';
        otherCityInput.required = false;
    }
}

function populateOrderQuantities() {
    if (!userOrder || !userOrder.order_items) return;
    Object.entries(userOrder.order_items).forEach(([productName, quantity]) => {
        const product = products.find(p => p.name === productName);
        if (product) {
            const selectEl = document.querySelector(`select[data-product-id="${product.id}"]`);
            if (selectEl) selectEl.value = quantity;
        }
    });
}

function updateCart() {
    let subtotal = 0;
    const selectedProducts = [];
    document.querySelectorAll('select[data-product-id]').forEach(select => {
        const quantity = parseInt(select.value);
        if (quantity > 0) {
            const product = products.find(p => p.id == select.dataset.productId);
            if (product) {
                const itemTotal = product.price * quantity;
                subtotal += itemTotal;
                selectedProducts.push({ ...product, quantity, itemTotal });
            }
        }
    });

    cartItemsList.innerHTML = selectedProducts.length > 0 ? selectedProducts.map(p => `
        <div class="cart-item"><span class="item-name">${p.quantity} x ${p.name}</span><span class="item-total">$${p.itemTotal.toFixed(2)}</span></div>`).join('') 
        : '<p class="cart-empty-message">Your cart is empty.</p>';
    
    const totalCost = subtotal + 15;
    subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    totalCostEl.textContent = `$${totalCost.toFixed(2)}`;
}

// --- EVENT HANDLERS & SAVING DATA ---
function setupEventListeners() {
    productGrid.addEventListener('change', event => { if (event.target.tagName === 'SELECT') updateCart(); });
    saveOrderBtn.addEventListener('click', () => {
        if (isProfileComplete(userProfile)) {
            saveOrder();
        } else {
            populateProfileForm();
            profileModal.style.display = 'block';
            showStatusMessage(profileFormMessageEl, 'Please complete your profile before saving.', 'error');
        }
    });

    closeButton.addEventListener('click', () => profileModal.style.display = 'none');
    profileForm.addEventListener('submit', handleProfileAndOrderSave);
    
    citySelect.addEventListener('change', () => {
        if (citySelect.value === 'Other') {
            otherCityGroup.style.display = 'block';
            otherCityInput.required = true;
        } else {
            otherCityGroup.style.display = 'none';
            otherCityInput.required = false;
            otherCityInput.value = '';
        }
    });
}

async function handleProfileAndOrderSave(event) {
    event.preventDefault();
    const submitBtn = profileForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const formData = new FormData(profileForm);
    const formProps = Object.fromEntries(formData);
    
    let finalCity = formProps.city;
    if (formProps.city === 'Other') {
        finalCity = formProps.other_city;
    }
    
    const profileUpdate = {
        last_name: formProps.last_name,
        first_name: formProps.first_name,
        spouse_first_name: formProps.spouse_first_name,
        mailing_title: formProps.mailing_title,
        address: formProps.address,
        city: finalCity, // Use the final calculated city value
        home_phone: formProps.home_phone,
        husband_cell: formProps.husband_cell,
        wife_cell: formProps.wife_cell,
        family_members: parseInt(formProps.family_members),
        association_husband: formProps.association_husband,
        association_wife: formProps.association_wife,
        staying_home: formProps.staying_home,
        has_email_access: formProps.has_email_access,
        updated_at: new Date().toISOString()
    };
    
    // Add other_city to the update if the user selected "Other"
    if (formProps.city === 'Other') {
        profileUpdate.other_city = formProps.other_city;
    }

    const { error: profileError } = await supabase.from('profiles').update(profileUpdate).eq('id', currentUser.id);
    if (profileError) {
        showStatusMessage(profileFormMessageEl, `Error: ${profileError.message}`, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Profile & Order';
    } else {
        userProfile = { ...userProfile, ...profileUpdate };
        await saveOrder();
        profileModal.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Profile & Order';
    }
}

async function saveOrder() {
    saveOrderBtn.disabled = true;
    showStatusMessage(cartStatusMessage, 'Saving your order...', 'saving');
    const order_items = {};
    let items_subtotal = 0;
    document.querySelectorAll('select[data-product-id]').forEach(select => {
        const quantity = parseInt(select.value);
        if (quantity > 0) {
            const product = products.find(p => p.id == select.dataset.productId);
            if (product) {
                order_items[product.name] = quantity;
                items_subtotal += product.price * quantity;
            }
        }
    });

    const orderData = { user_id: currentUser.id, order_items, total_cost: items_subtotal + 15, updated_at: new Date().toISOString() };
    try {
        const { error } = await supabase.from('orders').upsert(orderData, { onConflict: 'user_id' });
        if (error) throw error;
        showStatusMessage(cartStatusMessage, 'Order saved successfully!', 'success');
    } catch (error) {
        showStatusMessage(cartStatusMessage, `Error: ${error.message}`, 'error');
    } finally {
        saveOrderBtn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', initPage);