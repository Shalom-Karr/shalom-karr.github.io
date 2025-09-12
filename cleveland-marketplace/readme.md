# Cleveland Marketplace

Cleveland Marketplace is a web application that allows users to buy and sell items by posting listings. It features user authentication, item posting, item editing/deletion, an item detail view, a commenting system, user profile editing, and a direct messaging system. A superadmin role has extended privileges.

## Features

*   **User Authentication:**
    *   Signup with email, password, phone number, and optional display name on a dedicated `signup.html` page.
    *   Login with email and password on a dedicated `login.html` page.
    *   Logout functionality.
    *   Password Reset functionality.
    *   "My Account" panel to manage display name and phone number.
*   **Listings:**
    *   Users can post new items with name, description, price (or mark as free), contact info, and an optional image (uploaded or via URL).
    *   Browse all listings on the main `index.html` page.
    *   Search listings by keywords.
    *   Filter by price range, free items, and sort by various criteria.
    *   "Load More" functionality for listings.
*   **Item Detail Page:**
    *   View full details of an item, including image, description, price, contact info, and seller's display name/email. This is a dynamic view within `index.html`.
    *   Owner of the item (or superadmin) can edit or delete the listing.
*   **Comments:**
    *   Logged-in users can post comments on item detail pages.
    *   Comment author (or superadmin) can delete comments.
*   **Direct Messaging:**
    *   A dedicated `messages.html` page for all user communication.
    *   Users can initiate conversations with item sellers or start new general conversations with other users.
    *   Real-time chat interface.
    *   Ability to send text messages and attach files (images previewed, others as links).
    *   Reply to specific messages within a conversation.
    *   React to messages with emojis.
    *   Users can delete their own messages.
*   **Superadmin Role (`SUPERADMIN_USER_ID`):**
    *   A dedicated `admin.html` page for administrative tasks.
    *   Can edit or delete any listing or comment.
    *   "View All Messages": View all conversations on the site.
    *   "User Management": View a list of all registered users and search them.
*   **User Experience & UI:**
    *   Responsive design.
    *   Multi-page architecture for reliability (index, login, signup, messages, admin).
    *   Modals for posting/editing items and editing the user profile.
    *   Toast notifications for user feedback.
    *   Loading indicators.
    *   Footer with current year and links to legal pages.

## Tech Stack

*   **Frontend:** HTML, CSS, Vanilla JavaScript
*   **Backend & Database:** Supabase (PostgreSQL, Authentication, Storage, Realtime)

## Setup Instructions

To run this project locally or deploy it:

1.  **Create Project Files:**
    *   `index.html`: Main application page for browsing listings.
    *   `login.html`: User login page.
    *   `signup.html`: User registration page.
    *   `messages.html`: User-to-user messaging page.
    *   `admin.html`: Administrator panel.
    *   `terms.html` & `privacy.html`: Legal pages.
    *   `style.css`: All styles for the application.
    *   `script.js`: Main JavaScript logic for `index.html`. Other pages contain their own self-contained scripts.

2.  **Supabase Project Setup:**
    *   Create a new project on [Supabase](https://supabase.com/).
    *   **Authentication:**
        *   Enable Email provider.
        *   Disable "Confirm email" if you want users to log in immediately after signup without email verification (for demo purposes). For production, keep it enabled.
    *   **Database:**
        *   Go to the SQL Editor in your Supabase dashboard.
        *   You will need to create tables for:
            *   `listings` (id, user_id, name, description, price, image_url, contact_info, created_at)
            *   `comments` (id, listing_id, user_id, content, created_at)
            *   `profiles` (id (matches auth.users.id), username, email, phone_number, is_2fa_enabled, updated_at)
            *   `conversations` (id, created_at, updated_at, listing_id (optional))
            *   `conversation_participants` (conversation_id, user_id)
            *   `messages` (id, conversation_id, sender_id, content, attachment_url, attachment_filename, attachment_mimetype, parent_message_id, thread_id, reply_snippet, created_at)
            *   `message_reactions` (id, message_id, user_id, emoji, created_at)
        *   Set up Row Level Security (RLS) policies for all tables to control data access. This is crucial for security.
        *   Create database views and RPC functions as needed (e.g., `listings_with_author_info`, `get_user_conversations`, `get_or_create_conversation`, etc., as referenced in the scripts).
    *   **Storage:**
        *   Create a public bucket named `listing-images`.
        *   Create a public bucket named `message-attachments`.
        *   Configure RLS policies for storage buckets to restrict uploads/deletes.

3.  **Configure Scripts:**
    *   Open `script.js`, `login.html`, `signup.html`, `messages.html`, and `admin.html`.
    *   In each file, find and update the following constants at the top of the script blocks with your Supabase project details:
        *   `SUPABASE_URL`: Your Supabase Project URL.
        *   `SUPABASE_ANON_KEY`: Your Supabase Project Anon Key.
        *   `SUPERADMIN_USER_ID`: The UUID of the user you want to designate as the superadmin. You can get this from the `auth.users` table in Supabase after the user signs up.

4.  **Running the Application:**
    *   Serve the files using a local web server (e.g., VS Code Live Server, Python's `http.server`, Node.js `serve` package).
    *   Open `index.html` in your browser.

## Development Notes

*   **Multi-Page Architecture:** The site is structured as a traditional multi-page application to ensure stability and avoid caching issues. Each major function (login, signup, messages) has its own HTML file.
*   **Cache-Busting:** On login, the app redirects to the main page with a timestamp (`?t=...`) to ensure the browser fetches a fresh copy and correctly displays the logged-in state.
*   **Security:** Row Level Security (RLS) in Supabase is critical. Ensure your policies are correctly configured to prevent unauthorized data access.
