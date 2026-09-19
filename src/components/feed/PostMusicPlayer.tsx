import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Play, Pause, Disc } from 'lucide-react';
import { logger } from '@/src/utils/logger';

export interface PostMusicData {
  title?: string;
  artist?: string;
  url?: string;
  audioUrl?: string;
  previewUrl?: string;
  cover?: string;
  albumArtUrl?: string;
  track?: {
    title?: string;
    artist?: string;
    url?: string;
    previewUrl?: string;
    cover?: string;
  };
}

export const getPostMusicData = (post: any): PostMusicData | null => {
  if (!post) return null;
  const raw = post.music || post.selectedMusic || post.song || post.audio || (post as any).track;
  if (!raw && !post.audioUrl && !post.musicUrl) return null;

  if (typeof raw === 'string') {
    return {
      url: raw,
      title: post.musicTitle || post.songTitle || 'Original Audio',
      artist: post.musicArtist || post.artist || 'Aeirmist Sound'
    };
  }

  const trackObj = raw?.track || raw;
  const url = raw?.url || raw?.audioUrl || raw?.previewUrl || trackObj?.url || trackObj?.audioUrl || trackObj?.previewUrl || post.audioUrl || post.musicUrl;
  const title = trackObj?.title || trackObj?.name || raw?.title || raw?.name || post.musicTitle || 'Original Audio';
  const artist = trackObj?.artist || trackObj?.singer || raw?.artist || raw?.singer || post.musicArtist || 'Aeirmist Sound';
  const cover = trackObj?.cover || trackObj?.albumArtUrl || trackObj?.image || raw?.cover || raw?.albumArtUrl || post.musicCover;

  if (!url && !title) return null;

  return { url, title, artist, cover };
};

interface PostMusicPlayerProps {
  music: PostMusicData;
  variant?: 'full' | 'pill' | 'floating-mute';
  className?: string;
}

