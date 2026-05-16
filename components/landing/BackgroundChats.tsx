import { chatBackgroundMessages } from "@/lib/landingData";

const messageLoop = [
  ...chatBackgroundMessages,
  ...chatBackgroundMessages,
  ...chatBackgroundMessages,
];

function BackgroundBubble({
  type,
  text,
  index,
}: {
  type: string;
  text: string;
  index: number;
}) {
  const isAi = type === "ai";

  return (
    <div
      className={`w-[17rem] rounded-2xl border px-4 py-3 shadow-[0_16px_45px_rgba(0,0,0,0.24)] backdrop-blur-xl ${
        index % 2 === 0 ? "mr-auto" : "ml-auto"
      } ${
        isAi
          ? "border-[#36FF9F]/24 bg-[#09271D]/62 text-[#E9FFF3]"
          : "border-[#00D4FF]/24 bg-[#071F2F]/62 text-[#E7FAFF]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className={`text-[9px] font-black uppercase tracking-[0.22em] ${
            isAi ? "text-[#36FF9F]" : "text-[#00D4FF]"
          }`}
        >
          {isAi ? "AI Reply" : "Customer"}
        </p>

        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isAi ? "bg-[#36FF9F]" : "bg-[#00D4FF]"
          }`}
        />
      </div>

      <p className="mt-2 text-xs leading-5 opacity-90">{text}</p>
    </div>
  );
}

function MovingColumn({
  side,
  direction,
}: {
  side: "left" | "center" | "right";
  direction: "up" | "down";
}) {
  const position =
    side === "left"
      ? "left-[-9rem] rotate-[-7deg] md:left-[-7rem]"
      : side === "right"
      ? "right-[-9rem] rotate-[7deg] md:right-[-7rem]"
      : "left-1/2 hidden -translate-x-1/2 rotate-[0deg] xl:block";

  const opacity =
    side === "center"
      ? "opacity-20"
      : "opacity-[0.16] sm:opacity-[0.24] lg:opacity-[0.38]";

  const animation = direction === "up" ? "bg-chats-up" : "bg-chats-down";

  return (
    <div
      className={`absolute top-[-32%] h-[210%] w-[23rem] ${position} ${opacity}`}
    >
      <div className={`flex flex-col gap-5 ${animation}`}>
        {messageLoop.map((message, index) => (
          <BackgroundBubble
            key={`${side}-${index}`}
            type={message.type}
            text={message.text}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

export default function BackgroundChats() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#030509]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(0,212,255,0.18),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(54,255,159,0.14),transparent_34%),radial-gradient(circle_at_50%_76%,rgba(255,138,31,0.055),transparent_40%)]" />

      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:74px_74px] opacity-20 sm:opacity-25" />

      <div className="absolute left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[#00D4FF]/8 blur-[120px]" />
      <div className="absolute bottom-[-12rem] right-[-12rem] h-[36rem] w-[36rem] rounded-full bg-[#36FF9F]/8 blur-[130px]" />

      <MovingColumn side="left" direction="down" />
      <MovingColumn side="center" direction="up" />
      <MovingColumn side="right" direction="down" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(3,5,9,0.18),rgba(3,5,9,0.9)_76%)]" />
      <div className="absolute inset-0 bg-[#030509]/34 sm:bg-[#030509]/22" />
    </div>
  );
}