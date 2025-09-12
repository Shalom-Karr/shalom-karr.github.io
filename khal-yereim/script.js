// script.js
// Import the supabase client
import { supabase } from './supabase-client.js';

// --- DOM Elements ---
const shulNameNavEl = document.querySelector('#site-title-nav'); // Corrected selector for the nav title
const shulAddressEl = document.getElementById('shul-address');
const shulPhoneEl = document.getElementById('shul-phone');
const rabbiNameTitleEl = document.getElementById('rabbi-name-title');
const currentYearSpan = document.getElementById('current-year');
// Removed subscribeMessage, subscribeButton, subscriberEmailInput as they are not in the provided index.html
const subscribeForm = document.getElementById('subscribe-form');
const subscriberEmailInput = document.getElementById('subscriber-email'); // This IS in index.html, needs to be available for form submission
const subscribeButton = document.getElementById('subscribe-button'); // This IS in index.html, needs to be available for form submission


// --- Global Variables ---
let shulConfig = {}; // Will hold settings AND shulConfig.json data

// --- FUNCTIONS ---

async function loadSupabaseSettings() {
    try {
        // Use the Supabase client instance to interact with the 'settings' table
        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .limit(1)
            .single(); // Fetching a single row

        if (error) {
            // Handle the specific error code for "no rows returned" gracefully
            if (error.code === 'PGRST116') {
                console.warn("No settings found in Supabase 'settings' table.");
                // If no settings in DB, we still want to use shulConfig.json defaults.
                // No error message to user here, as shulConfig.json will be used.
                return; 
            }
            console.error("Supabase error fetching settings:", error);
            throw new Error(`Failed to load settings: ${error.message}`);
        }

        if (data) {
            // Merge fetched settings with existing shulConfig
            // This allows Supabase data to override shulConfig.json data
            shulConfig = { ...shulConfig, ...data }; 
            console.log("Supabase settings loaded:", data);
            
            // Update UI elements based on fetched settings
            if (data.site_title) {
                document.title = data.site_title; // Update browser tab title
                if (shulNameNavEl) shulNameNavEl.textContent = data.site_title;
            }
            // Update address and make it a clickable map link
            if (shulAddressEl) {
                if (data.address) {
                    shulAddressEl.innerHTML = `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.address)}" target="_blank" rel="noopener noreferrer">${data.address}</a>`;
                } else {
                    shulAddressEl.textContent = 'Address not available';
                }
            }
            // Update phone number and make it a tel link
            if (shulPhoneEl) {
                shulPhoneEl.textContent = data.phone || 'Phone not available';
                shulPhoneEl.href = data.phone ? `tel:${data.phone.replace(/[^0-9]/g, '')}` : '#';
            }
            // Update rabbi name title
            if (rabbiNameTitleEl) {
                rabbiNameTitleEl.textContent = data.rabbi_name || 'Rabbi'; 
            }
            
        } else {
            // This block might be redundant if error.code === 'PGRST116' is handled above.
            console.warn("No settings found in the 'settings' table.");
        }
    } catch (e) {
        console.error("Failed to load Supabase settings:", e);
        // Display error messages for critical elements if they are still showing "Loading..." or default text
        if (document.title === 'Khal Yereim | A Shul in Cleveland Heights') { // Check if default title is still there
             document.title = "Error Loading Settings";
        }
        if (shulNameNavEl) shulNameNavEl.textContent = "Error";
        if (shulAddressEl) shulAddressEl.innerHTML = '<a href="#">Error loading address</a>'; // Keep it a link
        if (shulPhoneEl) {
            shulPhoneEl.textContent = "Error loading phone";
            shulPhoneEl.href = '#';
        }
        if (rabbiNameTitleEl) rabbiNameTitleEl.textContent = "Error loading rabbi";
    }
}