export const PostMusicPlayer: React.FC<PostMusicPlayerProps> = ({ 
  music, 
  variant = 'full', 
  className = '' 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('aeirmist_global_audio_muted') !== 'false';
    } catch (e) {
      return true; // Default muted like Instagram
    }
  });

  const audioUrl = music.url || music.audioUrl || music.previewUrl || music.track?.url || music.track?.previewUrl;
  const title = music.title || music.track?.title || 'Original Audio';
  const artist = music.artist || music.track?.artist || 'Aeirmist Sound';
  const cover = music.cover || music.albumArtUrl || music.track?.cover;

  // Sync with global mute toggle event
  useEffect(() => {
    const handleMuteChange = (e: any) => {
      const muted = Boolean(e.detail);
      setIsMuted(muted);
      if (audioRef.current) {
        audioRef.current.muted = muted;
      }
    };
    window.addEventListener('aeirmist-global-mute-toggle', handleMuteChange);
    return () => window.removeEventListener('aeirmist-global-mute-toggle', handleMuteChange);
  }, []);

  // Global user interaction listener to unblock browser autoplay restrictions
  useEffect(() => {
    const unlockAudio = () => {
      if (audioRef.current && audioUrl) {
        if (audioRef.current.paused && isPlaying) {
          audioRef.current.play().catch(() => {});
        }
      }
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, [audioUrl, isPlaying]);

  // IntersectionObserver for AutoPlay on Scroll
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    audio.muted = isMuted;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            audio.play()
              .then(() => setIsPlaying(true))
              .catch((err) => {
                logger.info('Scroll autoplay attempt:', err);
                // Fallback: play muted if unmuted playback blocked by browser
                if (!audio.muted) {
                  audio.muted = true;
                  audio.play().then(() => setIsPlaying(true)).catch(() => {});
                }
              });
          } else {
            audio.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.25 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      audio.pause();
    };
  }, [audioUrl, isMuted]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.muted = nextMuted;
      if (nextMuted === false && audioRef.current.paused) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
    try {
      localStorage.setItem('aeirmist_global_audio_muted', nextMuted ? 'true' : 'false');
    } catch (err) {}
    window.dispatchEvent(new CustomEvent('aeirmist-global-mute-toggle', { detail: nextMuted }));
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  if (!audioUrl && !title) return null;

  // Render Variant 1: Floating Instagram Mute Overlay Button
  if (variant === 'floating-mute') {
    return (
      <div ref={containerRef} className={`inline-block ${className}`}>
        {audioUrl && (
          <audio 
            ref={audioRef} 
            src={audioUrl} 
            loop 
            preload="metadata"
          />
        )}
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? "Unmute audio" : "Mute audio"}
          title={isMuted ? "Unmute Audio" : "Mute Audio"}
          className={`w-8 h-8 rounded-full flex items-center justify-center border backdrop-blur-md shadow-lg transition-all active:scale-95 cursor-pointer z-30 ${
            isMuted 
              ? 'bg-black/70 border-white/20 text-white/70 hover:text-white hover:bg-black/90' 
              : 'bg-black/80 border-aeirmist-cyan/50 text-aeirmist-cyan shadow-[0_0_12px_rgba(0,242,255,0.35)] hover:bg-black'
          }`}
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} className="animate-pulse" />}
        </button>
      </div>
    );
  }

  // Render Variant 2: Compact Top Pill (Track title + vinyl disc + equalizer)
  if (variant === 'pill') {
    return (
      <div 
        ref={containerRef}
        onClick={togglePlay}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#080a10]/85 border border-white/10 backdrop-blur-md select-none cursor-pointer group transition-all hover:border-aeirmist-cyan/40 w-fit ${className}`}
      >
        {audioUrl && (
          <audio 
            ref={audioRef} 
            src={audioUrl} 
            loop 
            preload="metadata"
          />
        )}
        
        {/* Equalizer Waveforms */}
        <div className="flex items-center gap-0.5 h-3 shrink-0">
          <span className={`w-0.5 rounded-full bg-aeirmist-cyan ${isPlaying ? 'h-2.5 animate-[pulse_0.7s_infinite_100ms]' : 'h-1.5 opacity-50'}`} />
          <span className={`w-0.5 rounded-full bg-aeirmist-cyan ${isPlaying ? 'h-3.5 animate-[pulse_0.7s_infinite_300ms]' : 'h-2.5 opacity-50'}`} />
          <span className={`w-0.5 rounded-full bg-aeirmist-cyan ${isPlaying ? 'h-2 animate-[pulse_0.7s_infinite_200ms]' : 'h-1 opacity-50'}`} />
        </div>

        {/* Vinyl Disc Icon */}
        <div className="relative w-4 h-4 rounded-full bg-black shrink-0 overflow-hidden border border-white/10 flex items-center justify-center">
          {cover ? (
            <img src={cover} alt="" className={`w-full h-full object-cover ${isPlaying ? 'animate-spin-slow' : ''}`} />
          ) : (
            <Disc size={11} className={`text-aeirmist-cyan ${isPlaying ? 'animate-spin-slow' : 'opacity-60'}`} />
          )}
        </div>

        {/* Song info */}
        <span className="text-[10px] sm:text-xs font-bold text-white/90 truncate max-w-[180px] sm:max-w-[260px] group-hover:text-aeirmist-cyan transition-colors">
          {title} <span className="text-white/40 font-mono text-[9px] font-normal">• {artist}</span>
        </span>
      </div>
    );
  }

  // Render Variant 3 (Default): Full Banner
  return (
    <div 
      ref={containerRef}
      className={`flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl bg-[#080a10]/85 border border-white/10 backdrop-blur-xl select-none transition-all ${className}`}
    >
      {audioUrl && (
        <audio 
          ref={audioRef} 
          src={audioUrl} 
          loop 
          preload="metadata"
        />
      )}

      {/* Left: Disc Artwork & Equalizer + Track Info */}
      <div 
        onClick={togglePlay}
        className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer group"
      >
        <div className="relative w-8 h-8 rounded-xl overflow-hidden bg-black/60 border border-white/10 shrink-0 flex items-center justify-center">
          {cover ? (
            <img src={cover} alt="" className={`w-full h-full object-cover ${isPlaying ? 'animate-spin-slow' : ''}`} />
          ) : (
            <Disc className={`text-aeirmist-cyan ${isPlaying ? 'animate-spin-slow' : 'opacity-60'}`} size={16} />
          )}
          
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            {isPlaying ? <Pause size={12} className="text-white" /> : <Play size={12} className="text-white" />}
          </div>
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {isPlaying && (
              <div className="flex items-center gap-0.5 h-2.5 shrink-0">
                <span className="w-0.5 h-2 bg-aeirmist-cyan animate-[pulse_0.8s_infinite_100ms] rounded-full" />
                <span className="w-0.5 h-3 bg-aeirmist-cyan animate-[pulse_0.8s_infinite_300ms] rounded-full" />
                <span className="w-0.5 h-1.5 bg-aeirmist-cyan animate-[pulse_0.8s_infinite_200ms] rounded-full" />
              </div>
            )}
            <span className="text-xs font-bold text-white truncate group-hover:text-aeirmist-cyan transition-colors">
              {title}
            </span>
          </div>
          <span className="text-[10px] font-mono text-white/45 truncate">
            {artist}
          </span>
        </div>
      </div>

      {/* Right: Mute/Unmute Pill Button */}
      <button
        type="button"
        onClick={toggleMute}
        aria-label={isMuted ? "Unmute audio" : "Mute audio"}
        title={isMuted ? "Unmute Audio" : "Mute Audio"}
        className={`h-8 px-2.5 rounded-xl border flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider transition-all cursor-pointer shrink-0 ${
          isMuted 
            ? 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
            : 'bg-aeirmist-cyan/20 border-aeirmist-cyan/40 text-aeirmist-cyan shadow-[0_0_12px_rgba(0,242,255,0.25)]'
        }`}
      >
        {isMuted ? (
          <>
            <VolumeX size={14} className="text-white/60" />
            <span className="uppercase text-[9px] hidden sm:inline">Muted</span>
          </>
        ) : (
          <>
            <Volume2 size={14} className="text-aeirmist-cyan animate-pulse" />
            <span className="uppercase text-[9px] hidden sm:inline">Sound On</span>
          </>
        )}
      </button>
    </div>
  );
};
