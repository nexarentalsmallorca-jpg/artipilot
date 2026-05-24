import { NEXA_AI_BRAIN } from "@/lib/ai/nexaBrain";

const SECTIONS = NEXA_AI_BRAIN.split("\n\n").filter(Boolean);

function getSectionParts(section: string) {
  const [possibleTitle, ...rest] = section.split(":\n");

  if (possibleTitle.length < 80 && !possibleTitle.includes("\n") && rest.length) {
    return {
      title: possibleTitle,
      body: rest.join(":\n"),
    };
  }

  return {
    title: "Rules",
    body: section,
  };
}

export default function TrainingPage() {
  return (
    <div className="h-full overflow-y-auto bg-[#0b141a] px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00a884]">
            Private system
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Nero AI Training
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#8696a0]">
            This shows the current hard-coded NEXA AI Brain used by Nero for
            WhatsApp replies. For now, edit this in VS Code inside{" "}
            <span className="font-bold text-slate-200">
              lib/ai/nexaBrain.ts
            </span>
            . Later we can make this editable from Supabase.
          </p>
        </div>

        <div className="mb-5 rounded-3xl border border-[#00a884]/25 bg-[#00a884]/10 p-5">
          <h2 className="text-sm font-black text-[#00a884]">
            Current assistant identity
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-200">
            Nero is your private WhatsApp assistant for NEXA Rentals. It should
            reply naturally, check license requirements before scooter bookings,
            avoid fake availability, and guide customers to www.nexarentals.es
            for live booking/availability.
          </p>
        </div>

        <div className="grid gap-4">
          {SECTIONS.map((section, index) => {
            const { title, body } = getSectionParts(section);

            return (
              <article
                key={`${title}-${index}`}
                className="rounded-3xl border border-white/10 bg-[#111b21] p-5"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00a884]/15 text-xs font-black text-[#00a884]">
                    {index + 1}
                  </span>

                  <h2 className="text-base font-black text-white">{title}</h2>
                </div>

                <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-[#d7dee2]">
                  {body}
                </pre>
              </article>
            );
          })}
        </div>

        <div className="mt-6 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5">
          <h2 className="text-sm font-black text-yellow-200">
            Important
          </h2>

          <p className="mt-2 text-sm leading-6 text-yellow-100/80">
            After changing Nero training in VS Code, redeploy on Vercel. The AI
            will only use the new rules after the deployment is live.
          </p>
        </div>
      </div>
    </div>
  );
}