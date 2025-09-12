import { supabase } from './supabase-client.js';
import { updateHeaderAuthState } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    await updateHeaderAuthState();

    const volunteerForm = document.getElementById('volunteer-form');
    const submitBtn = document.getElementById('submit-btn');
    const statusMessage = document.getElementById('status-message');

    // Pre-fill form if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, phone_number')
            .eq('id', session.user.id)
            .single();

        if (profile) {
            volunteerForm.first_name.value = profile.first_name || '';
            volunteerForm.last_name.value = profile.last_name || '';
            volunteerForm.email.value = profile.email || session.user.email;
            volunteerForm.cell_phone.value = profile.phone_number || '';
        }
    }

    volunteerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        submitBtn.disabled = true;
        statusMessage.textContent = 'Submitting your info...';
        statusMessage.className = 'form-message saving visible';

        try {
            const formData = new FormData(volunteerForm);
            const formProps = Object.fromEntries(formData);
            
            const availability = Array.from(document.querySelectorAll('input[name="availability"]:checked')).map(cb => cb.value);
            const preferred_roles = Array.from(document.querySelectorAll('input[name="preferred_roles"]:checked')).map(cb => cb.value);
            
            if (availability.length === 0 || preferred_roles.length === 0) {
                throw new Error("Please select at least one option for Availability and Preferred Roles.");
            }
            
            const { data: { session } } = await supabase.auth.getSession();
            
            const submissionData = {
                user_id: session ? session.user.id : null,
                first_name: formProps.first_name,
                last_name: formProps.last_name,
                email: formProps.email,
                cell_phone: formProps.cell_phone,
                contact_method: formProps.contact_method,
                availability: availability,
                previously_volunteered: formProps.previously_volunteered,
                preferred_roles: preferred_roles,
                additional_volunteers: formProps.additional_volunteers,
                has_kemach_order: formProps.has_kemach_order,
                suggestions: formProps.suggestions
            };

            const { error } = await supabase.from('volunteers').insert([submissionData]);
            if (error) throw error;

            statusMessage.textContent = 'Thank you for volunteering! We will be in touch soon.';
            statusMessage.className = 'form-message success visible';
            volunteerForm.reset();
        } catch (error) {
            console.error('Error submitting volunteer form:', error.message);
            statusMessage.textContent = `Error: ${error.message}. Please try again.`;
            statusMessage.className = 'form-message error visible';
        } finally {
            submitBtn.disabled = false;
        }
    });
});