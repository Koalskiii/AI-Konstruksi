-- AIKON registration flow:
-- Users register directly, then inform the Admin manually.
-- Admin reviews pending registrations from the in-app notification/panel.
-- No registration email is sent to the Admin.

drop trigger if exists registration_requests_notify_email
on public.registration_requests;
