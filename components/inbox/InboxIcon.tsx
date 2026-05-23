import type { ReactNode } from "react";
import type { IconName } from "@/lib/inbox/types";

export default function InboxIcon({ name, className = "" }: { name: IconName; className?: string }) {
  const common = `h-5 w-5 shrink-0 ${className}`;

  const icons: Record<IconName, ReactNode> = {
    menu: <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
    newChat: (
      <>
        <path d="M5 19l1.2-4A7.5 7.5 0 1 1 9 17.8L5 19Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M15.5 5.5h3v3M18.3 5.7 14 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
    filter: <path d="M4 7h16M8 12h8M10.5 17h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
        <path d="m16 16 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    camera: (
      <>
        <path d="M8 7 9.4 5h5.2L16 7h2.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-7A2.5 2.5 0 0 1 5.5 7H8Z" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="13" r="3.4" stroke="currentColor" strokeWidth="2" />
      </>
    ),
    dots: (
      <>
        <circle cx="12" cy="5" r="2" fill="currentColor" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
        <circle cx="12" cy="19" r="2" fill="currentColor" />
      </>
    ),
    video: (
      <>
        <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h7A2.5 2.5 0 0 1 16 8.5v7a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 4 15.5v-7Z" stroke="currentColor" strokeWidth="2" />
        <path d="m16 10 4-2.5v9L16 14" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </>
    ),
    phone: (
      <path d="M7.5 4.5 10 8.8 8.4 10.3c.9 1.9 2.4 3.4 4.3 4.3L14.2 13l4.3 2.5-.6 3.4c-.1.7-.8 1.2-1.5 1.1C9.6 19.2 4.8 14.4 4 7.6c-.1-.7.4-1.4 1.1-1.5l2.4-.6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    ),
    emoji: (
      <>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M9 10h.01M15 10h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M8.5 14.5c.8 1.1 2 1.6 3.5 1.6s2.7-.5 3.5-1.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    attach: (
      <path d="M8.5 12.5 14 7a3 3 0 0 1 4.2 4.2l-7.9 7.9a4.5 4.5 0 0 1-6.4-6.4l8.3-8.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ),
    mic: (
      <>
        <rect x="9" y="4" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    send: (
      <>
        <path d="M4 11.5 20 4l-6.5 16-2.4-6.3L4 11.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M20 4 11.1 13.7" stroke="currentColor" strokeWidth="2" />
      </>
    ),
    back: <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />,
    home: (
      <>
        <path d="M4 10.5 12 4l8 6.5V20H4v-9.5Z" stroke="currentColor" strokeWidth="1.9" />
        <path d="M9.5 20v-5h5v5" stroke="currentColor" strokeWidth="1.9" />
      </>
    ),
    whatsapp: (
      <>
        <path d="M5.2 19 6.2 15.5A7.5 7.5 0 1 1 9 18.1L5.2 19Z" stroke="currentColor" strokeWidth="1.9" />
        <path d="M10 8.7c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.3l.7 1.5c.1.3 0 .5-.2.8l-.4.4c.5.9 1.3 1.7 2.4 2.3l.5-.5c.2-.2.5-.2.7-.1l1.5.7c.3.2.4.4.4.7v.4c0 .6-.4 1-1 1-3.6.3-7.5-3.6-7.2-7.1Z" fill="currentColor" />
      </>
    ),
    training: <path d="M9.5 4.5A3 3 0 0 0 6.5 7.4 3.6 3.6 0 0 0 4.5 13.5 3.2 3.2 0 0 0 9 18h.5V4.5ZM14.5 4.5a3 3 0 0 1 3 2.9 3.6 3.6 0 0 1 2 6.1A3.2 3.2 0 0 1 15 18h-.5V4.5Z" stroke="currentColor" strokeWidth="1.9" />,
    inbox: <path d="M4 13 6.2 6.8A1.5 1.5 0 0 1 7.6 5.8h8.8a1.5 1.5 0 0 1 1.4 1L20 13v5.2A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.2V13Z" stroke="currentColor" strokeWidth="1.9" />,
    settings: (
      <>
        <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.9" />
        <path d="M19 12a7.5 7.5 0 0 0-.1-1l2-1.4-2-3.5-2.3 1a7.8 7.8 0 0 0-1.8-1L14.5 3h-5l-.3 3.1a7.8 7.8 0 0 0-1.8 1l-2.3-1-2 3.5 2 1.4a7.5 7.5 0 0 0 0 2l-2 1.4 2 3.5 2.3-1a7.8 7.8 0 0 0 1.8 1l.3 3.1h5l.3-3.1a7.8 7.8 0 0 0 1.8-1l2.3 1 2-3.5-2-1.4c.1-.3.1-.7.1-1Z" stroke="currentColor" strokeWidth="1.9" />
      </>
    ),
    billing: (
      <>
        <rect x="4" y="6" width="16" height="12" rx="1.8" stroke="currentColor" strokeWidth="1.9" />
        <path d="M4 10h16M7 14h4" stroke="currentColor" strokeWidth="1.9" />
      </>
    ),
    moon: <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a8 8 0 1 0 9.5 9.5Z" stroke="currentColor" strokeWidth="1.9" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.9" />
        <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </>
    ),
    star: <path d="m12 3 2.7 5.5 6 .9-4.4 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6-4.4-4.2 6-.9L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />,
    archive: (
      <>
        <path d="M5 8h14v12H5V8ZM4 4h16v4H4V4Z" stroke="currentColor" strokeWidth="1.9" />
        <path d="M9 12h6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </>
    ),
    pin: <path d="M14.5 4.5 19.5 9.5l-3 3 .5 4-2 2-4.2-4.2L6 19l-1-1 4.7-4.8L5.5 9l2-2 4 .5 3-3Z" stroke="currentColor" strokeWidth="1.9" />,
    bell: (
      <>
        <path d="M6.5 17h11l-1.2-1.8V11a4.3 4.3 0 0 0-8.6 0v4.2L6.5 17Z" stroke="currentColor" strokeWidth="1.9" />
        <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </>
    ),
    trash: <path d="M5 7h14M9 7V5h6v2M8 10v9h8v-9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />,
    block: (
      <>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.9" />
        <path d="m7 17 10-10" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </>
    ),
    translate: <path d="M4 5h9M8.5 3v2M10.8 5c-.7 3.9-2.7 6.9-6.3 9M6.3 8.8c1.2 2.2 2.9 3.9 5 5.1M14 19l4-9 4 9M15.4 16h5.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />,
    spark: <path d="M12 3 13.8 8.2 19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" stroke="currentColor" strokeWidth="1.9" />,
    close: <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
    check: <path d="m5.5 12.5 4 4L18.5 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
    logout: (
      <>
        <path d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M14 8l4 4-4 4M18 12H9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  };

  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}
