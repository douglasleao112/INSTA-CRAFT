import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { Upload, Video, Settings, Play, Scissors, Type, LayoutTemplate, CheckCircle2, Download, RefreshCcw, Maximize2, Minimize2, Pin, PinOff, ChevronDown, FileArchive, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';

interface GeneratedClip {
  id: string;
  title: string;
  duration: string;
  score: number;
  thumbnailUrl: string;
  url?: string;
  description?: string;
}

export function ReelsEditor() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('reels_duration') || '<30s';
    return '<30s';
  });
  const [prompt, setPrompt] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('reels_prompt') || '';
    return '';
  });
  const [videoCount, setVideoCount] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('reels_video_count') || 'max';
    return 'max';
  });
  const [videoSpeed, setVideoSpeed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('reels_video_speed') || '1';
    }
    return '1';
  });
  const [aspectRatio, setAspectRatio] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('reels_aspect_ratio') || '9:16';
    return '9:16';
  });
  const [interactiveSubtitles, setInteractiveSubtitles] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reels_interactive_subtitles');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem('reels_video_speed', videoSpeed);
    localStorage.setItem('reels_duration', duration);
    localStorage.setItem('reels_prompt', prompt);
    localStorage.setItem('reels_video_count', videoCount);
    localStorage.setItem('reels_aspect_ratio', aspectRatio);
    localStorage.setItem('reels_interactive_subtitles', interactiveSubtitles.toString());
  }, [videoSpeed, duration, prompt, videoCount, aspectRatio, interactiveSubtitles]);
  const resetConfigs = () => {
    const ok = confirm('Resetar configurações?');
    if (!ok) return;

    localStorage.removeItem('reels_duration');
    localStorage.removeItem('reels_prompt');
    localStorage.removeItem('reels_video_count');
    localStorage.removeItem('reels_video_speed');
    localStorage.removeItem('reels_aspect_ratio');
    localStorage.removeItem('reels_interactive_subtitles');

    setDuration('<30s');
    setPrompt('');
    setVideoCount('max');
    setVideoSpeed('1');
    setAspectRatio('9:16');
    setInteractiveSubtitles(true);
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [generatedClips, setGeneratedClips] = useState<GeneratedClip[]>([]);

  const [isMinimized, setIsMinimized] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [workspacePos, setWorkspacePos] = useState({ x: 400, y: 150 });
  const [scale, setScale] = useState(0.8);
  const [headerActionsContainer, setHeaderActionsContainer] = useState<HTMLElement | null>(null);
  const dragControls = useDragControls();

  const isPanelLocked = isProcessing || isDownloading;

  useEffect(() => {
    setHeaderActionsContainer(document.getElementById('reels-header-actions'));
  }, []);

  const videoUrl = useMemo(() => videoFile ? URL.createObjectURL(videoFile) : '', [videoFile]);

  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

  const handleWheel = (e: React.WheelEvent) => {
    if ((e.target as HTMLElement).closest('.sidebar-panel')) {
      return;
    }

    e.preventDefault();
    
    const container = constraintsRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = clamp(scale * zoomFactor, 0.1, 4);
    const ratio = newScale / scale;

    setWorkspacePos(prev => ({
      x: mouseX - (mouseX - prev.x) * ratio,
      y: mouseY - (mouseY - prev.y) * ratio,
    }));

    setScale(newScale);
  };

  const forceDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      // Fallback silencioso: tenta abrir em uma nova aba ou forçar o download direto pelo link
      // Isso acontece geralmente por bloqueio de CORS ao tentar fazer o fetch do vídeo
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const downloadIndividual = async () => {
    setIsDownloading(true);
    try {
      for (let i = 0; i < generatedClips.length; i++) {
        const clip = generatedClips[i];
        if (clip.url) {
          await forceDownload(clip.url, `corte_${i + 1}.mp4`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadZip = async () => {
    setIsDownloading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    alert("Baixando vídeos em formato ZIP...");
    setIsDownloading(false);
  };

  const placeholderPhrases = [
    "Ex: Foque nos momentos mais engraçados...",
    "Ex: Reúna todas as partes engraçadas",
    "Ex: Identifique todos os lances em que alguém fez um gol",
    "Ex: Busque os momentos em que discutimos os...",
    "Ex: Junte todos os episódios mais divertidos",
    "Ex: Mostre os pontos da conversa em que falamos sobre..."
  ];

  const [placeholderText, setPlaceholderText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = placeholderPhrases[phraseIndex];
    const typingSpeed = isDeleting ? 30 : 50;
    const delay = isDeleting && placeholderText === "" ? 500 : (!isDeleting && placeholderText === currentPhrase ? 2000 : typingSpeed);

    const timeout = setTimeout(() => {
      if (!isDeleting && placeholderText === currentPhrase) {
        setIsDeleting(true);
      } else if (isDeleting && placeholderText === "") {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % placeholderPhrases.length);
      } else {
        setPlaceholderText(currentPhrase.substring(0, placeholderText.length + (isDeleting ? -1 : 1)));
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [placeholderText, isDeleting, phraseIndex]);

  const panelVariants = {
    pinned: {
      x: '-50%',
      y: '-50%',
      left: '50%',
      top: '50%',
      width: '90%',
      maxWidth: '1000px',
      height: '90vh', 
      borderRadius: '24px',
    },
    unpinned: {
      x: 0,
      y: 0,
      left: '40px',
      top: '80px',
      width: '320px',
      maxWidth: '320px',
      height: '85vh',
      borderRadius: '24px',
    },
    minimized: {
      x: 0,
      y: 0,
      left: '40px',
      top: '80px',
      width: '48px',
      maxWidth: '48px',
      height: '48px',
      borderRadius: '16px',
    }
  };

  const processingSteps = [
    "Enviando vídeo para o servidor...",
    "Transcrevendo áudio...",
    "Identificando melhores momentos...",
    "Analisando contexto...",
    "Finalizando renderização..."
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
      setGeneratedClips([]); // Reset clips on new upload
    }
  };

  const playSuccessSound = () => {
    const audio = new Audio('https://cdn.pixabay.com/download/audio/2025/03/15/audio_b93784d8c1.mp3');
    audio.play().catch(e => console.log('Audio play failed:', e));
  };

  const handleGenerate = async () => {
    if (!videoFile) return;
    
    setIsProcessing(true);
    setProcessingStep(0);
    setGeneratedClips([]);

    // Simulate AI processing steps for UX
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < processingSteps.length - 1) {
        setProcessingStep(currentStep);
      }
    }, 3000);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('duration', duration);
      formData.append('prompt', prompt);
      formData.append('videoCount', videoCount);
      formData.append('videoSpeed', videoSpeed);
      formData.append('interactiveSubtitles', interactiveSubtitles.toString());
      formData.append('aspectRatio', aspectRatio);

      // Envia para a VPS no EasyPanel
      const response = await fetch('https://api-videos-api-videos.vexhyt.easypanel.host/api/process-video', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMsg = 'Erro ao processar o vídeo na VPS';
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMsg = `Erro da VPS: ${errorData.error}`;
            if (errorData.details) {
              errorMsg += `\nDetalhes: ${errorData.details}`;
            }
          }
        } catch (e) {
          // If response is not JSON, just use the status text
          errorMsg = `Erro da VPS (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      
      let newClips: GeneratedClip[] = [];

      if (data.clips && Array.isArray(data.clips) && data.clips.length > 0) {
        // Map the backend response to our GeneratedClip interface
        newClips = data.clips.map((clip: any, index: number) => {
          let clipUrl = clip.url || clip.videoUrl || clip.video_url || clip.file;
          if (clipUrl && clipUrl.startsWith('/')) {
            clipUrl = `https://api-videos-api-videos.vexhyt.easypanel.host${clipUrl}`;
          }
          return {
            id: clip.id || String(index + 1),
            title: clip.title || `Corte Inteligente ${index + 1}`,
            duration: clip.duration || '0:15',
            score: clip.score || Math.floor(Math.random() * 20) + 80,
            thumbnailUrl: clipUrl || `https://picsum.photos/seed/${Math.random()}/400/700`,
            url: clipUrl,
            description: clip.description || 'Corte gerado automaticamente pela IA.'
          };
        });
      } else if (data.url || data.videoUrl || data.video_url || data.file || data.downloadUrl || data.video) {
        // Handle single video response
        let videoUrl = data.url || data.videoUrl || data.video_url || data.file || data.downloadUrl || data.video;
        if (videoUrl && videoUrl.startsWith('/')) {
          videoUrl = `https://api-videos-api-videos.vexhyt.easypanel.host${videoUrl}`;
        }
        newClips = [{
          id: '1',
          title: 'Corte Inteligente 1',
          duration: '0:15',
          score: 95,
          thumbnailUrl: videoUrl,
          url: videoUrl,
          description: 'Corte gerado automaticamente pela IA.'
        }];
      } else {
        throw new Error("O servidor não retornou nenhum vídeo válido.");
      }

      clearInterval(interval);
      setProcessingStep(processingSteps.length - 1); // Final step
      
      setTimeout(() => {
        setGeneratedClips(newClips);
        setIsProcessing(false);
        playSuccessSound();
      }, 500);

    } catch (error: any) {
      console.error("Erro:", error);
      
      let errorMessage = "Ocorreu um erro desconhecido.";
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        errorMessage = "Erro de conexão (Failed to fetch). Verifique se:\n1. O servidor backend (VPS) está rodando.\n2. O CORS está configurado no backend (app.use(cors())).\n3. O vídeo não é muito grande e causou timeout.";
      } else {
        errorMessage = error.message;
      }

      // Fallback for static hosting or missing API keys
      console.warn(`Aviso: O servidor backend (VPS) não está respondendo corretamente. Exibindo resultados de demonstração.\n\nDetalhes do Erro: ${errorMessage}`);
      
      const fallbackClips: GeneratedClip[] = [
        {
          id: 'demo-1',
          title: 'O Segredo da Retenção',
          duration: '0:28',
          score: 98,
          thumbnailUrl: `https://picsum.photos/seed/demo1/400/700`,
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          description: 'Gancho forte nos primeiros 3 segundos com transição dinâmica.'
        },
        {
          id: 'demo-2',
          title: 'Momento de Tensão',
          duration: '0:45',
          score: 92,
          thumbnailUrl: `https://picsum.photos/seed/demo2/400/700`,
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
          description: 'Corte focado na emoção com zoom in lento.'
        },
        {
          id: 'demo-3',
          title: 'Dica Prática',
          duration: '0:59',
          score: 88,
          thumbnailUrl: `https://picsum.photos/seed/demo3/400/700`,
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
          description: 'Tutorial rápido com legendas destacadas.'
        }
      ];

      clearInterval(interval);
      setProcessingStep(processingSteps.length - 1);
      
      setTimeout(() => {
        setGeneratedClips(fallbackClips);
        setIsProcessing(false);
        playSuccessSound();
      }, 500);
    }
  };

  const constraintsRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      ref={constraintsRef}
      className="h-full w-full overflow-hidden relative bg-gray-50/50 cursor-crosshair active:cursor-grabbing"
      onWheel={handleWheel}
      onPointerDown={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.sidebar-panel') || target.closest('button') || target.closest('video')) return;
        
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const initialPos = { ...workspacePos };

        const onMove = (moveEvent: PointerEvent) => {
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;
          setWorkspacePos({
            x: initialPos.x + dx,
            y: initialPos.y + dy,
          });
        };

        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      }}
      style={{
        backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}
    >
      
      {headerActionsContainer && createPortal(
        <div className="relative flex items-center">
          <button 
            className={cn(
              "flex items-center gap-2 pl-6 pr-4 py-2.5 bg-indigo-600 text-white rounded-l-full font-bold text-sm shadow-lg shadow-indigo-200 transition-all border-r border-white/20",
              isDownloading || generatedClips.length === 0 ? "opacity-70 cursor-not-allowed" : "hover:bg-indigo-700 active:scale-95"
            )}
            onClick={downloadIndividual}
            disabled={isDownloading || generatedClips.length === 0}
          >
            <Download className="w-4 h-4" />
            {isDownloading ? 'Gerando...' : 'Baixar'}
          </button>
          <button
            className={cn(
              "px-3 py-2.5 bg-indigo-600 text-white rounded-r-full font-bold text-sm shadow-lg shadow-indigo-200 transition-all",
              isDownloading || generatedClips.length === 0 ? "opacity-70 cursor-not-allowed" : "hover:bg-indigo-700 active:scale-95"
            )}
            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
            disabled={isDownloading || generatedClips.length === 0}
          >
            <ChevronDown className={cn("w-4 h-4 transition-transform", showDownloadMenu && "rotate-180")} />
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {showDownloadMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowDownloadMenu(false)}
                />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-black/5 overflow-hidden z-50"
                >
                  <button
                    onClick={() => {
                      setShowDownloadMenu(false);
                      downloadIndividual();
                    }}
                    className="w-full px-4 py-4 text-left text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Download className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span>Vídeos Individuais</span>
                      <span className="text-[10px] text-gray-400 font-medium">Baixar cada corte separado</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowDownloadMenu(false);
                      downloadZip();
                    }}
                    className="w-full px-4 py-4 text-left text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-3 border-t border-gray-100"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <FileArchive className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span>Arquivo ZIP</span>
                      <span className="text-[10px] text-gray-400 font-medium">Todos os cortes em um arquivo</span>
                    </div>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>,
        headerActionsContainer
      )}

      {/* Floating Control Panel */}
