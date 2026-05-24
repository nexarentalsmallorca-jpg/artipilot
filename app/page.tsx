const inboxCards = [
  {
    title: "Doctor appointment",
    type: "Reminder",
    text: "Create reminder for Monday at 10:30.",
  },
  {
    title: "Product screenshot",
    type: "Save",
    text: "Save to buy later and track the price.",
  },
  {
    title: "Business idea",
    type: "Idea",
    text: "Turn this into a simple 3-step action plan.",
  },
];

const useCases = [
  "Screenshots",
  "Notes",
  "Links",
  "Ideas",
  "Reminders",
  "Appointments",
  "Products",
  "Travel places",
  "Voice notes",
  "Goals",
  "Recipes",
  "Tasks",
];

const appSections = [
  {
    title: "Today",
    text: "See what matters now: reminders, tasks, goals, and AI suggested actions.",
  },
  {
    title: "Action Inbox",
    text: "Drop anything in. Artipilot turns it into a clear action card.",
  },
  {
    title: "Goals",
    text: "Turn big goals into daily steps and track progress without confusion.",
  },
  {
    title: "Saved",
    text: "Keep products, places, links, ideas, recipes, and important notes organized.",
  },
  {
    title: "AI Chat",
    text: "Ask your assistant to organize, summarize, plan, or remind you.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#05070f] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-240px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[130px]" />
        <div className="absolute right-[-180px] top-[20%] h-[460px] w-[460px] rounded-full bg-violet-500/20 blur-[130px]" />
        <div className="absolute bottom-[-240px] left-[-160px] h-[460px] w-[460px] rounded-full bg-blue-500/20 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%)]" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-lg font-black shadow-lg shadow-cyan-500/10 backdrop-blur">
            A
          </div>

          <div>
            <p className="text-sm font-black tracking-tight">Artipilot</p>
            <p className="text-xs text-slate-500">AI Daily Life Assistant</p>
          </div>
        </div>

        <a
          href="/app"
          className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
        >
          Open app
        </a>
      </header>

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-84px)] w-full max-w-7xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">
            New direction
          </div>

          <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-6xl md:text-7xl">
            Capture anything.
            <span className="block bg-gradient-to-r from-cyan-200 via-sky-300 to-violet-300 bg-clip-text text-transparent">
              Organize everything.
            </span>
            Act on what matters.
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
            Artipilot turns screenshots, notes, ideas, reminders, goals, links,
            products, places, and tasks into clear action cards.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="/app"
              className="rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-400 px-6 py-4 text-center text-sm font-black text-slate-950 shadow-2xl shadow-cyan-500/20 transition hover:scale-[1.01] active:scale-[0.99]"
            >
              Start organizing my life
            </a>

            <a
              href="#how-it-works"
              className="rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-4 text-center text-sm font-bold text-white backdrop-blur transition hover:bg-white/10"
            >
              See how it works
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {useCases.slice(0, 8).map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-slate-300"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[430px]">
          <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-cyan-400/20 to-violet-500/20 blur-3xl" />

          <div className="relative rounded-[3rem] border border-white/10 bg-white/[0.07] p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="rounded-[2.4rem] border border-white/10 bg-[#07101d] p-4">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
                    Today
                  </p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight">
                    Action Inbox
                  </h2>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-slate-200">
                  3 new
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/25 p-3">
                <p className="mb-3 text-sm font-semibold text-slate-300">
                  Add anything
                </p>

                <div className="rounded-2xl border border-dashed border-cyan-300/30 bg-cyan-300/5 px-4 py-5 text-center">
                  <p className="text-sm font-bold text-cyan-100">
                    Screenshot, note, link, voice note, goal...
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Artipilot turns it into an action.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {inboxCards.map((card) => (
                  <div
                    key={card.title}
                    className="rounded-3xl border border-white/10 bg-white/[0.06] p-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h3 className="font-bold tracking-tight">{card.title}</h3>
                      <span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                        {card.type}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-slate-400">
                      {card.text}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-5 gap-2 rounded-3xl border border-white/10 bg-black/30 p-2 text-center text-[10px] font-bold text-slate-400">
                <div className="rounded-2xl bg-white/10 px-2 py-3 text-white">
                  Today
                </div>
                <div className="px-2 py-3">Inbox</div>
                <div className="px-2 py-3">Goals</div>
                <div className="px-2 py-3">Saved</div>
                <div className="px-2 py-3">Chat</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="relative z-10 mx-auto w-full max-w-7xl px-5 py-20 sm:px-8"
      >
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
            How it works
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            From phone chaos to clear action.
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-400">
            People save everything but forget what matters. Artipilot organizes
            the mess and tells the user the next best step.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Capture",
              text: "Add a screenshot, note, link, voice note, idea, reminder, product, or goal.",
            },
            {
              step: "02",
              title: "Understand",
              text: "AI detects what it is, what matters, the category, date, and possible next action.",
            },
            {
              step: "03",
              title: "Act",
              text: "Artipilot creates an action card, reminder, saved item, plan, or task.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/10 text-sm font-black text-cyan-200">
                {item.step}
              </div>
              <h3 className="text-xl font-black">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">
              MVP sections
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              Built like a simple mobile app.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-400">
              The first version stays focused: Today, Inbox, Goals, Saved, and
              AI Chat.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {appSections.map((section) => (
              <div
                key={section.title}
                className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur"
              >
                <h3 className="text-lg font-black">{section.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {section.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-4xl rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-white/[0.1] to-white/[0.04] p-8 text-center shadow-2xl shadow-black/30 backdrop-blur sm:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
            Artipilot
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            Your daily life, finally organized.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-400">
            Turn screenshots, notes, ideas, reminders, and goals into action.
          </p>

          <a
            href="/app"
            className="mt-8 inline-flex rounded-2xl bg-white px-6 py-4 text-sm font-black text-slate-950 transition hover:scale-[1.01] active:scale-[0.99]"
          >
            Open Artipilot
          </a>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-5 py-8 text-center text-xs text-slate-600 sm:px-8">
        © {new Date().getFullYear()} Artipilot. AI Daily Life Assistant.
      </footer>
    </main>
  );
}