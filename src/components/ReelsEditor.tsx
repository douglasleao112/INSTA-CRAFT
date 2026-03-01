import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { Upload, Video, Settings, Play, Scissors, Type, LayoutTemplate, CheckCircle2, Download, RefreshCcw, Maximize2, Minimize2, Pin, PinOff } from 'lucide-react';
import { cn } from '../lib/utils';

interface GeneratedClip {
  id: string;
  title: string;
  duration: string;
  score: number;
  thumbnailUrl: string;
  description?: string;
}

export function ReelsEditor() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [duration, setDuration] = useState('<30s');
  const [prompt, setPrompt] = useState('');
  const [theme, setTheme] = useState('');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [interactiveSubtitles, setInteractiveSubtitles] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [generatedClips, setGeneratedClips] = useState<GeneratedClip[]>([]);

  const [isMinimized, setIsMinimized] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const dragControls = useDragControls();

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

const themes = [
  'Acadêmico',
  'Avaliações de produtos',
  'Comédia',
  'Comentário',
  'Comentário esportivo',
  'Discurso motivacional',
  'Igreja',
  'Jogos',
  'Lista',
  'Marketing',
  'Notícias',
  'Outros',
  'Perguntas e respostas',
  'Podcast',
  'Tutorial',
  'Vlog',
  'Webinar'
];

  const processingSteps = [
    "Enviando vídeo para o servidor...",
    "Transcrevendo áudio e analisando contexto...",
    "Identificando melhores momentos...",
    "Aplicando cortes e legendas dinâmicas...",
    "Finalizando renderização..."
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
      setGeneratedClips([]); // Reset clips on new upload
    }
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
    }, 1500);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('duration', duration);
      formData.append('prompt', prompt);
      formData.append('theme', theme);
      formData.append('interactiveSubtitles', interactiveSubtitles.toString());

      const response = await fetch('/api/generate-reels', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao gerar cortes');
      }

      const data = await response.json();
      
      // Map the backend response to our GeneratedClip interface
      const newClips: GeneratedClip[] = data.clips.map((clip: any, index: number) => ({
        id: clip.id || String(index + 1),
        title: clip.title,
        duration: clip.duration,
        score: clip.score,
        thumbnailUrl: `https://picsum.photos/seed/${Math.random()}/400/700`, // Simulated thumbnail
        description: clip.description
      }));

      clearInterval(interval);
      setProcessingStep(processingSteps.length - 1); // Final step
      
      setTimeout(() => {
        setGeneratedClips(newClips);
        setIsProcessing(false);
      }, 500);

    } catch (error: any) {
      console.error("Erro:", error);
      alert("Erro ao gerar cortes: " + error.message);
      clearInterval(interval);
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col pt-24 pb-8 px-8 overflow-y-auto">
      
      {/* Floating Control Panel */}
      <motion.div
        drag={!isPinned && !isMinimized}
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragTransition={{ power: 0 }}
        initial={false}
        animate={isMinimized ? "minimized" : (isPinned ? "pinned" : "unpinned")}
        variants={panelVariants}
        transition={{ type: 'spring', damping: 30, stiffness: 250 }}
        className="fixed z-50 bg-white/95 backdrop-blur-xl border border-black/5 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div 
          onPointerDown={(e) => !isPinned && !isMinimized && dragControls.start(e)}
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
            <div className="p-5 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              <div className={cn(
                "space-y-6",
                isPinned && "max-w-[380px] mx-auto w-full px-1"
              )}>
               {/* Upload + Legendas */}
