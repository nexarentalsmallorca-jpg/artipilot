import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    console.error("Demo auth error:", error);
    return null;
  }

  return user;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user?.id) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { data: workspaces, error: workspaceError } = await supabaseAdmin
      .from("artipilot_workspaces")
      .select("id, owner_user_id, business_name")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (workspaceError) {
      console.error("Demo workspace error:", workspaceError);

      return NextResponse.json(
        { ok: false, error: "Could not load workspace" },
        { status: 500 }
      );
    }

    const workspace = workspaces?.[0];

    if (!workspace?.id) {
      return NextResponse.json(
        { ok: false, error: "No workspace found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const nowIso = now.toISOString();

    const demoPhone = "+34600000000";
    const demoName = "Demo Customer";

    const { error: connectionDeleteError } = await supabaseAdmin
      .from("artipilot_whatsapp_connections")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("owner_user_id", user.id)
      .eq("phone_number_id", "demo_phone_number_id");

    if (connectionDeleteError) {
      console.error("Demo old connection delete error:", connectionDeleteError);
    }

    const { error: connectionError } = await supabaseAdmin
      .from("artipilot_whatsapp_connections")
      .insert({
        workspace_id: workspace.id,
        owner_user_id: user.id,
        status: "connected",
        display_phone_number: "DEMO WhatsApp Number",
        verified_name: workspace.business_name || "Artipilot Demo",
        phone_number_id: "demo_phone_number_id",
        waba_id: "demo_waba_id",
        meta_business_id: "demo_meta_business_id",
        last_connected_at: nowIso,
      });

    if (connectionError) {
      console.error("Demo connection insert error:", connectionError);

      return NextResponse.json(
        { ok: false, error: "Could not create demo WhatsApp connection" },
        { status: 500 }
      );
    }

    const { error: workspaceUpdateError } = await supabaseAdmin
      .from("artipilot_workspaces")
      .update({
        whatsapp_connected: true,
      })
      .eq("id", workspace.id)
      .eq("owner_user_id", user.id);

    if (workspaceUpdateError) {
      console.error("Demo workspace update error:", workspaceUpdateError);
    }

    const { error: oldMessagesError } = await supabaseAdmin
      .from("artipilot_messages")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("owner_user_id", user.id)
      .eq("contact_phone", demoPhone);

    if (oldMessagesError) {
      console.error("Demo old messages delete error:", oldMessagesError);
    }

    const { error: oldContactError } = await supabaseAdmin
      .from("artipilot_contacts")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("owner_user_id", user.id)
      .eq("phone", demoPhone);

    if (oldContactError) {
      console.error("Demo old contact delete error:", oldContactError);
    }

    const { error: contactError } = await supabaseAdmin
      .from("artipilot_contacts")
      .insert({
        workspace_id: workspace.id,
        owner_user_id: user.id,
        phone: demoPhone,
        name: demoName,
        last_message:
          "Perfect, thank you. Can I book one scooter for tomorrow at 10:00?",
        last_message_at: nowIso,
        unread_count: 1,
        ai_enabled: true,
      });

    if (contactError) {
      console.error("Demo contact insert error:", contactError);

      return NextResponse.json(
        { ok: false, error: "Could not create demo contact" },
        { status: 500 }
      );
    }

    const demoMessages = [
      {
        workspace_id: workspace.id,
        owner_user_id: user.id,
        contact_phone: demoPhone,
        whatsapp_message_id: "demo_msg_1",
        role: "customer",
        direction: "inbound",
        message_type: "text",
        content: "Hi, do you have scooters available tomorrow?",
        created_at: new Date(now.getTime() - 1000 * 60 * 4).toISOString(),
      },
      {
        workspace_id: workspace.id,
        owner_user_id: user.id,
        contact_phone: demoPhone,
        whatsapp_message_id: "demo_msg_2",
        role: "assistant",
        direction: "outbound",
        message_type: "text",
        content:
          "Yes, we have scooters available 😊 What time would you like to pick it up?",
        created_at: new Date(now.getTime() - 1000 * 60 * 3).toISOString(),
      },
      {
        workspace_id: workspace.id,
        owner_user_id: user.id,
        contact_phone: demoPhone,
        whatsapp_message_id: "demo_msg_3",
        role: "customer",
        direction: "inbound",
        message_type: "text",
        content: "Tomorrow at 10:00. I have a car license for more than 3 years.",
        created_at: new Date(now.getTime() - 1000 * 60 * 2).toISOString(),
      },
      {
        workspace_id: workspace.id,
        owner_user_id: user.id,
        contact_phone: demoPhone,
        whatsapp_message_id: "demo_msg_4",
        role: "assistant",
        direction: "outbound",
        message_type: "text",
        content:
          "Perfect. Please send your full name, rental duration, and how many scooters you need.",
        created_at: new Date(now.getTime() - 1000 * 60).toISOString(),
      },
      {
        workspace_id: workspace.id,
        owner_user_id: user.id,
        contact_phone: demoPhone,
        whatsapp_message_id: "demo_msg_5",
        role: "customer",
        direction: "inbound",
        message_type: "text",
        content:
          "Perfect, thank you. Can I book one scooter for tomorrow at 10:00?",
        created_at: nowIso,
      },
    ];

    const { error: messagesError } = await supabaseAdmin
      .from("artipilot_messages")
      .insert(demoMessages);

    if (messagesError) {
      console.error("Demo messages insert error:", messagesError);

      return NextResponse.json(
        { ok: false, error: "Could not create demo messages" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Demo inbox created",
    });
  } catch (error) {
    console.error("Demo inbox API error:", error);

    const message = error instanceof Error ? error.message : "Demo API failed";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}