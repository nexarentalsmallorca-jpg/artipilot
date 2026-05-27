import { NEXA_AI_BRAIN } from "@/lib/ai/nexaBrain";

const SECTIONS = NEXA_AI_BRAIN.split("\n\n").filter(Boolean);

function getSectionParts(section: string) {
  const [possibleTitle, ...rest] = section.split(":\n");

  if (
    possibleTitle.length < 90 &&
    !possibleTitle.includes("\n") &&
    rest.length
  ) {
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
    <div className="h-full overflow-y-auto bg-[#f0f2f5] px-4 py-6 text-[#111b21] md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-3xl border border-[#d1d7db] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#008069]">
            Private Nero system
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#111b21]">
            Nero AI Training
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667781]">
            This page shows the current hard-coded NEXA AI Brain used by Nero
            for WhatsApp replies. For now, edit the rules in VS Code inside{" "}
            <span className="rounded-md bg-[#f0f2f5] px-1.5 py-0.5 font-bold text-[#111b21]">
              lib/ai/nexaBrain.ts
            </span>
            . Later we can make this editable directly from the dashboard.
          </p>
        </div>

        <div className="mb-5 rounded-3xl border border-[#c8f7c0] bg-[#e7fce3] p-5 shadow-sm">
          <h2 className="text-sm font-black text-[#008069]">
            Current assistant identity
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#111b21]">
            Nero is your private WhatsApp AI assistant for NEXA Rentals. Nero
            must introduce itself at the beginning of a new customer chat, be
            transparent that it is not human, check 125cc license eligibility
            before pushing scooter bookings, avoid fake availability, and guide
            eligible customers to the correct localized NEXA Rentals booking
            link.
          </p>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[#d1d7db] bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-[#667781]">
              Main rule
            </p>
            <p className="mt-1 text-sm font-bold text-[#111b21]">
              No fake availability or promises
            </p>
          </div>

          <div className="rounded-2xl border border-[#d1d7db] bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-[#667781]">
              Booking flow
            </p>
            <p className="mt-1 text-sm font-bold text-[#111b21]">
              Check license first, then send link
            </p>
          </div>

          <div className="rounded-2xl border border-[#d1d7db] bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-[#667781]">
              Support
            </p>
            <p className="mt-1 text-sm font-bold text-[#111b21]">
              AI 24/7, human hours controlled
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          {SECTIONS.map((section, index) => {
            const { title, body } = getSectionParts(section);

            return (
              <article
                key={`${title}-${index}`}
                className="rounded-3xl border border-[#d1d7db] bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d9fdd3] text-xs font-black text-[#008069]">
                    {index + 1}
                  </span>

                  <h2 className="text-base font-black text-[#111b21]">
                    {title}
                  </h2>
                </div>

                <pre className="whitespace-pre-wrap break-words rounded-2xl bg-[#f0f2f5] p-4 font-sans text-sm leading-7 text-[#111b21]">
                  {body}
                </pre>
              </article>
            );
          })}
        </div>

        <div className="mt-6 rounded-3xl border border-yellow-300 bg-yellow-50 p-5 shadow-sm">
          <h2 className="text-sm font-black text-yellow-800">Important</h2>

          <p className="mt-2 text-sm leading-6 text-yellow-900">
            After changing Nero training in VS Code, redeploy on Vercel. Nero
            will only use the new rules after the deployment is live.
          </p>
        </div>
      </div>
    </div>
  );
}