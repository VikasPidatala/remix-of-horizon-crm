CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'manager',
    'staff'
);


--
-- Name: admin_exists(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_exists() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE role = 'admin'
  )
$$;


--
-- Name: get_actor(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_actor() RETURNS TABLE(actor_id uuid, actor_name text, actor_role public.app_role)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  actor_id := auth.uid();

  SELECT p.name
  INTO actor_name
  FROM public.profiles p
  WHERE p.user_id = actor_id::text
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
$$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: safe_uuid(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.safe_uuid(p_text text) RETURNS uuid
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uuid uuid;
BEGIN
  IF p_text IS NULL OR btrim(p_text) = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_uuid := p_text::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;

  RETURN v_uuid;
END;
$$;


--
-- Name: trg_activity_log_leads(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_activity_log_leads() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  a record;
  v_action text;
  v_details text;
BEGIN
  SELECT * INTO a FROM public.get_actor();

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_details := 'a lead: ' || COALESCE(NEW.name, '');
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
    v_details := 'a lead: ' || COALESCE(NEW.name, '');
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_details := 'a lead: ' || COALESCE(OLD.name, '');
  END IF;

  INSERT INTO public.activity_logs (user_id, user_name, user_role, module, action, details)
  VALUES (a.actor_id, a.actor_name, a.actor_role, 'leads', v_action, v_details);

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: trg_activity_log_leaves(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_activity_log_leaves() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  a record;
  v_action text;
  v_details text;
BEGIN
  SELECT * INTO a FROM public.get_actor();

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_details := 'a leave request (' || COALESCE(NEW.leave_type, '') || ')';
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
    v_details := 'a leave request (' || COALESCE(NEW.leave_type, '') || '), status: ' || COALESCE(NEW.status, '');
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_details := 'a leave request (' || COALESCE(OLD.leave_type, '') || ')';
  END IF;

  INSERT INTO public.activity_logs (user_id, user_name, user_role, module, action, details)
  VALUES (a.actor_id, a.actor_name, a.actor_role, 'leaves', v_action, v_details);

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: trg_activity_log_tasks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_activity_log_tasks() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  a record;
  v_action text;
  v_details text;
BEGIN
  SELECT * INTO a FROM public.get_actor();

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_details := 'a task (status: ' || COALESCE(NEW.status, '') || ')';
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
    v_details := 'a task (status: ' || COALESCE(NEW.status, '') || ')';
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_details := 'a task (status: ' || COALESCE(OLD.status, '') || ')';
  END IF;

  INSERT INTO public.activity_logs (user_id, user_name, user_role, module, action, details)
  VALUES (a.actor_id, a.actor_name, a.actor_role, 'tasks', v_action, v_details);

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_name text NOT NULL,
    user_role public.app_role NOT NULL,
    module text NOT NULL,
    action text NOT NULL,
    details text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.activity_logs REPLICA IDENTITY FULL;


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    priority text DEFAULT 'low'::text NOT NULL,
    target_roles jsonb DEFAULT '["manager", "staff"]'::jsonb NOT NULL,
    created_by text NOT NULL,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT announcements_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])))
);

ALTER TABLE ONLY public.announcements REPLICA IDENTITY FULL;


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    logo_url text,
    app_name text DEFAULT 'ESWARI CRM'::text NOT NULL,
    primary_color text DEFAULT '215 80% 35%'::text NOT NULL,
    accent_color text DEFAULT '38 95% 55%'::text NOT NULL,
    sidebar_color text DEFAULT '220 30% 12%'::text NOT NULL,
    custom_css text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    favicon_url text
);


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    email text NOT NULL,
    address text,
    requirement_type text NOT NULL,
    bhk_requirement text NOT NULL,
    budget_min numeric NOT NULL,
    budget_max numeric NOT NULL,
    description text,
    preferred_location text,
    source text,
    status text DEFAULT 'pending'::text NOT NULL,
    follow_up_date timestamp with time zone,
    notes jsonb DEFAULT '[]'::jsonb,
    created_by text NOT NULL,
    assigned_project uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT leads_requirement_type_check CHECK ((requirement_type = ANY (ARRAY['villa'::text, 'apartment'::text, 'house'::text, 'plot'::text]))),
    CONSTRAINT leads_source_check CHECK ((source = ANY (ARRAY['call'::text, 'walk_in'::text, 'website'::text, 'referral'::text]))),
    CONSTRAINT leads_status_check CHECK ((status = ANY (ARRAY['interested'::text, 'not_interested'::text, 'pending'::text, 'reminder'::text])))
);

ALTER TABLE ONLY public.leads REPLICA IDENTITY FULL;


--
-- Name: leaves; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leaves (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    user_name text NOT NULL,
    user_role text NOT NULL,
    leave_type text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    document_url text,
    approved_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    rejection_reason text,
    CONSTRAINT leaves_leave_type_check CHECK ((leave_type = ANY (ARRAY['sick'::text, 'casual'::text, 'annual'::text, 'other'::text]))),
    CONSTRAINT leaves_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT leaves_user_role_check CHECK ((user_role = ANY (ARRAY['admin'::text, 'manager'::text, 'staff'::text])))
);

