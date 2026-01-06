-- Fix the get_actor function to correctly lookup profile name using id instead of user_id
CREATE OR REPLACE FUNCTION public.get_actor()
 RETURNS TABLE(actor_id uuid, actor_name text, actor_role app_role)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  actor_id := auth.uid();

  -- Match on id (UUID) which corresponds to auth.uid(), not user_id (custom text ID)
  SELECT p.name
  INTO actor_name
  FROM public.profiles p
  WHERE p.id = actor_id
  LIMIT 1;

  SELECT ur.role
  INTO actor_role
  FROM public.user_roles ur
  WHERE ur.user_id = actor_id
  LIMIT 1;

  actor_name := COALESCE(actor_name, 'Unknown');
  actor_role := COALESCE(actor_role, 'staff');

  RETURN NEXT;
END;
$function$;