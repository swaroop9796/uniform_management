-- Drop the original 5-param overload. The v1 architecture migration added a 6-param version
-- (with p_state_id) using CREATE OR REPLACE, which created a new overload instead of replacing
-- the original (different signature). PostgREST cannot resolve the ambiguity at runtime.
-- The 6-param version handles both legacy text-status calls and new state-id calls.
DROP FUNCTION IF EXISTS public.transition_uniform(uuid, text, uuid, uuid, text);
