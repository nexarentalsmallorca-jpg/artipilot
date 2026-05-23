import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const hostname = host.split(":")[0].toLowerCase();

  const privateHost =
    process.env.PRIVATE_DASHBOARD_HOST || "private.artipilot.com";

  if (hostname === privateHost) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#071116] text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Artipilot Public</h1>
        <p className="mt-4 text-slate-400">Coming soon public site.</p>
        <p className="mt-6 text-xs text-slate-600">
          Host: {hostname}
        </p>
      </div>
    </main>
  );
}
