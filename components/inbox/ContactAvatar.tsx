import Image from "next/image";
import { displayName, getContactPhoto, getInitial } from "@/lib/inbox/helpers";
import type { Contact } from "@/lib/inbox/types";

type ContactAvatarProps = {
  contact: Contact | null;
  size?: number;
  showAiBadge?: boolean;
  userAvatarUrl?: string | null;
  userEmail?: string | null;
};

export default function ContactAvatar({
  contact,
  size = 48,
  showAiBadge = true,
  userAvatarUrl,
  userEmail,
}: ContactAvatarProps) {
  const photo = contact ? getContactPhoto(contact) : userAvatarUrl;
  const label = contact ? displayName(contact) : userEmail || "Account";

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full bg-[#DFE5E7] text-[#111B21] ring-1 ring-black/[0.04]"
      style={{ width: size, height: size }}
    >
      {photo ? (
        <Image src={photo} alt={label} width={size} height={size} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#D1F4E0] to-[#A8E6C3] text-[15px] font-semibold text-[#075E54]">
          {contact ? getInitial(contact) : label.charAt(0).toUpperCase()}
        </div>
      )}
      {showAiBadge && contact && contact.ai_enabled !== false ? (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#25D366]" />
      ) : null}
    </div>
  );
}
