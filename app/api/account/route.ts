import { createClient } from "@supabase/supabase-js";

export async function DELETE(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return Response.json(
      {
        error:
          "Account deletion is not configured. Add SUPABASE_SERVICE_ROLE_KEY on the server.",
      },
      { status: 500 }
    );
  }

  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return Response.json({ error: "Missing authorization token." }, { status: 401 });
  }

  try {
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return Response.json({ error: "Invalid session." }, { status: 401 });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const tables = ["daily_actions", "daily_progress", "daily_reflections"];

    for (const table of tables) {
      const { error } = await adminClient.from(table).delete().eq("user_id", user.id);

      if (error) {
        return Response.json(
          { error: `Could not delete ${table}: ${error.message}` },
          { status: 500 }
        );
      }
    }

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteUserError) {
      return Response.json(
        { error: `Could not delete account: ${deleteUserError.message}` },
        { status: 500 }
      );
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "The account service could not be reached. Please try again." },
      { status: 502 }
    );
  }
}
