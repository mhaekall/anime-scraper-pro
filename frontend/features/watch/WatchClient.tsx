// features/watch/WatchClient.tsx — Watch page client layout

"use client";

import { useState, memo } from "react";
import { useRouter } from "next/navigation";
import { VideoPlayer } from "@/ui/player/VideoPlayer";
import { EpisodeList } from "@/features/detail/EpisodeList";
import { AutoNextOverlay } from "@/ui/player/AutoNextOverlay";
import { EpisodeNavigationBar } from "@/ui/player/EpisodeNavigationBar";
import { IconBack, IconInfo } from "@/ui/icons";
import { CommentSection } from "./CommentSection";
import { ForYouTab } from "./ForYouTab";

interface Props {
  id: string;
  episode: string;
  title: string;
  poster: string;
  sources: any[];
  allEpisodes: any[];
}

export default function WatchClient({ id, episode, title, poster, sources, allEpisodes }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("untukmu");
  const [showAutoNext, setShowAutoNext] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const epNum = parseFloat(episode) || 1;

  // Assuming episodes are sorted descending, so next episode is at index - 1
  const sortedEpisodes = [...allEpisodes].sort((a, b) => a.number - b.number);
  const currentIndex = sortedEpisodes.findIndex(e => e.number === epNum);
  const nextEp = currentIndex < sortedEpisodes.length - 1 ? sortedEpisodes[currentIndex + 1] : null;
  const prevEp = currentIndex > 0 ? sortedEpisodes[currentIndex - 1] : null;

  const handleSeek = (time: number) => {
    const v = document.querySelector("video");
    if (v) v.currentTime = time;
  };

  return (
    <div className="w-full min-h-[100dvh] bg-black flex flex-col md:flex-row anim-fade">
      {/* Player Area */}
      <div className="relative w-full md:flex-1 shrink-0 bg-black flex flex-col border-b border-[#2c2c2e] md:border-b-0 md:h-screen md:sticky md:top-0">
        <button onClick={() => router.back()} className="absolute top-4 left-4 z-50 w-9 h-9 bg-black/40 rounded-full flex items-center justify-center text-white border border-white/10 active:scale-90"><IconBack /></button>
        <div className="relative w-full flex-1 flex flex-col justify-center min-h-0">
          <VideoPlayer title={`${title} - Eps ${episode}`} poster={poster} sources={sources} animeSlug={id} episodeNum={epNum} onRequireAutoNext={() => setShowAutoNext(true)} onTimeUpdate={setCurrentTime} />
          
          {showAutoNext && nextEp && (
            <AutoNextOverlay 
              nextEpisodeUrl={`/watch/${id}/${nextEp.number}`} 
              nextEpisodeTitle={`Episode ${nextEp.number} - ${nextEp.title || ''}`}
              nextThumbnail={nextEp.thumbnailUrl || poster}
              isLastEpisode={false}
              onCancel={() => setShowAutoNext(false)}
            />
          )}
          {showAutoNext && !nextEp && (
            <AutoNextOverlay 
              isLastEpisode={true} 
              onCancel={() => setShowAutoNext(false)} 
              nextEpisodeUrl="" 
              nextEpisodeTitle="" 
            />
          )}
        </div>
        <EpisodeNavigationBar 
          prevUrl={prevEp ? `/watch/${id}/${prevEp.number}` : undefined} 
          nextUrl={nextEp ? `/watch/${id}/${nextEp.number}` : undefined} 
          currentTitle={`${title} - Eps ${episode}`} 
        />
      </div>

      {/* Sidebar */}
      <div className="w-full md:w-[380px] lg:w-[400px] shrink-0 bg-[#0a0c10] flex flex-col md:border-l border-[#2c2c2e] min-h-[50vh]">
        <div className="flex border-b border-[#2c2c2e] px-4 pt-4 bg-[#0a0c10]/90 backdrop-blur-xl sticky top-0 z-20">
          {(["untukmu", "episodes", "komentar"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`pb-2.5 mr-5 text-[14px] font-bold border-b-2 capitalize ${tab === t ? "text-white border-white" : "text-[#8e8e93] border-transparent"}`}>
              {t === "episodes" ? "Episode" : t === "untukmu" ? "Untukmu" : "Komentar"}
            </button>
          ))}
        </div>
        <div className="p-0 pb-20">
          {tab === "untukmu" && (
            <ForYouTab anilistId={id} allEpisodes={allEpisodes} />
          )}
          {tab === "episodes" && (
            <div className="anim-fade p-4">
              <div className="mb-4">
                <h2 className="text-white font-black text-lg line-clamp-2">{title}</h2>
                <p className="text-[#8e8e93] text-[12px] mt-0.5 font-medium tracking-wide">EPISODE {episode.toUpperCase()}</p>
              </div>
              <EpisodeList episodes={allEpisodes} animeId={id} cover={poster} />
            </div>
          )}
          {tab === "komentar" && (
            <CommentSection anilistId={id} episode={episode} currentTime={currentTime} onSeek={handleSeek} />
          )}
        </div>
      </div>
    </div>
  );
}
