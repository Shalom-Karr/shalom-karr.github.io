import { supabase } from './supabase-client.js';
import { updateHeaderAuthState } from './auth.js';

let currentUser = null;
let userProfile = null;

const profileForm = document.getElementById('profileForm');
const profileFormMessageEl = document.getElementById('profile-form-message');
const profileFormSubmitBtn = profileForm.querySelector('button[type="submit"]');

const citySelect = document.getElementById('city');
const otherCityGroup = document.getElementById('otherCityGroup');
const otherCityInput = document.getElementById('other_city');

async function fetchAndPopulateProfileForm() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = session.user;

    try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
        if (error && error.code !== 'PGRST116') throw error;
        userProfile = data || { id: currentUser.id, email: currentUser.email };
        populateEditProfileForm(userProfile);
    } catch (error) {
        console.error('Error fetching profile:', error);
        displayProfileMessage(`Error loading profile: ${error.message}`, 'error');
    }
}

function populateEditProfileForm(profile) {
    if (!profile) return;
    for (const key in profile) {
        if (profile.hasOwnProperty(key)) {
            const element = profileForm.elements[key];
            if (element) {
                if (element.type === 'radio') {
                    const radioToSelect = document.querySelector(`input[name="${key}"][value="${profile[key]}"]`);
                    if (radioToSelect) radioToSelect.checked = true;
                } else {
                    element.value = profile[key] || '';
                }
            }
        }
    }
    if (profileForm.email) profileForm.email.value = profile.email || '';

    const presetCities = Array.from(citySelect.options).map(opt => opt.value);
    const isOtherCity = profile.city && !presetCities.includes(profile.city);
    
    if (isOtherCity) {
        citySelect.value = 'Other';
        otherCityGroup.style.display = 'block';
        otherCityInput.required = true;
        otherCityInput.value = profile.city;
    } else {
        citySelect.value = profile.city || '';
        otherCityGroup.style.display = 'none';
        otherCityInput.required = false;
    }
}

function displayProfileMessage(message, type = 'info') {
    profileFormMessageEl.textContent = message;
    profileFormMessageEl.className = `form-message ${type} visible`;
}

async function handleProfileSave(event) {
    event.preventDefault();
    profileFormSubmitBtn.disabled = true;
    profileFormSubmitBtn.textContent = 'Saving...';
    displayProfileMessage('', '');

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
        city: finalCity,
        home_phone: formProps.home_phone,
        husband_cell: formProps.husband_cell,
        wife_cell: formProps.wife_cell,
        family_members: parseInt(formProps.family_members),
        association_husband: formProps.association_husband,
        association_wife: formProps.association_wife,
        staying_home: formProps.staying_home,
        has_email_access: formProps.has_email_access,
        phone_number: formProps.phone_number,
        other_city: formProps.other_city, // Save for reference
        updated_at: new Date().toISOString()
    };

    try {
        const { error } = await supabase.from('profiles').update(profileUpdate).eq('id', currentUser.id);
        if (error) throw error;
        displayProfileMessage('Profile updated successfully!', 'success');
        setTimeout(() => displayProfileMessage('', ''), 3000);
    } catch (error) {
        console.error('Error saving profile:', error);
        displayProfileMessage(`Error: ${error.message}`, 'error');
    } finally {
        profileFormSubmitBtn.disabled = false;
        profileFormSubmitBtn.textContent = 'Update Profile';
    }
}

function setupEventListeners() {
    profileForm.addEventListener('submit', handleProfileSave);
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

document.addEventListener('DOMContentLoaded', async () => {
    await updateHeaderAuthState();
    await fetchAndPopulateProfileForm();
    setupEventListeners();
});