ALTER TABLE ONLY public.leaves REPLICA IDENTITY FULL;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    user_id text NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    status text DEFAULT 'active'::text NOT NULL,
    manager_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    location text NOT NULL,
    type text NOT NULL,
    price_min numeric NOT NULL,
    price_max numeric NOT NULL,
    launch_date date NOT NULL,
    possession_date date NOT NULL,
    amenities jsonb DEFAULT '[]'::jsonb,
    description text,
    tower_details text,
    nearby_landmarks jsonb DEFAULT '[]'::jsonb,
    photos jsonb DEFAULT '[]'::jsonb,
    cover_image text,
    status text DEFAULT 'upcoming'::text NOT NULL,
    created_by text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT projects_status_check CHECK ((status = ANY (ARRAY['upcoming'::text, 'ongoing'::text, 'completed'::text]))),
    CONSTRAINT projects_type_check CHECK ((type = ANY (ARRAY['villa'::text, 'apartment'::text, 'plots'::text])))
);

ALTER TABLE ONLY public.projects REPLICA IDENTITY FULL;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    next_action_date timestamp with time zone,
    notes jsonb DEFAULT '[]'::jsonb,
    attachments jsonb DEFAULT '[]'::jsonb,
    assigned_to text NOT NULL,
    assigned_project uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tasks_status_check CHECK ((status = ANY (ARRAY['visit'::text, 'family_visit'::text, 'pending'::text, 'completed'::text, 'rejected'::text])))
);

ALTER TABLE ONLY public.tasks REPLICA IDENTITY FULL;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL
);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: leaves leaves_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaves
    ADD CONSTRAINT leaves_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: leads activity_log_leads; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER activity_log_leads AFTER INSERT OR DELETE OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.trg_activity_log_leads();


--
-- Name: leaves activity_log_leaves; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER activity_log_leaves AFTER INSERT OR DELETE OR UPDATE ON public.leaves FOR EACH ROW EXECUTE FUNCTION public.trg_activity_log_leaves();


--
-- Name: tasks activity_log_tasks; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER activity_log_tasks AFTER INSERT OR DELETE OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.trg_activity_log_tasks();


--
-- Name: announcements update_announcements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: app_settings update_app_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leads update_leads_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leaves update_leaves_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_leaves_updated_at BEFORE UPDATE ON public.leaves FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: projects update_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tasks update_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leads leads_assigned_project_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_assigned_project_fkey FOREIGN KEY (assigned_project) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.profiles(id);


--
-- Name: tasks tasks_assigned_project_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_project_fkey FOREIGN KEY (assigned_project) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: projects Admins and managers can create projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can create projects" ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: projects Admins and managers can update projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can update projects" ON public.projects FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: announcements Admins can create announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: announcements Admins can delete announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete announcements" ON public.announcements FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can delete profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: projects Admins can delete projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete projects" ON public.projects FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: app_settings Admins can insert app settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert app settings" ON public.app_settings FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (NOT public.admin_exists())));


--
-- Name: profiles Admins can insert profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (NOT public.admin_exists())));


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (NOT public.admin_exists())));


--
-- Name: profiles Admins can update all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: announcements Admins can update announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update announcements" ON public.announcements FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: app_settings Admins can update app settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update app settings" ON public.app_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: activity_logs Admins can view activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view activity logs" ON public.activity_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: leaves Admins can view all leaves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all leaves" ON public.leaves FOR SELECT TO authenticated USING (true);


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: app_settings Anyone can view app settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view app settings" ON public.app_settings FOR SELECT USING (true);


--
-- Name: leads Authenticated users can create leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: tasks Authenticated users can create tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: leads Authenticated users can delete leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete leads" ON public.leads FOR DELETE TO authenticated USING (true);


--
-- Name: tasks Authenticated users can delete tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete tasks" ON public.tasks FOR DELETE TO authenticated USING (true);


--
-- Name: leads Authenticated users can update leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update leads" ON public.leads FOR UPDATE TO authenticated USING (true);


--
-- Name: tasks Authenticated users can update tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update tasks" ON public.tasks FOR UPDATE TO authenticated USING (true);


--
-- Name: announcements Authenticated users can view active announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active announcements" ON public.announcements FOR SELECT TO authenticated USING (true);


--
-- Name: leads Authenticated users can view all leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view all leads" ON public.leads FOR SELECT TO authenticated USING (true);


--
-- Name: projects Authenticated users can view all projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view all projects" ON public.projects FOR SELECT TO authenticated USING (true);


--
-- Name: tasks Authenticated users can view all tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view all tasks" ON public.tasks FOR SELECT TO authenticated USING (true);


--
-- Name: leaves Managers and admins can update leave status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can update leave status" ON public.leaves FOR UPDATE TO authenticated USING (true);


--
-- Name: leaves Managers can view staff and own leaves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view staff and own leaves" ON public.leaves FOR SELECT TO authenticated USING (true);


--
-- Name: profiles Managers can view staff profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view staff profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'::public.app_role));


--
-- Name: leaves Staff can view own leaves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view own leaves" ON public.leaves FOR SELECT TO authenticated USING (true);


--
-- Name: leaves Users can create own leaves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own leaves" ON public.leaves FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: activity_logs Users can insert own activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own activity logs" ON public.activity_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: leaves Users can update own pending leaves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own pending leaves" ON public.leaves FOR UPDATE TO authenticated USING (true);


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid()));


--
-- Name: activity_logs Users can view own activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own activity logs" ON public.activity_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING ((id = auth.uid()));


--
-- Name: user_roles Users can view own role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: leads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

--
-- Name: leaves; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;