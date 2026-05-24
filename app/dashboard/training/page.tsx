import { NEXA_AI_BRAIN } from "@/lib/ai/nexaBrain";

const SECTIONS = NEXA_AI_BRAIN.split("\n\n").filter(Boolean);

export default function TrainingPage() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold text-white">Training</h1>
      <p className="mt-2 text-sm text-[#8696A0]">
        NEXA AI Brain is currently hard-coded in VS Code. Later we can add
        editable database training.
      </p>
      <div className="mt-6 space-y-4">
        {SECTIONS.map((section) => {
          const [title, ...rest] = section.split(":\n");
          const body = rest.length ? rest.join(":\n") : section;
          const heading =
            title.length < 80 && !title.includes("\n") ? title : "Rules";
          return (
            <div
              key={section.slice(0, 40)}
              className="rounded-xl border border-white/10 bg-[#111B21] p-4"
            >
              <h2 className="text-sm font-semibold text-[#00A884]">{heading}</h2>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-[#E9EDEF]">
                {rest.length ? body : section}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}
