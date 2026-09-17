import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, FileText, Film, BookOpen, Video as VideoIcon, ListTodo, 
  Smile, Image as ImageIcon, MapPin, Users, Music as MusicIcon, 
  Link as LinkIcon, Sparkles, Trash2, Globe, Eye, MessageSquare, 
  Settings, Monitor, Smartphone, LayoutGrid, Check, Play, Pause, 
  AlertCircle, ChevronLeft, ChevronRight, X, Clock, HelpCircle, ArrowLeft, 
  ShieldCheck, Sliders, Plus, Edit3, Lock, MessageCircle
} from 'lucide-react';
import { useAeirmist } from '../../context/AeirmistContext';
import { getAvatarUrl } from '../../lib/avatar';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { MediaEditor } from './MediaEditor';
import { PollComposer } from './PollComposer';
import { LocationSearch } from './LocationSearch';
import { TagPeople } from './TagPeople';
import { MusicSelector } from './MusicSelector';
import { GifPicker } from './GifPicker';
import { logger } from '@/src/utils/logger';

// Rich post gradients
const THEME_GRADIENTS = [
  { id: 'neon_cyber', label: 'Ocean Dark', css: 'linear-gradient(135deg, #050b14 0%, #0c203b 100%)', border: 'border-cyan-500/30' },
  { id: 'neon_sunset', label: 'Neon Sunset', css: 'linear-gradient(135deg, #2b0c1e 0%, #06080d 100%)', border: 'border-pink-500/30' },
  { id: 'holographic', label: 'Hologram', css: 'linear-gradient(135deg, #10051e 0%, #081a2e 100%)', border: 'border-purple-500/30' },
  { id: 'obsidian', label: 'Obsidian Void', css: 'linear-gradient(135deg, #020305 0%, #0b0c10 100%)', border: 'border-white/5' },
  { id: 'retro_grid', label: 'Synth Grid', css: 'linear-gradient(135deg, #11001c 0%, #001220 100%)', border: 'border-fuchsia-500/20' },
  { id: 'plain', label: 'Plain (No Canvas)', css: 'transparent', border: 'border-white/10' }
];

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

interface PostStudioProps {
  onClose: () => void;
  initialType?: string | null;
}

