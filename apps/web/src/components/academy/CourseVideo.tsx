import { useRef, useState, useEffect } from "react";
import { COURSE_VIDEO, MARKET_ADAPTATION } from "@edgerelay/shared";
import { API_BASE } from "@/lib/constants";
export function CourseVideo({ chapter = 0 }: { chapter?: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (ref.current?.readyState) ref.current.currentTime = chapter;
  }, [chapter]);
  return (
    <figure className="my-6 rounded-xl border border-terminal-border p-4 space-y-3">
      <figcaption className="text-sm text-slate-300">
        <strong>Original video: {COURSE_VIDEO.title}</strong>
        <br />
        Video owner:{" "}
        <a
          className="text-neon-cyan underline"
          href={COURSE_VIDEO.channel}
          target="_blank"
          rel="noopener noreferrer"
        >
          Scarface Trades — YouTube channel
        </a>
      </figcaption>
      <video
        ref={ref}
        className="w-full rounded-lg bg-black"
        controls
        preload="metadata"
        playsInline
        onError={() => setError(true)}
        onLoadedMetadata={() => {
          if (ref.current) ref.current.currentTime = chapter;
        }}
        src={`${API_BASE}${COURSE_VIDEO.path}`}
      >
        <track
          kind="captions"
          src="/playbook/course-en.vtt"
          srcLang="en"
          label="English (automatically transcribed)"
        />
      </video>
      <button
        className="text-neon-cyan underline min-h-11"
        onClick={() => {
          if (ref.current) ref.current.currentTime = chapter;
        }}
      >
        Go to lesson chapter ({Math.floor(chapter / 60)}:
        {String(chapter % 60).padStart(2, "0")})
      </button>
      {error && (
        <p role="alert" className="text-neon-amber">
          The course video is temporarily unavailable. The written lesson
          remains available; visit the credited channel for the creator’s
          videos.
        </p>
      )}
      <p className="text-sm text-slate-300">{MARKET_ADAPTATION}</p>
      <p className="text-xs text-terminal-muted">
        Instructor examples provide context. The written Three Strategies
        playbook governs the precise practice rules used here. Captions are
        automatically transcribed and may contain errors. TradeMetrics Pro does
        not claim ownership of this video or endorsement by its creator.
      </p>
    </figure>
  );
}