// --- Function to load shulConfig.json ---
async function loadShulConfigJson() {
    try {
        const response = await fetch('shulConfig.json');
        if (!response.ok) {
            if (response.status === 404) {
                console.warn("shulConfig.json not found. Proceeding with default configurations.");
                shulConfig = {
                    shulName: "Khal Yereim",
                    rabbiName: "Rabbi",
                    address: "1771 S. Taylor Rd, Cleveland Heights, OH 44118",
                    phone: "216-321-5756",
                    supabaseUrl: null // Ensure this is null if not loaded, important for subscription handler
                };
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        shulConfig = await response.json();
        console.log("shulConfig.json loaded successfully:", shulConfig);

        // Update UI elements from shulConfig.json first
        if (shulConfig.shulName) {
             if (shulNameNavEl) shulNameNavEl.textContent = shulConfig.shulName;
             // Set default title if not already set by a previous load
             if (document.title === 'Khal Yereim | A Shul in Cleveland Heights') {
                document.title = `${shulConfig.shulName} | A Shul in Cleveland Heights`;
             }
        }
        // Update address from JSON, make it a clickable map link
        if (shulAddressEl) {
            if (shulConfig.address) {
                shulAddressEl.innerHTML = `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shulConfig.address)}" target="_blank" rel="noopener noreferrer">${shulConfig.address}</a>`;
            } else {
                shulAddressEl.textContent = 'Address not available';
            }
        }
        // Update phone from JSON, make it a tel link
        if (shulPhoneEl) {
            shulPhoneEl.textContent = shulConfig.phone || "Phone not available";
            shulPhoneEl.href = shulConfig.phone ? `tel:${shulConfig.phone.replace(/[^0-9]/g, '')}` : '#';
        }
        // Update rabbi name from JSON
        if (rabbiNameTitleEl) {
            rabbiNameTitleEl.textContent = shulConfig.rabbiName || "Rabbi";
        }
         // Update footer year
        if (currentYearSpan) {
            currentYearSpan.textContent = new Date().getFullYear();
        }

    } catch (e) {
        console.error("Failed to load shulConfig.json:", e);
        // Use hardcoded fallbacks if shulConfig fails to load and is critical
        if (shulNameNavEl) shulNameNavEl.textContent = "Khal Yereim";
        if (document.title === 'Khal Yereim | A Shul in Cleveland Heights') { // Check if default title is still there
            document.title = "Khal Yereim | A Shul in Cleveland Heights"; // Keep default if loading failed
        }
        if (shulAddressEl) shulAddressEl.innerHTML = '<a href="https://www.google.com/maps/search/?api=1&query=1771+S+Taylor+Rd,+Cleveland+Heights,+OH+44118" target="_blank" rel="noopener noreferrer">1771 S. Taylor Rd, Cleveland Heights, OH 44118</a>';
        if (shulPhoneEl) {
            shulPhoneEl.textContent = "216-321-5756";
            shulPhoneEl.href = "tel:2163215756";
        }
         if (currentYearSpan) {
            currentYearSpan.textContent = new Date().getFullYear();
        }
    }
}

// --- Subscribe Form Logic ---
if (subscribeForm && subscriberEmailInput && subscribeButton) {
    subscribeForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = subscriberEmailInput.value.trim();
        if (!email || !email.includes('@')) {
            // For this specific index.html, there's no subscribe-message element to display errors.
            // Log to console or potentially alert the user if a message element isn't added later.
            console.error("Invalid email entered.");
            alert("Please enter a valid email address."); // Use alert as a fallback
            return;
        }

        // IMPORTANT: Ensure shulConfig.supabaseUrl is available and correct
        // This script assumes you have a Supabase Edge Function named 'subscribeHandler'
        // that handles the email subscription logic (e.g., adding to a mailing list).
        if (!shulConfig || !shulConfig.supabaseUrl) {
            console.error("Supabase URL not found in shulConfig or config not loaded.");
            alert("Configuration error. Cannot subscribe."); // Use alert as a fallback
            return;
        }

        const functionUrl = `${shulConfig.supabaseUrl}/functions/v1/subscribeHandler`;

        // Provide user feedback
        subscribeButton.disabled = true;
        const originalButtonText = subscribeButton.textContent;
        subscribeButton.textContent = 'Subscribing...';

        try {
            const response = await fetch(functionUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: email }),
            });

            const result = await response.json();

            if (response.ok) {
                subscriberEmailInput.value = ''; // Clear the input
                console.log("Subscription successful:", result.message);
                alert(result.message || "Thank you for subscribing!"); // Use alert for immediate feedback
            } else {
                throw new Error(result.error || `Subscription failed: ${response.statusText}`);
            }
        } catch (error) {
            console.error("Subscription error:", error);
            alert(`Subscription error: ${error.message}`); // Use alert for immediate feedback
        } finally {
            subscribeButton.textContent = originalButtonText;
            subscribeButton.disabled = false;
        }
    });
}


// --- INITIALIZATION SEQUENCE ---
// Use DOMContentLoaded to ensure the DOM is fully loaded before manipulating it.
document.addEventListener('DOMContentLoaded', () => {
    // 1. Load shulConfig.json first to get base configuration (like Supabase URL).
    loadShulConfigJson()
        .then(() => {
            // 2. Then, load Supabase settings to merge/override with JSON config.
            // This ensures Supabase data takes precedence if available.
            return loadSupabaseSettings();
        })
        .then(() => {
            // 3. After all configurations are loaded, initialize other components
            // that might depend on the final shulConfig.
            
            // Example: Update the footer year if it wasn't already set by JSON or Supabase.
            if (currentYearSpan && currentYearSpan.textContent === '2025') { // Check if default is still present
                currentYearSpan.textContent = new Date().getFullYear();
            }

            // Any other initialization logic that needs the complete config can go here.
        })
        .catch(error => {
            console.error("Overall initialization failed:", error);
            // Handle critical initialization errors that might affect multiple parts of the page
            if (document.title === 'Khal Yereim | A Shul in Cleveland Heights') {
                document.title = "Error";
            }
            if (shulNameNavEl) shulNameNavEl.textContent = "Error";
            if (shulAddressEl) shulAddressEl.innerHTML = '<a href="#">Error loading address</a>';
            if (shulPhoneEl) {
                shulPhoneEl.textContent = "Error loading phone";
                shulPhoneEl.href = '#';
            }
        });
});