export const PostStudio: React.FC<PostStudioProps> = React.memo(({ onClose, initialType = null }) => {
  const { user, profile, uploadMedia, addToast } = useAeirmist();

  // Active composer state
  const [selectedType, setSelectedType] = useState<string>(initialType || 'photo');
  const [caption, setCaption] = useState('');
  
  // Media Picker states
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [selectedMediaIdx, setSelectedMediaIdx] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());

  // Cleanup Object URLs on unmount
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    };
  }, []);

  const createStableUrl = (file: File) => {
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.add(url);
    return url;
  };

  // Sub-feature states
  const [poll, setPoll] = useState<any>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [taggedPeople, setTaggedPeople] = useState<any[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<any>(null);
  const [attachedGif, setAttachedGif] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkPreview, setLinkPreview] = useState<any>(null);

  // Voice recording mock states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const recordIntervalRef = useRef<any>(null);

  // Settings
  const [selectedGradient, setSelectedGradient] = useState(THEME_GRADIENTS[0]);
  const [audience, setAudience] = useState<'public' | 'followers' | 'close_friends' | 'only_me'>(() => {
    return (localStorage.getItem('aeirmist_post_audience') as any) || 'public';
  });
  const [allowComments, setAllowComments] = useState(true);
  const [hideLikes, setHideLikes] = useState(false);
  const [sensitiveWarning, setSensitiveWarning] = useState(false);

  // UI tool drawer state: 'none' | 'filters' | 'music' | 'tag' | 'location' | 'theme' | 'audience' | 'settings' | 'link' | 'poll'
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  // Draft save & restore
  const handleSaveDraft = () => {
    const draftPayload = {
      selectedType,
      caption,
      mediaFiles,
      poll,
      location,
      taggedPeople,
      selectedMusic,
      attachedGif,
      linkUrl,
      linkPreview,
      audience,
      allowComments,
      hideLikes,
      sensitiveWarning
    };
    localStorage.setItem('aeirmist_studio_draft', JSON.stringify(draftPayload));
    addToast({
      title: 'Draft Saved',
      message: 'Your post draft has been saved.',
      type: 'info'
    });
  };

  const handleRestoreDraft = () => {
    const raw = localStorage.getItem('aeirmist_studio_draft');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      setSelectedType(parsed.selectedType || 'photo');
      setCaption(parsed.caption || '');
      
      const restoredMedia = (parsed.mediaFiles || []).map((item: any) => {
        return {
          ...item,
          url: item.dataUrl || item.url
        };
      });
      
      setMediaFiles(restoredMedia);
      setPoll(parsed.poll || null);
      setLocation(parsed.location || null);
      setTaggedPeople(parsed.taggedPeople || []);
      setSelectedMusic(parsed.selectedMusic || null);
      setAttachedGif(parsed.attachedGif || null);
      setLinkUrl(parsed.linkUrl || '');
      setLinkPreview(parsed.linkPreview || null);
      setAudience(parsed.audience || 'public');
      setAllowComments(parsed.allowComments !== false);
      setHideLikes(!!parsed.hideLikes);
      setSensitiveWarning(!!parsed.sensitiveWarning);
      addToast({
        title: 'Draft Restored',
        message: 'Successfully reloaded your offline draft workspace.',
        type: 'info'
      });
    } catch (e: any) { 
      logger.error("Failed to restore draft", e); 
      addToast({ title: "Draft Error", message: "Failed to restore offline draft", type: "warning" }); 
    }
  };

  // Add media files
  const handleAddMediaFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    const maxFiles = 10;
    if (mediaFiles.length + files.length > maxFiles) {
      addToast({
        title: 'Selection Overflow',
        message: 'Max 10 items allowed per post.',
        type: 'warning'
      });
      return;
    }

    const currentLength = mediaFiles.length;
    const formatted = files.map(file => {
      const url = createStableUrl(file);
      return {
        file,
        url,
        previewUrl: url,
        type: file.type,
        name: file.name,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        warmth: 0,
        blur: 0,
        vignette: 0,
        rotate: 0,
        flipX: false,
        flipY: false,
        cropRatio: 'original',
        fitMode: 'contain',
        muted: false,
        volume: 80,
        speed: 1,
        loop: true,
        coverTime: 0
      };
    });

    setMediaFiles(prev => [...prev, ...formatted]);
    setSelectedMediaIdx(currentLength);

    const processSequentially = async () => {
      for (let i = 0; i < files.length; i++) {
        try {
          const base64Url = await readFileAsDataURL(files[i]);
          setMediaFiles(prev => {
            const updated = [...prev];
            const targetIndex = currentLength + i;
            if (updated[targetIndex]) {
              updated[targetIndex] = {
                ...updated[targetIndex],
                dataUrl: base64Url
              };
            }
            return updated;
          });
        } catch (err: any) { 
          logger.error("Error reading file to data URL", err); 
        }
      }
    };
    
    processSequentially();
  };

  const handleMediaChange = React.useCallback((updated: any) => {
    setMediaFiles(prev => {
      const copy = [...prev];
      if (copy[selectedMediaIdx]) {
        copy[selectedMediaIdx] = updated;
      }
      return copy;
    });
  }, [selectedMediaIdx]);

  // Main Publish Action
  const handlePublish = async () => {
    if (isUploading) return;
    
    if (selectedType === 'text' && !caption) {
      addToast({ title: 'Empty Content', message: 'Please write some text for your post.', type: 'warning' });
      return;
    }
    if (selectedType === 'photo' && mediaFiles.length === 0) {
      addToast({ title: 'No Media Selected', message: 'Please add at least one photo or video.', type: 'warning' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setUploadStatus('Preparing assets...');

    try {
      let uploadedUrls: string[] = [];
      if (mediaFiles.length > 0) {
        setUploadStatus(`Uploading ${mediaFiles.length} media file(s)...`);
        const progressArray = new Array(mediaFiles.length).fill(0);
        const uploadPromises = mediaFiles.map((item, idx) => {
          if (item.file) {
            return uploadMedia(item.file, 'posts', (progress) => {
              progressArray[idx] = progress;
              const averageProgress = progressArray.reduce((sum, val) => sum + val, 0) / mediaFiles.length;
              setUploadProgress(Math.min(90, Math.floor(10 + (averageProgress * 0.8))));
            });
          } else if (item.dataUrl || item.url) {
            return Promise.resolve(item.dataUrl || item.url);
          }
          return Promise.resolve('');
        });

        uploadedUrls = (await Promise.all(uploadPromises)).filter(Boolean);
      }

      setUploadStatus('Publishing post...');
      setUploadProgress(92);

      const payload: any = {
        content: caption,
        mediaUrls: uploadedUrls,
        type: selectedType,
        authorId: profile?.id || 'unknown',
        authorUid: user?.uid || 'unknown',
        author: {
          displayName: profile?.displayName || 'User',
          username: profile?.username || 'user',
          photoURL: getAvatarUrl(profile?.photoURL),
          isVerified: profile?.isVerified || false
        },
        likesCount: 0,
        commentsCount: 0,
        likedBy: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        audience,
        allowComments,
        hideLikes,
        sensitiveWarning,
      };

      if (poll) payload.poll = poll;
      if (location) payload.location = location;
      if (selectedMusic) payload.music = selectedMusic;
      if (attachedGif) payload.attachedGif = attachedGif;
      if (linkPreview) payload.linkPreview = linkPreview;
      if (recordedAudio) payload.voiceUrl = recordedAudio;
      if (selectedType === 'text') {
        payload.gradientId = selectedGradient.id;
      }

      await addDoc(collection(db, 'posts'), payload);

      setUploadProgress(100);
      setUploadStatus('Published successfully!');
      
      addToast({
        title: 'Post Live',
        message: 'Your post was published to Aeirmist.',
        type: 'success'
      });

      localStorage.removeItem('aeirmist_studio_draft');

      setTimeout(() => {
        onClose();
      }, 500);

    } catch (e: any) {
      logger.error('Publishing failed', e);
      addToast({
        title: 'Could Not Publish',
        message: 'An error occurred while publishing. Please try again.',
        type: 'warning'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const currentMedia = mediaFiles[selectedMediaIdx];

  return (
    <div className="flex flex-col h-full max-h-[96vh] sm:max-h-[92vh] text-white overflow-hidden font-sans bg-[#05070d]">
      
      {/* 1. TOP APP BAR */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-white/10 shrink-0 bg-[#070a12]/95 backdrop-blur-xl z-20">
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center hover:bg-white/10 rounded-full transition-all cursor-pointer text-white/80 hover:text-white active:scale-95"
            aria-label="Close studio"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">Create Post</h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {localStorage.getItem('aeirmist_studio_draft') && (
            <button
              onClick={handleRestoreDraft}
              className="px-2.5 py-1 bg-white/5 border border-white/10 hover:bg-white/10 text-[11px] font-bold rounded-xl transition-all cursor-pointer text-white/70 hover:text-white"
            >
              Restore
            </button>
          )}
          <button
            onClick={handleSaveDraft}
            className="px-2.5 py-1 bg-white/5 border border-white/10 hover:bg-white/10 text-[11px] font-bold rounded-xl transition-all cursor-pointer hidden sm:block text-white/70 hover:text-white"
          >
            Save Draft
          </button>
          <button
            disabled={isUploading}
            onClick={handlePublish}
            className="px-4 sm:px-5 py-1.5 sm:py-2 bg-aeirmist-cyan text-black hover:brightness-110 active:scale-95 text-xs font-black uppercase rounded-full transition-all shadow-[0_0_20px_rgba(0,242,255,0.3)] disabled:opacity-40 flex items-center gap-1.5 justify-center cursor-pointer"
          >
            {isUploading ? (
              <Clock size={13} className="animate-spin" />
            ) : (
              <Sparkles size={13} />
            )}
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* 2. POST FORMAT PILL BAR */}
      <div className="px-3 sm:px-4 py-2 border-b border-white/5 bg-[#030408] shrink-0 overflow-x-auto no-scrollbar flex items-center gap-1.5">
        {[
          { id: 'photo', label: 'Media', icon: Camera },
          { id: 'text', label: 'Text Card', icon: FileText },
          { id: 'poll', label: 'Poll', icon: ListTodo },
          { id: 'gif', label: 'GIF', icon: Sparkles },
          { id: 'link', label: 'Link', icon: LinkIcon }
        ].map(mode => (
          <button
            key={mode.id}
            type="button"
            onClick={() => {
              setSelectedType(mode.id);
              setActiveTool(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap border ${
              selectedType === mode.id 
                ? 'bg-aeirmist-cyan text-black border-aeirmist-cyan shadow-md shadow-aeirmist-cyan/20' 
                : 'bg-white/[0.03] text-white/60 border-white/5 hover:text-white hover:bg-white/10'
            }`}
          >
            <mode.icon size={13} />
            <span>{mode.label}</span>
          </button>
        ))}
      </div>

      {/* 3. MAIN WORKSPACE CONTAINER */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto bg-[#020509]">
        
        {/* LEFT / TOP: INTERACTIVE PREVIEW STAGE */}
        <div className="w-full md:w-[55%] lg:w-[60%] flex flex-col bg-[#010307] border-b md:border-b-0 md:border-r border-white/10 p-3 sm:p-5 shrink-0 md:shrink">
          
          {/* STAGE CONTAINER */}
          <div className="w-full aspect-[4/3] sm:aspect-square md:aspect-auto md:h-full max-h-[380px] md:max-h-[520px] rounded-2xl overflow-hidden bg-black/60 border border-white/10 relative flex items-center justify-center select-none shadow-2xl">
            
            {/* 1. PHOTO & VIDEO MODE */}
            {selectedType === 'photo' && (
              mediaFiles.length > 0 ? (
                <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
                  {currentMedia?.type?.startsWith('video/') ? (
                    <video
                      src={currentMedia.url}
                      className={`max-h-full w-full object-contain ${currentMedia.fitMode === 'cover' ? 'object-cover' : 'object-contain'}`}
                      style={{
                        filter: `brightness(${currentMedia.brightness ?? 100}%) contrast(${currentMedia.contrast ?? 100}%) saturate(${currentMedia.saturation ?? 100}%) blur(${currentMedia.blur ?? 0}px) hue-rotate(${currentMedia.warmth ?? 0}deg)`,
                        transform: `rotate(${currentMedia.rotate ?? 0}deg) scaleX(${currentMedia.flipX ? -1 : 1}) scaleY(${currentMedia.flipY ? -1 : 1})`,
                      }}
                      controls
                      autoPlay
                      loop
                      muted={currentMedia.muted}
                    />
                  ) : (
                    <img
                      src={currentMedia.url}
                      alt="Preview"
                      className={`max-h-full w-full object-contain ${currentMedia.fitMode === 'cover' ? 'object-cover' : 'object-contain'}`}
                      style={{
                        filter: `brightness(${currentMedia.brightness ?? 100}%) contrast(${currentMedia.contrast ?? 100}%) saturate(${currentMedia.saturation ?? 100}%) blur(${currentMedia.blur ?? 0}px) hue-rotate(${currentMedia.warmth ?? 0}deg)`,
                        transform: `rotate(${currentMedia.rotate ?? 0}deg) scaleX(${currentMedia.flipX ? -1 : 1}) scaleY(${currentMedia.flipY ? -1 : 1})`,
                      }}
                    />
                  )}

                  {/* Overlay Quick Actions: Edit Filters button */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                    <button
                      type="button"
                      onClick={() => setActiveTool(activeTool === 'filters' ? null : 'filters')}
                      className="px-2.5 py-1.5 bg-black/70 backdrop-blur-md border border-white/20 hover:bg-black/90 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
                    >
                      <Sliders size={13} className="text-aeirmist-cyan" />
                      <span>{activeTool === 'filters' ? 'Close Editor' : 'Edit & Crop'}</span>
                    </button>
                  </div>

                  {/* Sound Tag Indicator on Media */}
                  {selectedMusic && (
                    <div className="absolute bottom-2.5 left-2.5 bg-black/80 backdrop-blur-md border border-white/20 rounded-xl px-2.5 py-1 flex items-center gap-1.5 text-[10px] text-white shadow-lg">
                      <MusicIcon size={12} className="text-aeirmist-cyan animate-pulse" />
                      <span className="font-bold truncate max-w-[140px]">{selectedMusic.track.title}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Empty Media Dropzone */
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-full flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <div className="w-14 h-14 rounded-2xl bg-aeirmist-cyan/10 border border-aeirmist-cyan/30 flex items-center justify-center text-aeirmist-cyan mb-3 shadow-lg">
                    <ImageIcon size={26} />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-white mb-1">Select Photos or Videos</h3>
                  <p className="text-[10px] text-white/40 mb-3 font-mono">PNG, JPG, MP4 up to 10 items</p>
                  <button
                    type="button"
                    className="px-4 py-2 bg-aeirmist-cyan text-black font-black text-xs uppercase tracking-wider rounded-full shadow-lg shadow-aeirmist-cyan/20 active:scale-95 transition-all"
                  >
                    Browse Device
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAddMediaFiles}
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                  />
                </div>
              )
            )}

            {/* 2. TEXT CARD MODE */}
            {selectedType === 'text' && (
              selectedGradient.id === 'plain' ? (
                <div className="w-full h-full p-5 sm:p-6 flex flex-col justify-between text-left bg-[#060a12]">
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={getAvatarUrl(profile?.photoURL)} 
                      className="w-8 h-8 rounded-full border border-white/20 object-cover" 
                      alt="" 
                    />
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1">
                        <span>{profile?.displayName || 'User'}</span>
                        {profile?.isVerified && <ShieldCheck size={12} className="text-aeirmist-cyan" />}
                      </div>
                      <div className="text-[9px] text-white/40 font-mono">Plain Text Feed Post</div>
                    </div>
                  </div>

                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Type your story, thoughts, or update here..."
                    maxLength={3000}
                    rows={6}
                    className="w-full bg-transparent text-sm text-white focus:outline-none resize-none leading-relaxed placeholder:text-white/30 my-auto py-2"
                  />

                  <div className="flex justify-between items-center text-[10px] text-white/40 font-mono pt-2 border-t border-white/10">
                    <span>Aeirmist Story</span>
                    <span>{caption.length} / 3000</span>
                  </div>
                </div>
              ) : (
                <div 
                  className="w-full h-full p-6 sm:p-8 flex flex-col justify-between text-center relative overflow-hidden transition-all duration-300"
                  style={{ background: selectedGradient.css }}
                >
                  <div className="flex items-center gap-2.5 text-left z-10">
                    <img src={getAvatarUrl(profile?.photoURL)} className="w-8 h-8 rounded-full border border-white/20 object-cover" alt="" />
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1">
                        <span>@{profile?.username || 'user'}</span>
                        {profile?.isVerified && <ShieldCheck size={12} className="text-aeirmist-cyan" />}
                      </div>
                      <div className="text-[9px] text-white/50 uppercase tracking-widest font-mono">Canvas Card</div>
                    </div>
                  </div>

                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Type your highlight quote or story here..."
                    maxLength={3000}
                    rows={4}
                    className="w-full bg-transparent text-center text-base sm:text-lg font-bold text-white leading-relaxed placeholder:text-white/30 focus:outline-none resize-none z-10 my-auto px-2"
                  />

                  <div className="flex justify-between items-center text-[10px] text-white/50 tracking-wider font-mono z-10 pt-2 border-t border-white/10">
                    <span>{selectedGradient.label}</span>
                    <span>{caption.length} / 3000</span>
                  </div>
                </div>
              )
            )}

            {/* 3. POLL MODE */}
            {selectedType === 'poll' && (
              <div className="w-full max-w-xs sm:max-w-sm bg-[#080d17] border border-white/10 p-5 rounded-2xl space-y-3 text-left shadow-2xl">
                <div className="flex items-center gap-2 text-aeirmist-cyan font-bold text-xs uppercase tracking-wider">
                  <ListTodo size={16} />
                  <span>Interactive Poll</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-white">{poll?.question || 'Your Poll Question Here'}</div>
                <div className="space-y-1.5">
                  {(poll?.options || ['Option 1', 'Option 2']).map((opt: string, i: number) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold flex justify-between items-center">
                      <span>{opt || `Option ${i + 1}`}</span>
                      <span className="text-white/40 font-mono text-[10px]">0%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. GIF MODE */}
            {selectedType === 'gif' && (
              attachedGif ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img src={attachedGif} className="max-h-full w-full object-contain" alt="GIF" />
                  <button 
                    onClick={() => setAttachedGif(null)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/80 text-white hover:bg-black transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="w-full max-w-sm p-4 text-center">
                  <GifPicker onSelect={(gif) => setAttachedGif(gif)} />
                </div>
              )
            )}

            {/* 5. LINK MODE */}
            {selectedType === 'link' && (
              <div className="w-full max-w-xs sm:max-w-sm bg-[#080d17] border border-white/10 rounded-2xl overflow-hidden shadow-2xl text-left">
                {linkPreview ? (
                  <div>
                    <img src={linkPreview.image} className="w-full h-32 object-cover" alt="" />
                    <div className="p-3 space-y-1 border-t border-white/10">
                      <div className="text-[11px] text-aeirmist-cyan font-bold truncate">{linkPreview.url}</div>
                      <div className="text-xs font-bold text-white">{linkPreview.title}</div>
                      <div className="text-[10px] text-white/50 leading-relaxed line-clamp-2">{linkPreview.description}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center space-y-2">
                    <LinkIcon size={30} className="mx-auto text-white/30" />
                    <h4 className="text-xs font-bold text-white">Attach Web Link</h4>
                    <p className="text-[10px] text-white/40">Use the link tool below to fetch title and preview card.</p>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* CAROUSEL THUMBNAIL STRIP */}
          {selectedType === 'photo' && mediaFiles.length > 0 && (
            <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar py-1 shrink-0">
              {mediaFiles.map((file, idx) => (
                <div 
                  key={idx}
                  onClick={() => setSelectedMediaIdx(idx)}
                  className={`relative w-12 h-12 rounded-xl overflow-hidden cursor-pointer border shrink-0 group transition-all ${
                    selectedMediaIdx === idx 
                      ? 'border-aeirmist-cyan ring-2 ring-aeirmist-cyan/30 scale-105 shadow-md' 
                      : 'border-white/15 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={file.url} className="w-full h-full object-cover" alt="" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const filtered = mediaFiles.filter((_, i) => i !== idx);
                      setMediaFiles(filtered);
                      setSelectedMediaIdx(0);
                    }}
                    className="absolute top-0 right-0 bg-red-500 p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-md"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}

              {mediaFiles.length < 10 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-12 h-12 rounded-xl border border-dashed border-white/20 hover:border-aeirmist-cyan flex flex-col items-center justify-center text-white/50 hover:text-white transition-colors shrink-0 bg-white/[0.02]"
                  title="Add more photos or videos"
                >
                  <Plus size={16} />
                  <span className="text-[8px] font-bold uppercase mt-0.5">Add</span>
                </button>
              )}
            </div>
          )}

        </div>

        {/* RIGHT / BOTTOM: CAPTION, DISCIPLINED TOOL ROW & DRAWERS */}
        <div className="w-full md:w-[45%] lg:w-[40%] flex flex-col p-3 sm:p-5 space-y-4 overflow-y-auto">
          
          {/* User Profile Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <img 
                src={getAvatarUrl(profile?.photoURL)} 
                className="w-8 h-8 rounded-full border border-white/20 object-cover" 
                alt="" 
              />
              <div>
                <span className="text-xs font-bold text-white block">{profile?.displayName || profile?.username || 'User'}</span>
                <span className="text-[10px] text-white/40 block font-mono">@{profile?.username || 'user'}</span>
              </div>
            </div>

            {/* Audience Pill */}
            <button
              type="button"
              onClick={() => setActiveTool(activeTool === 'audience' ? null : 'audience')}
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-2.5 py-1 text-[10px] font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Globe size={11} className="text-aeirmist-cyan" />
              <span className="capitalize">{audience.replace('_', ' ')}</span>
            </button>
          </div>

          {/* CAPTION TEXTAREA (Always available for photo, poll, gif, link) */}
          {selectedType !== 'text' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white/70">Caption</label>
                <span className="text-[10px] font-mono text-white/30">{caption.length} / 3000</span>
              </div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption, mention @friends, add #hashtags..."
                rows={3}
                maxLength={3000}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-aeirmist-cyan resize-none leading-relaxed transition-all"
              />
            </div>
          )}

          {/* DISCIPLINED HORIZONTAL TOOLBAR ROW */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
              Post Additions & Enhancements
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {/* Tool: Filters (if photo active) */}
              {selectedType === 'photo' && mediaFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTool(activeTool === 'filters' ? null : 'filters')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all border cursor-pointer ${
                    activeTool === 'filters'
                      ? 'bg-aeirmist-cyan text-black border-aeirmist-cyan shadow-md'
                      : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Sliders size={13} />
                  <span>Filters</span>
                </button>
              )}

              {/* Tool: Music */}
              <button
                type="button"
                onClick={() => setActiveTool(activeTool === 'music' ? null : 'music')}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all border cursor-pointer ${
                  selectedMusic 
                    ? 'bg-green-500/20 text-green-300 border-green-500/40 shadow-sm' 
                    : activeTool === 'music'
                    ? 'bg-aeirmist-cyan text-black border-aeirmist-cyan shadow-md'
                    : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                }`}
              >
                <MusicIcon size={13} className={selectedMusic ? 'text-green-400' : ''} />
                <span>{selectedMusic ? 'Music Added' : 'Add Music'}</span>
                {selectedMusic && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
              </button>

              {/* Tool: Tag People */}
              <button
                type="button"
                onClick={() => setActiveTool(activeTool === 'tag' ? null : 'tag')}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all border cursor-pointer ${
                  taggedPeople.length > 0
                    ? 'bg-aeirmist-cyan/20 text-aeirmist-cyan border-aeirmist-cyan/40 shadow-sm'
                    : activeTool === 'tag'
                    ? 'bg-aeirmist-cyan text-black border-aeirmist-cyan shadow-md'
                    : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                }`}
              >
                <Users size={13} />
                <span>Tag {taggedPeople.length > 0 ? `(${taggedPeople.length})` : ''}</span>
              </button>

              {/* Tool: Location */}
              <button
                type="button"
                onClick={() => setActiveTool(activeTool === 'location' ? null : 'location')}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all border cursor-pointer ${
                  location
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                    : activeTool === 'location'
                    ? 'bg-aeirmist-cyan text-black border-aeirmist-cyan shadow-md'
                    : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                }`}
              >
                <MapPin size={13} />
                <span className="truncate max-w-[100px]">{location ? location.split(',')[0] : 'Location'}</span>
              </button>

              {/* Tool: Canvas Theme (Only for Text mode) */}
              {selectedType === 'text' && (
                <button
                  type="button"
                  onClick={() => setActiveTool(activeTool === 'theme' ? null : 'theme')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all border cursor-pointer ${
                    activeTool === 'theme'
                      ? 'bg-aeirmist-cyan text-black border-aeirmist-cyan shadow-md'
                      : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Sparkles size={13} />
                  <span>Theme</span>
                </button>
              )}

              {/* Tool: Poll Setup */}
              {selectedType === 'poll' && (
                <button
                  type="button"
                  onClick={() => setActiveTool(activeTool === 'poll' ? null : 'poll')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all border cursor-pointer ${
                    activeTool === 'poll'
                      ? 'bg-aeirmist-cyan text-black border-aeirmist-cyan shadow-md'
                      : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <ListTodo size={13} />
                  <span>Edit Options</span>
                </button>
              )}

              {/* Tool: Link URL */}
              {selectedType === 'link' && (
                <button
                  type="button"
                  onClick={() => setActiveTool(activeTool === 'link' ? null : 'link')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all border cursor-pointer ${
                    activeTool === 'link'
                      ? 'bg-aeirmist-cyan text-black border-aeirmist-cyan shadow-md'
                      : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <LinkIcon size={13} />
                  <span>URL Meta</span>
                </button>
              )}

              {/* Tool: Settings / Privacy */}
              <button
                type="button"
                onClick={() => setActiveTool(activeTool === 'settings' ? null : 'settings')}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all border cursor-pointer ${
                  activeTool === 'settings'
                    ? 'bg-aeirmist-cyan text-black border-aeirmist-cyan shadow-md'
                    : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                }`}
              >
                <Settings size={13} />
                <span>Options</span>
              </button>
            </div>
          </div>

          {/* ACTIVE TOOL DRAWER / PANEL (Clean collapsible container) */}
          {activeTool && (
            <div className="bg-[#090d16] border border-white/15 rounded-2xl p-4 space-y-3 relative shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-black uppercase text-aeirmist-cyan tracking-wider">
                  {activeTool === 'filters' && 'Media Filters & Adjustments'}
                  {activeTool === 'music' && 'Music & Soundtrack'}
                  {activeTool === 'tag' && 'Tag People'}
                  {activeTool === 'location' && 'Add Location'}
                  {activeTool === 'theme' && 'Canvas Card Background'}
                  {activeTool === 'poll' && 'Configure Poll'}
                  {activeTool === 'link' && 'Web Link Card'}
                  {activeTool === 'audience' && 'Audience Privacy'}
                  {activeTool === 'settings' && 'Advanced Post Settings'}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTool(null)}
                  className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Drawer Content */}
              <div>
                {/* 1. Filters & Adjust Drawer */}
                {activeTool === 'filters' && currentMedia && (
                  <div className="py-1">
                    <MediaEditor
                      file={currentMedia}
                      onChange={handleMediaChange}
                    />
                  </div>
                )}

                {/* 2. Music Drawer */}
                {activeTool === 'music' && (
                  <MusicSelector
                    selectedTrack={selectedMusic}
                    onChange={setSelectedMusic}
                  />
                )}

                {/* 3. Tag People Drawer */}
                {activeTool === 'tag' && (
                  <TagPeople
                    taggedUsers={taggedPeople}
                    onChange={setTaggedPeople}
                  />
                )}

                {/* 4. Location Drawer */}
                {activeTool === 'location' && (
                  <LocationSearch
                    selectedLocation={location}
                    onSelect={setLocation}
                  />
                )}

                {/* 5. Canvas Theme Drawer */}
                {activeTool === 'theme' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {THEME_GRADIENTS.map(grad => (
                      <button
                        key={grad.id}
                        type="button"
                        onClick={() => setSelectedGradient(grad)}
                        className={`p-3 rounded-xl text-xs font-bold border text-left truncate transition-all cursor-pointer ${
                          selectedGradient.id === grad.id 
                            ? 'border-aeirmist-cyan shadow-md shadow-aeirmist-cyan/20 text-white' 
                            : 'border-white/10 text-white/60 hover:text-white'
                        }`}
                        style={{ background: grad.css }}
                      >
                        {grad.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* 6. Poll Options Drawer */}
                {activeTool === 'poll' && (
                  <PollComposer poll={poll} onChange={setPoll} />
                )}

                {/* 7. Link Drawer */}
                {activeTool === 'link' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/70 block">Target URL</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-aeirmist-cyan"
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          if (!linkUrl) return;
                          setLinkPreview({
                            url: linkUrl,
                            title: `${linkUrl.replace('https://', '').split('/')[0]} Hub`,
                            description: 'Explore verified shared channels and updates instantly on Aeirmist platform.',
                            image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80'
                          });
                        }}
                        className="px-4 bg-aeirmist-cyan text-black text-xs font-bold rounded-xl hover:brightness-110 transition-all"
                      >
                        Fetch
                      </button>
                    </div>
                  </div>
                )}

                {/* 8. Audience Drawer */}
                {activeTool === 'audience' && (
                  <div className="space-y-2 pt-1">
                    {[
                      { id: 'public', label: 'Public', desc: 'Anyone on Aeirmist can see this post' },
                      { id: 'followers', label: 'Followers Only', desc: 'Only your verified followers' },
                      { id: 'close_friends', label: 'Close Friends', desc: 'Only users in your close circle' },
                      { id: 'only_me', label: 'Private (Only Me)', desc: 'Visible only to you' }
                    ].map(aud => (
                      <div
                        key={aud.id}
                        onClick={() => setAudience(aud.id as any)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                          audience === aud.id
                            ? 'bg-aeirmist-cyan/10 border-aeirmist-cyan'
                            : 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-white">{aud.label}</div>
                          <div className="text-[10px] text-white/40">{aud.desc}</div>
                        </div>
                        {audience === aud.id && <Check size={14} className="text-aeirmist-cyan" />}
                      </div>
                    ))}
                  </div>
                )}

                {/* 9. Settings Drawer */}
                {activeTool === 'settings' && (
                  <div className="space-y-3 pt-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/80">Allow Comments</span>
                      <button 
                        type="button"
                        onClick={() => setAllowComments(!allowComments)} 
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${allowComments ? 'bg-aeirmist-cyan' : 'bg-white/10'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-black transition-transform ${allowComments ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/80">Hide Like Counts</span>
                      <button 
                        type="button"
                        onClick={() => setHideLikes(!hideLikes)} 
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${hideLikes ? 'bg-aeirmist-cyan' : 'bg-white/10'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-black transition-transform ${hideLikes ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/80">Sensitive Content Flag</span>
                      <button 
                        type="button"
                        onClick={() => setSensitiveWarning(!sensitiveWarning)} 
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${sensitiveWarning ? 'bg-red-500' : 'bg-white/10'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-black transition-transform ${sensitiveWarning ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* FAST PUBLISH OVERLAY */}
      {isUploading && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-[#06090f] border border-white/10 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-aeirmist-cyan/10 border border-aeirmist-cyan/30 flex items-center justify-center mx-auto text-aeirmist-cyan">
              <Clock size={24} className="animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Publishing Post</h3>
              <p className="text-xs text-aeirmist-cyan font-semibold">{uploadStatus || 'Processing media...'}</p>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-aeirmist-cyan h-full rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="text-xs font-mono text-white/40">{uploadProgress}%</div>
          </div>
        </div>
      )}
    </div>
  );
});
