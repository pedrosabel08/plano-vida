"use client";
import Image from "next/image";
import { useState } from "react";
import { BookOpen } from "lucide-react";
export function BookCover({
  url,
  title,
}: {
  url: string | null;
  title: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span className="book-cover">
      {url && failed !== url ? (
        <Image
          src={url}
          alt={"Capa de " + title}
          width={80}
          height={116}
          unoptimized
          referrerPolicy="no-referrer"
          onError={() => setFailed(url)}
        />
      ) : (
        <BookOpen size={30} aria-label="Livro sem capa" />
      )}
    </span>
  );
}
