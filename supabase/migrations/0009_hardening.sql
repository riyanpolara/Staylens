-- ============================================================================
-- StayLens · Migration 0009 · Security hardening
-- ----------------------------------------------------------------------------
-- Resolves Supabase advisor WARNs:
--   * function_search_path_mutable  → pin search_path on our functions
--   * anon/authenticated SECURITY DEFINER executable → revoke RPC on internals
-- ============================================================================

-- Pin search_path (immutable) on our own functions.
-- set_updated_at only calls now() (pg_catalog) → empty search_path is safe.
alter function public.set_updated_at() set search_path = '';

-- Search RPCs need public (tables) + extensions (pgvector <=> operator).
alter function public.match_properties(vector, int, float, room_type_enum, numeric, int)
    set search_path = public, extensions;
alter function public.similar_properties(uuid, int)
    set search_path = public, extensions;

-- Internal-only functions must not be callable through the REST/RPC API.
revoke execute on function public.handle_new_user()  from anon, authenticated, public;
revoke execute on function public.rls_auto_enable()  from anon, authenticated, public;