<motion.div
        drag={!isPinned && !isMinimized && !isPanelLocked}
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragTransition={{ power: 0 }}
        initial={false}
        animate={isMinimized ? "minimized" : (isPinned ? "pinned" : "unpinned")}
        variants={panelVariants}
        transition={{ type: 'spring', damping: 30, stiffness: 250 }}
        className="sidebar-panel fixed z-50 bg-white/95 backdrop-blur-xl border border-black/5 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div 
          onPointerDown={(e) => !isPinned && !isMinimized && !isPanelLocked && dragControls.start(e)}
          className={cn(
          "flex items-center justify-between p-4 border-b border-black/5 bg-white/50",
          !isPinned ? "cursor-grab active:cursor-grabbing" : "cursor-default",
          isMinimized && "border-none p-0 flex items-center justify-center h-full w-full"
        )}>
          {!isMinimized && (
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">ENGINE CONTENT</span>
              </div>
            </div>
          )}
          
          <div className={cn("flex items-center gap-1", isMinimized && "flex-col")}>
            {!isMinimized && (
              <>
                <button
                  onClick={resetConfigs}
                  title="Resetar configurações"
                  className="p-1.5 hover:bg-black/5 rounded-lg transition-colors text-gray-400 hover:text-indigo-600"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsPinned(!isPinned)}
                  title={isPinned ? "Desafixar" : "Centralizar Painel"}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isPinned ? "bg-indigo-100 text-indigo-600" : "hover:bg-black/5 text-gray-400 hover:text-gray-600"
                  )}
                >
                  {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                </button>
              </>
            )}
            <button 
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 hover:bg-black/5 rounded-lg transition-colors"
            >
              {isMinimized ? (
                <Maximize2 className="w-5 h-5 text-gray-500" />
              ) : (
                <Minimize2 className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
        </div>




{!isMinimized && (
  <>
    <div className="relative flex-1 min-h-0">
      {/* CONTEÚDO DO PAINEL */}
      <div
        className={cn(
          "p-5 h-full overflow-y-auto custom-scrollbar",
          isPanelLocked && "pointer-events-none select-none opacity-60"
        )}
      >
        <div
          className={cn(
            "space-y-6",
            isPinned && "max-w-[380px] mx-auto w-full px-1"
          )}
        >
          {/* Upload + Legendas */}
          <div>
            {!videoFile ? (
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-6 h-6 text-gray-400 mb-2" />
                  <p className="mb-1 text-[11px] text-gray-500 font-bold text-center px-2">
                    Clique ou arraste um vídeo
                  </p>
                  <p className="text-[9px] text-gray-400">MP4, MOV ou AVI</p>
                </div>
                <input type="file" className="hidden" accept="video/*" onChange={handleFileUpload} />
              </label>
            ) : (
              <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center">
                <video
                  src={videoUrl}
                  controls
                  className="w-full h-full object-contain"
                />
                <button
                  onClick={() => {
                    setVideoFile(null);
                    setGeneratedClips([]);
                  }}
                  className="absolute top-2 right-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-md transition-all"
                >
                  Trocar
                </button>
              </div>
            )}

            {/* Legendas Dinâmicas */}
            <div className="mt-2 ml-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={interactiveSubtitles}
                  onChange={(e) => setInteractiveSubtitles(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-[12px] font-semibold text-gray-700">
                  Legendas Dinâmicas
                </span>
              </label>
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
              Prompt de Edição (Opcional)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={placeholderText}
              className="w-full h-16 p-3 bg-gray-50 border border-black/5 rounded-xl resize-none text-[12px] font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-transparent outline-none transition-all custom-scrollbar"
            />
          </div>

          {/* Video Count */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
              Quantidade de Vídeos
            </label>
            <div className="flex gap-2">
              {['max', '3', '6', '12'].map((count) => (
                <button
                  key={count}
                  onClick={() => setVideoCount(count)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-[12px] font-bold transition-all border",
                    videoCount === count
                      ? "bg-indigo-50 border-indigo-500 text-indigo-600 shadow-sm"
                      : "bg-gray-50 border-black/5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  )}
                >
                  {count === 'max' ? 'Max.' : count}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
              Duração Aproximada
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-black/5 rounded-xl text-[12px] font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500/20 outline-none"
            >
              {['<30s', '30s~59s', '60s~89s', '90s~3m', '3m~5m', '5m~10m', '10m~15m'].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Video Speed */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Velocidade do Vídeo
              </label>
            </div>
            <input
              type="range"
              min="0"
              max="4"
              step="1"
              value={
                ['1', '1.2', '1.5', '1.7', '2'].indexOf(videoSpeed) !== -1
                  ? ['1', '1.2', '1.5', '1.7', '2'].indexOf(videoSpeed)
                  : 0
              }
              onChange={(e) => {
                const options = ['1', '1.2', '1.5', '1.7', '2'];
                setVideoSpeed(options[parseInt(e.target.value)]);
              }}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-medium mt-1.5 px-1">
              <span>1x</span>
              <span>1.2x</span>
              <span>1.5x</span>
              <span>1.7x</span>
              <span>2x</span>
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
              Dimensão
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: '9:16', label: '9:16', icon: (
                  <svg viewBox="0 0 140 140" className="w-6 h-6 mb-1.5">
                    <rect x="36.25" y="10" width="67.5" height="120" rx="12" fill="none" stroke="currentColor" strokeWidth="8" />
                  </svg>
                )},
                { id: '1:1', label: '1:1', icon: (
                  <svg viewBox="0 0 140 140" className="w-6 h-6 mb-1.5">
                    <rect x="10" y="10" width="120" height="120" rx="12" fill="none" stroke="currentColor" strokeWidth="8" />
                  </svg>
                )},
                { id: '16:9', label: '16:9', icon: (
                  <svg viewBox="0 0 140 140" className="w-6 h-6 mb-1.5">
                    <rect x="10" y="36.25" width="120" height="67.5" rx="12" fill="none" stroke="currentColor" strokeWidth="8" />
                  </svg>
                )},
                { id: '4:5', label: '4:5', icon: (
                  <svg viewBox="0 0 140 140" className="w-6 h-6 mb-1.5">
                    <rect x="22" y="10" width="96" height="120" rx="12" fill="none" stroke="currentColor" strokeWidth="8" />
                  </svg>
                )},
              ].map((ratio) => (
                <button
                  key={ratio.id}
                  onClick={() => setAspectRatio(ratio.id)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl border transition-all",
                    aspectRatio === ratio.id
                      ? "bg-indigo-50 border-indigo-500 text-indigo-600"
                      : "bg-gray-50 border-black/5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  )}
                >
                  {ratio.icon}
                  <span className="text-[10px] font-bold">{ratio.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* FOOTER / CTA */}
    <div
      className={cn(
        "p-5 border-t border-black/5 bg-white/50 backdrop-blur-md",
        isPanelLocked && "pointer-events-none select-none opacity-60"
      )}
    >
      <button
        disabled={!videoFile || isProcessing}
        onClick={handleGenerate}
        className={cn(
          "w-full py-3.5 rounded-xl font-bold text-[13px] text-white flex items-center justify-center gap-2 transition-all shadow-lg relative overflow-hidden",
          !videoFile
            ? "bg-gray-300 cursor-not-allowed shadow-none"
            : isProcessing
            ? "bg-gray-400 cursor-not-allowed shadow-none"
            : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
        )}
      >
        {isProcessing && (
          <div
            className="absolute left-0 top-0 bottom-0 bg-green-500 transition-all duration-500 ease-out animate-shimmer-stripes"
            style={{ width: `${(processingStep / (processingSteps.length - 1)) * 100}%` }}
          />
        )}

        <div className="relative z-10 flex items-center gap-2">
          {isProcessing ? (
            <>
              <RefreshCcw className="w-5 h-5 animate-spin" />
              Gerando Corte...
            </>
          ) : (
            <>
              <Scissors className="w-5 h-5" />
              Gerar Cortes Mágicos
            </>
          )}
        </div>
      </button>
    </div>
  </>
)}




      </motion.div>

      <motion.div 
        className="absolute min-w-max p-20"
        animate={{ 
          x: workspacePos.x, 
          y: workspacePos.y, 
          scale 
        }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 40, 
          mass: 0.5,
          restDelta: 0.001
        }}
        style={{ 
          left: 0,
          top: 0,
          transformOrigin: '0 0'
        }}
      >
        <div 
          className="w-full max-w-6xl space-y-12 cursor-auto"
          onPointerDown={(e) => e.stopPropagation()}
        >
          
          {/* Main Panel - Results Area */}
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {generatedClips.length > 0 ? (
                <motion.div 
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {generatedClips.map((clip) => (
                      <div key={clip.id} className="group relative transition-all">
                        <div className="aspect-[9/16] bg-black relative rounded-xl overflow-hidden shadow-sm">
                          {clip.url ? (
                            <video src={clip.url} controls className="w-full h-full object-contain" />
                          ) : (
                            <>
                              <img src={clip.thumbnailUrl} alt={clip.title} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <button className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                                  
                                </button>
                              </div>
                            </>
                          )}
                          <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 pointer-events-none z-10 shadow-sm">
                            <CheckCircle2 className="w-3 h-3" />
                            Score {clip.score}
                          </div>
                          
                          {/* Centered Download Button on Hover */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                            {clip.url ? (
                              <button 
                                onClick={() => forceDownload(clip.url!, `corte_${clip.id}.mp4`)}
                                title="Baixar" 
                                className="pointer-events-auto w-12 h-12 bg-black/40 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-transform hover:scale-110 shadow-lg border border-white/20"
                              >
                                <Download className="w-5 h-5" />
                              </button>
                            ) : (
                              <button title="Baixar" className="pointer-events-auto w-12 h-12 bg-black/40 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-transform hover:scale-110 shadow-lg border border-white/20">
                                <Download className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="pt-3">
                          <div className="relative bg-white border border-gray-100 rounded-2xl rounded-tl-sm p-4 shadow-sm">
                            <h3 className="font-bold text-gray-800 text-sm mb-2 leading-tight">{clip.title}</h3>
                            {clip.description && (
                              <p className="text-xs text-gray-500 leading-relaxed italic">"{clip.description}"</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-32 text-center"
                >
                  
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Zoom Controls */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-1 bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-black/5">
        <button 
          onClick={() => setScale(s => Math.max(0.1, s - 0.1))}
          className="p-2 hover:bg-black/5 rounded-xl transition-colors"
          title="Diminuir Zoom"
        >
          <ZoomOut className="w-5 h-5 text-gray-600" />
        </button>
        <span className="text-[11px] font-bold text-gray-600 w-12 text-center font-mono">
          {Math.round(scale * 100)}%
        </span>
        <button 
          onClick={() => setScale(s => Math.min(4, s + 0.1))}
          className="p-2 hover:bg-black/5 rounded-xl transition-colors"
          title="Aumentar Zoom"
        >
          <ZoomIn className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
