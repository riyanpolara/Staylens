"use client";

import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { uploadAvatar } from "@/app/profile/edit/actions";

/** Avatar with an upload control. Shows an instant local preview, then swaps in
 *  the Supabase Storage URL once the upload succeeds. */
export function ProfileAvatar({ initialUrl, name }: { initialUrl: string; name: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    // instant preview via a data URL (safe with next/image)
    const reader = new FileReader();
    reader.onload = () => setUrl(reader.result as string);
    reader.readAsDataURL(file);

    setBusy(true);
    setNote(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadAvatar(fd);
    setBusy(false);
    if (res.ok) setUrl(res.url);
    else setNote(res.error);
  }

  return (
    <div className="relative group shrink-0">
      <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white shadow-md">
        <Image
          src={url}
          alt={name}
          width={160}
          height={160}
          unoptimized
          className="w-full h-full object-cover"
        />
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Upload profile photo"
        className="absolute bottom-1 right-1 bg-primary text-white p-2 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center disabled:opacity-70"
      >
        {busy ? (
          <Loader2 aria-hidden className="size-4 animate-spin" />
        ) : (
          <Camera aria-hidden className="size-4" />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={onFile}
      />
      {note && (
        <p className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-44 text-center text-xs text-on-surface-variant">
          {note}
        </p>
      )}
    </div>
  );
}
