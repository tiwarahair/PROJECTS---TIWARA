-- Removes the stylists added by seed-staging-stylists.sql; deleting the accounts cascades to their businesses.
delete from auth.users where email like 'staging-seed-%@example.com';
