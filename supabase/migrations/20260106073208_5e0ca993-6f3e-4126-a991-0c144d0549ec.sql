-- Ensure activity log triggers never fail when running under service-role or unauthenticated contexts
-- (e.g. backend functions deleting data). Falls back to a synthetic "System" actor.

CREATE OR REPLACE FUNCTION public.get_actor()
RETURNS TABLE(actor_id uuid, actor_name text, actor_role public.app_role)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_role public.app_role;
BEGIN
  -- Service-role / backend contexts have no auth.uid(); provide safe defaults
  IF auth.uid() IS NULL THEN
    actor_id := '00000000-0000-0000-0000-000000000000'::uuid;
    actor_name := 'System';
    actor_role := 'admin'::public.app_role;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Correct lookup: profiles.id stores the auth user id
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    actor_id := auth.uid();
    actor_name := 'Unknown';
    actor_role := 'staff'::public.app_role;
    RETURN NEXT;
    RETURN;
  END IF;

  BEGIN
    v_role := public.get_user_role(auth.uid());
  EXCEPTION WHEN OTHERS THEN
    v_role := 'staff'::public.app_role;
  END;

  actor_id := v_profile.id;
  actor_name := v_profile.name;
  actor_role := v_role;
  RETURN NEXT;
END;
$$;