<div>
  {!videoFile ? (
    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="flex flex-col items-center justify-center pt-5 pb-6">
        <Upload className="w-6 h-6 text-gray-400 mb-2" />
        <p className="mb-1 text-[11px] text-gray-500 font-bold text-center px-2">Clique ou arraste um vídeo</p>
        <p className="text-[9px] text-gray-400">MP4, MOV ou AVI</p>
      </div>
      <input type="file" className="hidden" accept="video/*" onChange={handleFileUpload} />
    </label>
  ) : (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center">
      <video 
        src={URL.createObjectURL(videoFile)} 
        controls 
        className="w-full h-full object-contain"
      />
      <button 
        onClick={() => {
          setVideoFile(null);
          setGeneratedClips([]);
        }}
        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white px-2 py-1 rounded-lg text-[10px] font-medium transition-colors"
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
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Prompt de Edição (Opcional)</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={placeholderText}
                  className="w-full h-16 p-3 bg-gray-50 border border-black/5 rounded-xl resize-none text-[12px] font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-transparent outline-none transition-all custom-scrollbar"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Duração Aproximada</label>
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

              {/* Theme */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Tema do Vídeo (Opcional)</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-black/5 rounded-xl text-[12px] font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                >
                  <option value="">Selecione um tema...</option>
                  {themes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Dimensão</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: '9:16', label: '9:16', icon: (
                      <svg viewBox="0 0 140 140" className="w-6 h-6 mb-1.5">
                        <rect x="36.25" y="10" width="67.5" height="120" rx="12" fill="none" stroke="currentColor" strokeWidth="8"/>
                      </svg>
                    )},
                    { id: '1:1', label: '1:1', icon: (
                      <svg viewBox="0 0 140 140" className="w-6 h-6 mb-1.5">
                        <rect x="10" y="10" width="120" height="120" rx="12" fill="none" stroke="currentColor" strokeWidth="8"/>
                      </svg>
                    )},
                    { id: '16:9', label: '16:9', icon: (
                      <svg viewBox="0 0 140 140" className="w-6 h-6 mb-1.5">
                        <rect x="10" y="36.25" width="120" height="67.5" rx="12" fill="none" stroke="currentColor" strokeWidth="8"/>
                      </svg>
                    )},
                    { id: '4:5', label: '4:5', icon: (
                      <svg viewBox="0 0 140 140" className="w-6 h-6 mb-1.5">
                        <rect x="22" y="10" width="96" height="120" rx="12" fill="none" stroke="currentColor" strokeWidth="8"/>
                      </svg>
                    )}
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
          
          <div className="p-5 border-t border-black/5 bg-white/50 backdrop-blur-md">
            <button
              disabled={!videoFile || isProcessing}
              onClick={handleGenerate}
              className={cn(
                "w-full py-3.5 rounded-xl font-bold text-[13px] text-white flex items-center justify-center gap-2 transition-all shadow-lg relative overflow-hidden",
                !videoFile || isProcessing
                  ? "bg-gray-300 cursor-not-allowed shadow-none"
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
              )}
            >
              {isProcessing ? (
                <>
                  <RefreshCcw className="w-5 h-5 animate-spin" />
                  Analisando Vídeo...
                </>
              ) : (
                <>
                  <Scissors className="w-5 h-5" />
                  Gerar Cortes Mágicos
                </>
              )}
            </button>
          </div>
          </>
        )}
      </motion.div>

      <div className="max-w-4xl mx-auto w-full space-y-8 pl-[340px]">
        
        {/* Main Panel - Results Area */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
          {generatedClips.length > 0 && (
  <motion.div 
    key="results"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="bg-white rounded-2xl p-8 border border-black/5 shadow-sm"
  >
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        <Scissors className="w-6 h-6 text-indigo-600" />
        Cortes Gerados ({generatedClips.length})
      </h2>
      <button 
        onClick={handleGenerate}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors"
      >
        <RefreshCcw className="w-4 h-4" />
        Gerar Novamente
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {generatedClips.map((clip) => (
        <div key={clip.id} className="group relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 hover:shadow-md transition-all">
          <div className="aspect-[9/16] bg-gray-200 relative">
            <img src={clip.thumbnailUrl} alt={clip.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                <Play className="w-5 h-5 ml-1" />
              </button>
            </div>
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-md">
              {clip.duration}
            </div>
            <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Score {clip.score}
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-bold text-gray-800 text-sm line-clamp-2 mb-2">{clip.title}</h3>
            {clip.description && (
              <p className="text-xs text-gray-500 line-clamp-2 mb-4">{clip.description}</p>
            )}
            <button className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors">
              <Download className="w-4 h-4" />
              Baixar Vídeo
            </button>
          </div>
        </div>
      ))}
    </div>
  </motion.div>
)}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
