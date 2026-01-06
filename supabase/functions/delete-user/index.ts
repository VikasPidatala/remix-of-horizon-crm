import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the requesting user is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can delete users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Deleting user ${userId} and all related data...`);

    // Delete all related data before deleting the user
    // Delete leads created by this user
    const { error: leadsError } = await supabaseAdmin
      .from("leads")
      .delete()
      .eq("created_by", userId);
    if (leadsError) console.log("Error deleting leads:", leadsError.message);

    // Delete tasks assigned to this user
    const { error: tasksError } = await supabaseAdmin
      .from("tasks")
      .delete()
      .eq("assigned_to", userId);
    if (tasksError) console.log("Error deleting tasks:", tasksError.message);

    // Delete leaves for this user
    const { error: leavesError } = await supabaseAdmin
      .from("leaves")
      .delete()
      .eq("user_id", userId);
    if (leavesError) console.log("Error deleting leaves:", leavesError.message);

    // Delete projects created by this user
    const { error: projectsError } = await supabaseAdmin
      .from("projects")
      .delete()
      .eq("created_by", userId);
    if (projectsError) console.log("Error deleting projects:", projectsError.message);

    // Delete announcements created by this user
    const { error: announcementsError } = await supabaseAdmin
      .from("announcements")
      .delete()
      .eq("created_by", userId);
    if (announcementsError) console.log("Error deleting announcements:", announcementsError.message);

    // Delete activity logs for this user
    const { error: activityError } = await supabaseAdmin
      .from("activity_logs")
      .delete()
      .eq("user_id", userId);
    if (activityError) console.log("Error deleting activity logs:", activityError.message);

    console.log(`All related data deleted for user ${userId}, now deleting auth user...`);

    // Delete the user (this will cascade to profiles and user_roles due to ON DELETE CASCADE)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      // Handle "User not found" gracefully - user may already be deleted
      if (deleteError.message?.includes('User not found') || deleteError.message?.includes('not found')) {
        console.log(`User ${userId} already deleted or not found, treating as success`);
        return new Response(
          JSON.stringify({ success: true, alreadyDeleted: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
