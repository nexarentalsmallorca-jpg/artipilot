import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DB } from "@/lib/db/tables";

export async function loadActiveTrainingContext(workspaceId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from(DB.trainingKnowledge)
    .select("title, content, category")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(30);

  if (error || !data?.length) return "";

  return data
    .map(
      (item) =>
        `[${item.category || "General"}] ${item.title}\n${item.content}`
    )
    .join("\n\n");
}
