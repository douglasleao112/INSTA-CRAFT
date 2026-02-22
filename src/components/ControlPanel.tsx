import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings2, 
  Layout, 
  Type, 
  Image as ImageIcon, 
  Palette, 
  Maximize2, 
  Layers,
  ChevronRight,
  ChevronLeft,
  GripVertical,
  Plus,
  Trash2,
  Send,
  Sparkles,
  MessageSquare,
  X,
  Check,
  RotateCcw,
  Pin,
  PinOff,
  Minimize2,
  CircleMinus,
  RectangleVertical
} from 'lucide-react';
import { AspectRatio, LayoutType, Branding, SlideData, SignatureSlot } from '../types';
import { cn } from '../lib/utils';
import { CropModal } from './CropModal';
import { GoogleGenAI } from "@google/genai";
import { ENGINE_PROMPT } from '../constants/prompts';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ControlPanelProps {
  config: {
    aspectRatio: AspectRatio;
    slideCount: number;
    branding: Branding;
    slides: SlideData[];
  };
  updateConfig: (updates: any) => void;
  generateSlides: () => void;
  onClearImages?: () => void;
  uploadedImages: string[];
  setUploadedImages: React.Dispatch<React.SetStateAction<string[]>>;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  config, 
  updateConfig, 
  generateSlides, 
  onClearImages,
  uploadedImages,
  setUploadedImages
}) => {
  const [activeTab, setActiveTab] = useState<'ideia' | 'branding' | 'content' | 'fotos'>('ideia');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [localText, setLocalText] = useState(() => 
    config.slides
      .map(s => `${s.headline || ''}\n${s.subheadline || ''}`.trim())
      .filter(t => t.length > 0)
      .join('\n\n')
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: '🔮 Olá, vamos começar?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ✅ garante homePosition para não "perder" a assinatura ao reativar
useEffect(() => {
  const sigs = config.branding.signatures;

  let changed = false;

  const nextSignatures = Object.fromEntries(
    Object.entries(sigs).map(([k, slot]) => {
      const s: any = slot;

      if (!s.homePosition) {
        changed = true;
        return [k, { ...s, homePosition: { ...s.position } }];
      }

      return [k, s];
    })
  );

  if (changed) {
    updateConfig({
      branding: {
        ...config.branding,
        signatures: nextSignatures as any
      }
    });
  }
  // roda só ao montar
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      // Try backend API (OpenAI/GPT) first
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: ENGINE_PROMPT },
            ...messages.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text })),
            { role: 'user', content: userMessage }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { role: 'model', text: data.text || 'Desculpe, não consegui processar sua solicitação.' }]);
      } else {
        // Fallback to Gemini if backend fails or is not configured
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const chat = ai.chats.create({
          model: "gemini-3.1-pro-preview",
          config: {
            systemInstruction: ENGINE_PROMPT,
          },
          history: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }))
        });

        const result = await chat.sendMessage({ message: userMessage });
        setMessages(prev => [...prev, { role: 'model', text: result.text || 'Desculpe, não consegui processar sua solicitação.' }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      // Final fallback to Gemini on network error to backend
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const chat = ai.chats.create({
          model: "gemini-3.1-pro-preview",
          config: {
            systemInstruction: ENGINE_PROMPT,
          },
          history: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }))
        });

        const result = await chat.sendMessage({ message: userMessage });
        setMessages(prev => [...prev, { role: 'model', text: result.text || 'Desculpe, não consegui processar sua solicitação.' }]);
      } catch (geminiError) {
        setMessages(prev => [...prev, { role: 'model', text: 'Erro ao conectar com a inteligência artificial. Tente novamente.' }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

const handleBrandingChange = (key: keyof Branding, value: any) => {
  updateConfig({
    branding: { ...config.branding, [key]: value }
  });
};

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newImages: string[] = [];
    let processed = 0;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push(reader.result as string);
        processed++;
        if (processed === files.length) {
          setUploadedImages(prev => [...prev, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Sync local text with slides when they change (e.g. from AI)
  useEffect(() => {
    const text = config.slides
      .map(s => `${s.headline || ''}\n${s.subheadline || ''}`.trim())
      .filter(t => t.length > 0)
      .join('\n\n');
    
    // Only update if the content is actually different to avoid cursor jumps
    // when typing (since handleTextContentChange also updates config.slides)
    const currentNormalized = localText.replace(/\n\n+/g, '\n\n').trim();
    const newNormalized = text.replace(/\n\n+/g, '\n\n').trim();
    
    if (newNormalized !== currentNormalized) {
      setLocalText(text);
    }
  }, [config.slides]);

  const handleTextContentChange = (text: string) => {
    setLocalText(text);
    const normalized = text.replace(/\r\n/g, '\n');
    // Split by double newlines or single newlines to get potential headlines/subheadlines
    // We'll treat each non-empty line as a piece of content
    const lines = normalized.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    const newSlides = [...config.slides];
    for (let i = 0; i < config.slideCount; i++) {
      if (!newSlides[i]) {
        newSlides[i] = { id: crypto.randomUUID(), headline: '', subheadline: '', layout: 'full-bg' };
      }
      // Logic: 2 lines per slide
      newSlides[i].headline = lines[i * 2] || '';
      newSlides[i].subheadline = lines[i * 2 + 1] || '';
    }
    updateConfig({ slides: newSlides });
  };

  const tabs = [
    { id: 'ideia', icon: MessageSquare, label: 'Ideia' },
    { id: 'branding', icon: Palette, label: 'Branding' },
    { id: 'content', icon: Type, label: 'Conteúdo' },
    { id: 'fotos', icon: ImageIcon, label: 'Fotos' },
  ];


const signatures = config.branding.signatures;

const activeTextSignatures = Object.values(signatures).filter(
  (s: any) => s?.enabled && s?.type !== 'page'
);

const shouldShowAvatarSection = activeTextSignatures.some((s: any) => !!s?.showAvatar);
const shouldShowFrameSection = activeTextSignatures.some((s: any) => !!s?.showFrame);


  const panelVariants = {
    pinned: {
      x: '-50%',
      y: '-50%',
      left: '50%',
      top: '50%',
      width: isMinimized ? '48px' : '90%',
      maxWidth: isMinimized ? '48px' : '1000px',
      height: isMinimized ? '48px' : 'auto',
      borderRadius: isMinimized ? '16px' : '24px',
    },
    unpinned: {
      x: 0,
      y: 0,
      left: '40px',
      top: '80px',
      width: isMinimized ? '48px' : '320px',
      maxWidth: isMinimized ? '48px' : '320px',
      height: isMinimized ? '48px' : 'auto',
      borderRadius: isMinimized ? '16px' : '24px',
    }
  };

  return (
    <motion.div
      drag={!isPinned}
      dragMomentum={false}
      dragTransition={{ power: 0 }}
      initial={false}
      animate={isPinned ? "pinned" : "unpinned"}
      variants={panelVariants}
      transition={{ type: 'spring', damping: 30, stiffness: 250 }}
      className="fixed z-50 bg-white/95 backdrop-blur-xl border border-black/5 shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between p-4 border-b border-black/5 bg-white/50",
        !isPinned ? "cursor-grab active:cursor-grabbing" : "cursor-default",
        isMinimized && "border-none p-0 flex items-center justify-center h-full w-full"
      )}>
        {!isMinimized && (
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Engine Content</span>
            </div>
          </div>
        )}
        
        <div className={cn("flex items-center gap-1", isMinimized && "flex-col")}>
          {!isMinimized && (
            <>
              <button 
                onClick={onClearImages}
                title="Limpar Imagens"
                className="p-1.5 hover:bg-black/5 rounded-lg transition-colors text-gray-400 hover:text-red-500"
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
          {/* Tabs */}
          <div className="flex border-b border-black/5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex-1 py-3 flex flex-col items-center gap-1 transition-all",
                  activeTab === tab.id ? "text-indigo-600 bg-indigo-50/50" : "text-gray-400 hover:text-gray-600 hover:bg-black/5"
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {activeTab === 'ideia' && (
              <div className="flex flex-col h-[50vh]">
                <div className="flex-grow overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
                  {messages.map((m, i) => (
                    <div key={i} className={cn(
                      "max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed",
                      m.role === 'user' 
                        ? "bg-indigo-600 text-white ml-auto rounded-tr-none" 
                        : "bg-gray-100 text-gray-800 mr-auto rounded-tl-none"
                    )}>
                      <div className="whitespace-pre-wrap">{m.text}</div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="bg-gray-100 text-gray-500 mr-auto rounded-2xl rounded-tl-none p-3 text-xs animate-pulse">
                      Pensando...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                
                <div className="relative">
                  <input 
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Digite sua mensagem..."
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-black/5 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={isLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          {activeTab === 'branding' && (
  <div className="space-y-6">
    {/* Engine Settings moved to Branding */}
    <div className="space-y-6 pb-6 border-b border-black/5">
      <div>
        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">
          Dimensão
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['1:1', '4:5', '9:16'] as AspectRatio[]).map((ratio) => (
            <button
              key={ratio}
              onClick={() => updateConfig({ aspectRatio: ratio })}
              className={cn(
                "py-2 rounded-xl border text-sm font-medium transition-all",
                config.aspectRatio === ratio
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
                  : "border-black/5 hover:border-indigo-200 text-gray-600"
              )}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">
          Slides ({config.slideCount})
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={config.slideCount}
          onChange={(e) => updateConfig({ slideCount: parseInt(e.target.value) })}
          className="w-full accent-indigo-600"
        />
        <div className="flex justify-between mt-1 text-[10px] font-bold text-gray-400">
          <span>1</span>
          <span>10</span>
        </div>
      </div>
    </div>

    {/* Palette Section */}
    <div className="bg-gray-50 p-4 rounded-2xl border border-black/5">
      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 block">
        Paleta de Cores
      </label>
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Fundo', key: 'backgroundColor' },
          { label: 'Fundo II', key: 'alternativeBackgroundColor' },
          { label: 'Título', key: 'primaryColor' },
          { label: 'Sub', key: 'secondaryColor' }
        ].map((item) => (
          <div key={item.key} className="flex flex-col items-center gap-2">
            <input
              type="color"
              value={(config.branding as any)[item.key]}
              onChange={(e) => handleBrandingChange(item.key as any, e.target.value)}
              className="w-10 h-10 rounded-xl cursor-pointer border-none p-0 overflow-hidden shadow-sm"
            />
            <span className="text-[9px] font-bold text-gray-500 uppercase">{item.label}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Assinatura Section */}
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          Assinaturas
        </label>

  <label className="flex items-center gap-2 cursor-pointer group">
  <div
    onClick={() => updateConfig({ isGlobalBranding: !config.isGlobalBranding })}
    className={cn(
      "w-4 h-4 rounded border flex items-center justify-center transition-all",
      config.isGlobalBranding
        ? "bg-indigo-600 border-indigo-600"
        : "border-gray-300 bg-white group-hover:border-indigo-300"
    )}
  >
    {config.isGlobalBranding && (
      <div className="w-1.5 h-1.5 bg-white rounded-full" />
    )}
  </div>

  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
    AJUSTE GLOBAL
  </span>
</label>
      </div>

      {/* Top Icon Selector */}
      <div className="grid grid-cols-5 gap-2 bg-gray-50 p-3 rounded-2xl border border-black/5">
        {(Object.entries(config.branding.signatures) as [keyof Branding['signatures'], SignatureSlot][])
          .map(([key, slot]) => {
            const icons: Record<string, React.ReactNode> = {
              topLeft: (
                <svg viewBox="0 0 64 64" className="w-6 h-6" fill="none">
                  <rect x="12" y="6" width="40" height="52" rx="4" stroke="currentColor" strokeWidth="3" />
                  <rect x="18" y="12" width="12" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              ),
              topRight: (
                <svg viewBox="0 0 64 64" className="w-6 h-6" fill="none">
                  <rect x="12" y="6" width="40" height="52" rx="4" stroke="currentColor" strokeWidth="3" />
                  <rect x="34" y="12" width="12" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              ),
              centerLow: (
                <svg viewBox="0 0 64 64" className="w-6 h-6" fill="none">
                  <rect x="12" y="6" width="40" height="52" rx="4" stroke="currentColor" strokeWidth="3" />
                  <rect x="26" y="34" width="12" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              ),
              bottomLeft: (
                <svg viewBox="0 0 64 64" className="w-6 h-6" fill="none">
                  <rect x="12" y="6" width="40" height="52" rx="4" stroke="currentColor" strokeWidth="3" />
                  <rect x="18" y="45" width="12" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              ),
              bottomRight: (
                <svg viewBox="0 0 64 64" className="w-6 h-6" fill="none">
                  <rect x="12" y="6" width="40" height="52" rx="4" stroke="currentColor" strokeWidth="3" />
                  <rect x="34" y="45" width="12" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              ),
            };

            return (
              <button
                key={key}
                onClick={() => {
  const willEnable = !slot.enabled;

  const resetPos = (slot as any).homePosition ?? slot.position;

  handleBrandingChange('signatures', {
    ...config.branding.signatures,
    [key]: {
      ...slot,
      enabled: willEnable,
      ...(willEnable ? { position: { ...resetPos } } : {})
    }
  });

  // ✅ se não for global, limpa override por slide (evita voltar bugado)
  if (willEnable && !config.isGlobalBranding) {
    const newSlides = config.slides.map((sl) => {
      if (!sl.signaturePositions) return sl;
      if (!(key in sl.signaturePositions)) return sl;

      const nextSP = { ...sl.signaturePositions } as any;
      delete nextSP[key];

      return { ...sl, signaturePositions: nextSP };
    });

    updateConfig({ slides: newSlides });
  }
}}
                className={cn(
                  "aspect-square flex items-center justify-center border rounded-xl transition-all",
                  slot.enabled
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                    : "bg-white border-black/5 text-gray-300 hover:text-gray-400"
                )}
              >
                {icons[key]}
              </button>
            );
          })}
      </div>

      {/* Active Signature Sections */}
      <div className="space-y-6">
        {(Object.entries(config.branding.signatures) as [keyof Branding['signatures'], SignatureSlot][])
          .filter(([_, slot]) => slot.enabled)
          .map(([key, slot]) => {
            const labels: Record<string, string> = {
              topLeft: "TOPO ESQUERDO",
              topRight: "TOPO DIREITO",
              centerLow: "CENTRO",
              bottomLeft: "INFERIOR ESQUERDO",
              bottomRight: "INFERIOR DIREITO"
            };

            const updateSlot = (updates: Partial<SignatureSlot>) => {
              handleBrandingChange('signatures', {
                ...config.branding.signatures,
                [key]: { ...slot, ...updates }
              });
            };

            const isPage = slot.type === 'page';

            return (
              <div key={key} className="bg-gray-50/50 p-4 rounded-2xl border border-black/5 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold text-gray-500 uppercase tracking-tight">
                    {labels[key]}
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div
                      onClick={() => updateSlot({ type: isPage ? 'text' : 'page' })}
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                        isPage ? "bg-indigo-600 border-indigo-600" : "border-gray-300 bg-white group-hover:border-indigo-300"
                      )}
                    >
                      {isPage && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">PÁGINA</span>
                  </label>
                </div>

                {!isPage && (
                  <>
                    <div className="space-y-2 relative">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Título"
                          value={slot.name}
                          onChange={(e) => updateSlot({ name: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-black/5 bg-white text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500/20"
                        />
                     
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Subtítulo"
                          value={slot.handle}
                          onChange={(e) => updateSlot({ handle: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-black/5 bg-white text-[12px] outline-none transition-all focus:ring-2 focus:ring-indigo-500/20"
                        />
                      
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      {[
                        { id: 'showAvatar', label: 'FOTO' },
                        { id: 'showFrame', label: 'MOLDURA' },
                        { id: 'isVerified', label: 'SELO' },
                      ].map((opt) => {
                        const isActive = slot[opt.id as keyof SignatureSlot];

                        return (
                          <label key={opt.id} className="flex items-center gap-2 cursor-pointer group">
                            <div
                              onClick={() => updateSlot({ [opt.id]: !slot[opt.id as keyof SignatureSlot] } as any)}
                              className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                isActive ? "bg-indigo-600 border-indigo-600" : "border-gray-300 bg-white group-hover:border-indigo-300"
                              )}
                            >
                              {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                              {opt.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
      </div>

      {/* Foto da Assinatura Section (oculta se nenhuma assinatura tiver FOTO marcada) */}
      {shouldShowAvatarSection && (
        <div className="pt-6 border-t border-black/5 space-y-4">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">
            Foto da Assinatura
          </label>

          <div className="bg-gray-50 p-5 rounded-3xl border border-black/5 flex items-center gap-6">
            {/* Avatar */}
            <div
              onClick={() => avatarInputRef.current?.click()}
              className="w-20 h-20 rounded-full bg-white border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group relative"
            >
              {Object.values(config.branding.signatures).find((s: any) => s.enabled && s.avatar) ? (
                <>
                  <img
                    src={(Object.values(config.branding.signatures).find((s: any) => s.enabled && s.avatar) as any).avatar}
                    className="w-full h-full object-cover group-hover:opacity-50 transition-opacity"
                    alt=""
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <ImageIcon className="w-5 h-5 text-gray-300 group-hover:text-indigo-400" />
                  <span className="text-[7px] font-bold text-gray-400 group-hover:text-indigo-500 uppercase">
                    Foto
                  </span>
                </div>
              )}

              <input
                type="file"
                ref={avatarInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setTempImage(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>

            {/* Controles */}
            <div className="flex-grow space-y-4">
              <div className="flex items-end gap-4">
                <div className="flex-grow space-y-1.5">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                    Espessura da Borda
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={(Object.values(config.branding.signatures).find((s: any) => s.enabled) as any)?.avatarBorderWidth || 0}
                    onChange={(e) => {
                      const width = parseInt(e.target.value);
                      handleBrandingChange('signatures', Object.fromEntries(
                        Object.entries(config.branding.signatures).map(([k, v]) => [k, { ...(v as any), avatarBorderWidth: width }])
                      ));
                    }}
                    className="w-full accent-indigo-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="shrink-0 space-y-1.5">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block text-center">
                    Cor
                  </label>
                  <div className="relative w-8 h-8 rounded-lg border border-black/10 overflow-hidden shadow-sm">
                    <input
                      type="color"
                      value={(Object.values(config.branding.signatures).find((s: any) => s.enabled) as any)?.avatarBorderColor || '#ffffff'}
                      onChange={(e) => {
                        const color = e.target.value;
                        handleBrandingChange('signatures', Object.fromEntries(
                          Object.entries(config.branding.signatures).map(([k, v]) => [k, { ...(v as any), avatarBorderColor: color }])
                        ));
                      }}
                      className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer border-none p-0"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                  Arredondamento
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={(Object.values(config.branding.signatures).find((s: any) => s.enabled) as any)?.avatarBorderRadius || 0}
                  onChange={(e) => {
                    const radius = parseInt(e.target.value);
                    handleBrandingChange('signatures', Object.fromEntries(
                      Object.entries(config.branding.signatures).map(([k, v]) => [k, { ...(v as any), avatarBorderRadius: radius }])
                    ));
                  }}
                  className="w-full accent-indigo-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {tempImage && (
        <CropModal
          image={tempImage}
          onCropComplete={(croppedImage) => {
            handleBrandingChange('signatures', Object.fromEntries(
              Object.entries(config.branding.signatures).map(([k, v]) => [k, { ...(v as any), avatar: croppedImage }])
            ));
            setTempImage(null);
          }}
          onClose={() => setTempImage(null)}
        />
      )}

      {/* Estilo da Moldura Section (oculta se nenhuma assinatura tiver MOLDURA marcada) */}
      {shouldShowFrameSection && (
        <div className="pt-6 border-t border-black/5 space-y-4">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">
            Estilo da Moldura
          </label>

          <div className="bg-gray-50 p-4 rounded-2xl border border-black/5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-gray-400 uppercase">Fundo</span>
                <input
                  type="color"
                  value={config.branding.container.backgroundColor}
                  onChange={(e) => handleBrandingChange('container', { ...config.branding.container, backgroundColor: e.target.value })}
                  className="w-full h-8 rounded-lg cursor-pointer border-none p-0 overflow-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-gray-400 uppercase">Borda</span>
                <input
                  type="color"
                  value={config.branding.container.borderColor}
                  onChange={(e) => handleBrandingChange('container', { ...config.branding.container, borderColor: e.target.value })}
                  className="w-full h-8 rounded-lg cursor-pointer border-none p-0 overflow-hidden"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-bold uppercase text-gray-400">
                  <span>Opacidade</span>
                  <span className="text-indigo-600">{config.branding.container.opacity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.branding.container.opacity}
                  onChange={(e) => handleBrandingChange('container', { ...config.branding.container, opacity: parseInt(e.target.value) })}
                  className="w-full accent-indigo-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-bold uppercase text-gray-400">
                  <span>Arredondamento</span>
                  <span className="text-indigo-600">{config.branding.container.borderRadius}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={config.branding.container.borderRadius}
                  onChange={(e) => handleBrandingChange('container', { ...config.branding.container, borderRadius: parseInt(e.target.value) })}
                  className="w-full accent-indigo-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
)}

            {activeTab === 'content' && (
              <div className="space-y-4">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">Texto do Carrossel</label>
                    <textarea
                  rows={10}
                  className="w-full p-4 rounded-2xl border border-black/5 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none font-medium"
                  placeholder={`Título do Slide 1
Subtítulo do slide 1

Título do Slide 2
Subtítulo do slide 2`}
                  onChange={(e) => handleTextContentChange(e.target.value)}
                  value={localText}
                />
               
              </div>
            )}

         {activeTab === 'fotos' && (
  <div className="space-y-6">
    {/* Dropzone (sempre visível) */}
    <div 
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => fileInputRef.current?.click()}
      className="border-2 border-dashed border-gray-200 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group"
    >
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform">
        <ImageIcon className="w-6 h-6 text-indigo-600" />
      </div>

      <div className="text-center">
        <p className="text-xs font-bold text-gray-700">Arraste fotos aqui</p>
        <p className="text-[10px] text-gray-400 mt-1">ou clique para selecionar</p>
      </div>

      <input 
        ref={fileInputRef}
        type="file" 
        multiple 
        accept="image/*" 
        className="hidden" 
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>

    {/* Só aparece quando houver fotos */}
    {uploadedImages.length > 0 && (
      <div className="space-y-6">
        {/* Arredondamento (global) */}
        <div className="bg-gray-50 p-4 rounded-2xl border border-black/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              Bordas
            </span>
            <span className="text-[10px] font-bold text-indigo-600">
              {config.branding.imageRadius ?? 0}px
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={40}
            value={config.branding.imageRadius ?? 0}
            onChange={(e) =>
              handleBrandingChange('imageRadius', parseInt(e.target.value, 10))
            }
            className="w-full accent-indigo-600"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              {uploadedImages.length} Fotos Carregadas
            </span>
            <button 
              onClick={() => setUploadedImages([])}
              className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase"
            >
              Limpar
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {uploadedImages.slice(0, 8).map((img, i) => (
              <div key={i} className="group relative aspect-square rounded-lg overflow-hidden border border-black/5 bg-gray-100">
                <img src={img} className="w-full h-full object-cover" alt="" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadedImages(prev => prev.filter((_, index) => index !== i));
                  }}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
            {uploadedImages.length > 8 && (
              <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 border border-black/5">
                +{uploadedImages.length - 8}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
)}
          </div>

          {/* Persistent Footer Action */}
          <div className="p-5 pt-0">
            <button
              onClick={generateSlides}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Gerar Carrossel
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
};
