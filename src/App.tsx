import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ControlPanel } from './components/ControlPanel';
import { Slide } from './components/Slide';
import { CarouselConfig, SlideData } from './types';
import { Download, RefreshCcw } from 'lucide-react';
import { TextToolbar } from './components/TextToolbar';
import { cn } from './lib/utils';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const INITIAL_CONFIG: CarouselConfig = {
  aspectRatio: '4:5',
  slideCount: 10,
  branding: {
    backgroundColor: '#FFFFFF',
    alternativeBackgroundColor: '#333333',
    primaryColor: '#1A1A1A',
    secondaryColor: '#4A4A4A',
    highlightColor: '#242f9c',
    handle: '@dr.douglasleao',
    name: 'Dr. Douglas Leão',
    imageRadius: 14,
    isVerified: true,
    showAvatar: false,
    container: {
      enabled: false,
      backgroundColor: '#FFFFFF',
      opacity: 10,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 12,
    },
    signatures: {
      topLeft: { 
        enabled: true, 
        type: 'text', 
        position: { x: 0, y: 0 },
        name: 'Dr. Douglas Leão',
        handle: '@dr.douglasleao',
        isVerified: true,
        showAvatar: false,
        avatarBorderColor: '#ffffff',
        avatarBorderWidth: 1,
        avatarBorderRadius: 50,
        showFrame: false
      },
      topRight: { 
        enabled: true, 
        type: 'page', 
        position: { x: 360, y: 0 },
        name: 'Topo direito',
        handle: 'subtexto',
        isVerified: true,
        showAvatar: false,
        avatarBorderColor: '#8c8c8c',
        avatarBorderWidth: 1,
        avatarBorderRadius: 50,
        showFrame: false
      },
      centerLow: { 
        enabled: false, 
        type: 'text', 
        position: { x: 120, y: 400 },
        name: 'Centro',
        handle: 'subtexto',
        isVerified: false,
        showAvatar: false,
        avatarBorderColor: '#ffffff',
        avatarBorderWidth: 1,
        avatarBorderRadius: 50,
        showFrame: false
      },
      bottomLeft: { 
        enabled: false, 
        type: 'text', 
        position: { x: 0, y: 480 },
        name: 'Inferior esquerdo',
        handle: 'subtexto',
        isVerified: false,
        showAvatar: false,
        avatarBorderColor: '#ffffff',
        avatarBorderWidth: 1,
        avatarBorderRadius: 50,
        showFrame: false
      },
      bottomRight: { 
        enabled: false, 
        type: 'text', 
        position: { x: 280, y: 480 },
        name: 'Inferior direito',
        handle: 'subtexto',
        isVerified: false,
        showAvatar: false,
        avatarBorderColor: '#ffffff',
        avatarBorderWidth: 1,
        avatarBorderRadius: 50,
        showFrame: false
      },
    },
  },
  slides: [],
  isGlobalBranding: true,
};

export default function App() {
  const [config, setConfig] = useState<CarouselConfig>(INITIAL_CONFIG);
  const [workspacePos, setWorkspacePos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isTextEditing, setIsTextEditing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const workspaceRef = useRef<HTMLElement | null>(null);

  const updateConfig = (updates: Partial<CarouselConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const resetView = () => {
    setWorkspacePos({ x: 0, y: 0 });
    setZoom(1);
  };

  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

  const handleWheel = (e: React.WheelEvent) => {
    if (isTextEditing) return;

    // impede a página de rolar enquanto dá zoom
    e.preventDefault();

    const el = workspaceRef.current;
    if (!el) return;

    // posição do mouse dentro do <main>
    const rect = el.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // scroll pra cima = zoom in | scroll pra baixo = zoom out
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = clamp(zoom * zoomFactor, 0.2, 3);

    // quanto o zoom mudou
    const ratio = newZoom / zoom;

    // ajusta o pan para o zoom "ir pra onde está o mouse"
    setWorkspacePos(prev => ({
      x: mouseX - (mouseX - prev.x) * ratio,
      y: mouseY - (mouseY - prev.y) * ratio,
    }));

    setZoom(newZoom);
  };

  const generateSlides = () => {
    const allLayouts: any[] = [
      'full-bg',
      'text-top-img-bottom',
      'img-top-text-bottom',
      'img-right-text-left',
      'headline-img-subheadline'
    ];

    const randomLayouts = allLayouts; // Agora permite full-bg em qualquer slide
    const batchSize = config.slideCount;

    // Determine which slides will have the alternative background (1 or 2 slides, excluding the first)
    // Regra: Nunca um do lado do outro
    const altBgIndices: number[] = [];
    if (batchSize > 2) {
      const count = Math.random() > 0.5 ? 2 : 1;
      const availableIndices = Array.from({ length: batchSize - 1 }, (_, i) => i + 1);
      
      for (let i = 0; i < count; i++) {
        if (availableIndices.length === 0) break;
        
        const randomIndex = Math.floor(Math.random() * availableIndices.length);
        const selectedIndex = availableIndices[randomIndex];
        altBgIndices.push(selectedIndex);
        
        // Remove o selecionado e seus vizinhos imediatos para evitar adjacência
        const toRemove = [selectedIndex - 1, selectedIndex, selectedIndex + 1];
        toRemove.forEach(val => {
          const idx = availableIndices.indexOf(val);
          if (idx !== -1) availableIndices.splice(idx, 1);
        });
      }
    } else if (batchSize === 2) {
      // Se tiver só 2 slides, o segundo pode ser Alt
      if (Math.random() > 0.5) altBgIndices.push(1);
    }

    const newBatch: SlideData[] = Array.from({ length: batchSize }).map((_, i) => {
      // O primeiro é sempre full-bg, os outros são aleatórios (incluindo full-bg)
      const layout = i === 0 ? 'full-bg' : randomLayouts[Math.floor(Math.random() * randomLayouts.length)];
      const useAltBg = altBgIndices.includes(i);

      return {
        id: crypto.randomUUID(),
        headline: `Título do Slide ${i + 1}`,
        subheadline: `Subtítulo explicativo do slide ${i + 1}`,
        layout,
        image: `https://picsum.photos/seed/${i + 100}/1080/1350`,
        backgroundColor: useAltBg ? config.branding.alternativeBackgroundColor : config.branding.backgroundColor,
      };
    });

    updateConfig({ slides: newBatch });
  };

  const downloadAll = async () => {
    if (config.slides.length === 0) return;
    setIsDownloading(true);
    
    try {
      const zip = new JSZip();
      const slideElements = document.querySelectorAll('.slide-capture');
      
      for (let i = 0; i < slideElements.length; i++) {
        const el = slideElements[i] as HTMLElement;
        const dataUrl = await toPng(el, { 
          pixelRatio: 2,
          skipFonts: false,
          fontEmbedCSS: ''
        });
        const base64Data = dataUrl.split(',')[1];
        zip.file(`slide-${i + 1}.png`, base64Data, { base64: true });
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'carrossel-insta.zip');
    } catch (error) {
      console.error('Erro ao baixar imagens:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F9FA] workspace-grid relative overflow-hidden font-sans">
      <AnimatePresence>
        {isTextEditing && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100]">
            <TextToolbar />
          </div>
        )}
      </AnimatePresence>

      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Top Navigation */}
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-black/5 bg-white/50 backdrop-blur-md z-40 flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
<div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg">
  <svg
    viewBox="0 0 113.79 122.88"
    className="w-6 h-6 text-white fill-current"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      fill="currentColor"
      d="M75.64,27a35.42,35.42,0,0,1,8.58,7.07A32.54,32.54,0,0,1,90,43.34h0a37.48,37.48,0,0,1,1.85,5.93,35,35,0,0,1,.24,14,38.35,38.35,0,0,1-2.16,7.3l-.11.25c-2,5-5.58,9.84-9,14.62-1.74,2.42-3.47,4.81-4.92,7.13a4.71,4.71,0,0,1-4.33,2.18L44.05,98.84a4.7,4.7,0,0,1-5.21-3.41,38.85,38.85,0,0,0-2.53-5.8,24.22,24.22,0,0,0-3-4.48C31.89,83.53,30.44,81.87,29,80a40.57,40.57,0,0,1-4.14-6.92h0a41.19,41.19,0,0,1-2.8-8,35.59,35.59,0,0,1-.95-8.42v0a35.78,35.78,0,0,1,1.17-8.73,41.74,41.74,0,0,1,3.41-8.82l.2-.36A35.1,35.1,0,0,1,33,30.09a33.5,33.5,0,0,1,9.43-5.81l.29-.11a35.14,35.14,0,0,1,8-2.13,37.61,37.61,0,0,1,8.75-.2,38.63,38.63,0,0,1,8.37,1.71A37.79,37.79,0,0,1,75.64,27Zm-3.88,87.35a17.36,17.36,0,0,1-6.26,6.28,16.36,16.36,0,0,1-7.19,2.19,14.86,14.86,0,0,1-7.39-1.44,15.07,15.07,0,0,1-4.38-3.26l25.22-3.77Zm2.4-14.11,0,1.65,0,.57a23.51,23.51,0,0,1,0,3.25l-.5,2.38-30.56,4.54-.53-1.22-1.19-4.88,0-1.42,32.7-4.87Zm-18-96.51A3.84,3.84,0,0,1,60.07,0h0l.26,0A3.89,3.89,0,0,1,62.8,1.19a3.86,3.86,0,0,1,1.06,2.69h0a1.27,1.27,0,0,1,0,.2l-.21,8.19h0a2.28,2.28,0,0,1,0,.26,3.81,3.81,0,0,1-3.86,3.52h0l-.27,0a3.77,3.77,0,0,1-2.46-1.17A3.84,3.84,0,0,1,56,12.18h0a1.27,1.27,0,0,1,0-.2l.2-8.22ZM14,18.1a3.9,3.9,0,0,1-1.22-2.67,3.83,3.83,0,0,1,3.69-4,3.84,3.84,0,0,1,2.75,1l6.14,5.73a3.85,3.85,0,0,1,.21,5.42,3.91,3.91,0,0,1-2.68,1.22,3.82,3.82,0,0,1-2.74-1L14,18.1Zm-10,42.22A3.86,3.86,0,0,1,0,56.6a3.78,3.78,0,0,1,1-2.75,3.81,3.81,0,0,1,2.68-1.2l8.38-.28a3.83,3.83,0,0,1,4,3.71v.06h0v.14a3.86,3.86,0,0,1-1,2.55A3.81,3.81,0,0,1,12.34,60h-.15l-8.28.28ZM109.6,48.43h.13a3.84,3.84,0,0,1,2.65.85,3.91,3.91,0,0,1,1.4,2.59v0s0,.1,0,.12a3.84,3.84,0,0,1-3.44,4L102,57a3.84,3.84,0,0,1-4.21-3.42,3.84,3.84,0,0,1,3.43-4.21c2.78-.3,5.58-.62,8.37-.89ZM93.08,15.05A3.81,3.81,0,0,1,98.39,14h0A3.78,3.78,0,0,1,100,16.44a3.88,3.88,0,0,1-.57,2.88l-4.67,7A3.84,3.84,0,0,1,88.4,22l4.68-7ZM61.26,54.91h5.89a1.54,1.54,0,0,1,1.54,1.54,1.56,1.56,0,0,1-.26.86l-14,23.93a1.53,1.53,0,0,1-2.11.52,1.55,1.55,0,0,1-.72-1.63l2.07-14.68-7,.12a1.53,1.53,0,0,1-1.56-1.51,1.49,1.49,0,0,1,.21-.81L59.11,39.33a1.55,1.55,0,0,1,2.11-.54A1.52,1.52,0,0,1,62,40.33l-.7,14.58Z"
    />
  </svg>
</div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight">InstaCraft</h1>
           
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-black/5 rounded-lg text-[10px] font-black text-gray-500">
            {Math.round(zoom * 100)}%
          </div>
          <button 
            onClick={resetView}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-black/5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-black transition-all shadow-sm"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Resetar Vista
          </button>
          
          <button 
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-full font-bold text-sm shadow-lg shadow-indigo-200 transition-all",
              isDownloading ? "opacity-70 cursor-not-allowed" : "hover:scale-105 active:scale-95"
            )}
            onClick={downloadAll}
            disabled={isDownloading}
          >
            <Download className="w-4 h-4" />
            {isDownloading ? 'Gerando...' : 'Baixar Imagens'}
          </button>
        </div>
      </header>

      {/* Floating Control Panel */}
      <ControlPanel 
        config={config} 
        updateConfig={updateConfig} 
        generateSlides={generateSlides} 
      />

      {/* Main Workspace Area */}
     <main
  ref={workspaceRef as any}
  className="pt-32 pb-32 min-h-screen overflow-hidden select-none cursor-crosshair active:cursor-grabbing"
  onWheel={handleWheel}
  onPointerDown={(e) => {
  if (isTextEditing) return;

  const alvo = e.target as HTMLElement | null;

  // se clicou em cima da imagem, deixa a imagem cuidar do drag dela
  if (alvo?.closest('[data-imageframe="true"]')) return;

  // só aceita botão esquerdo (0) ou botão do meio (1)
  if (e.button !== 0 && e.button !== 1) return;

  e.preventDefault();

  const inicioX = e.clientX;
  const inicioY = e.clientY;
  const posInicial = { ...workspacePos };

  const mover = (evento: PointerEvent) => {
    const dx = evento.clientX - inicioX;
    const dy = evento.clientY - inicioY;

    setWorkspacePos({
      x: posInicial.x + dx,
      y: posInicial.y + dy,
    });
  };

  const parar = () => {
    window.removeEventListener('pointermove', mover);
    window.removeEventListener('pointerup', parar);
  };

  window.addEventListener('pointermove', mover);
  window.addEventListener('pointerup', parar);
}}
      >
<motion.div
  animate={{ x: workspacePos.x, y: workspacePos.y, scale: zoom }}
  className="grid grid-cols-5 gap-x-12 gap-y-20 px-40 min-w-max origin-top-left"
  style={{ transformOrigin: '0 0' }}
>
  {config.slides.map((slide, index) => (
    <motion.div
      key={slide.id}
      className="relative group shrink-0 slide-capture"
    >
      <Slide
        data={slide}
        branding={config.branding}
        aspectRatio={config.aspectRatio}
        index={index}
        totalSlides={config.slides.length}
        isGlobalBranding={config.isGlobalBranding}
        onUpdate={(updates) => {
          const newSlides = [...config.slides];
          newSlides[index] = { ...newSlides[index], ...updates };
          updateConfig({ slides: newSlides });
        }}
        onBrandingPositionChange={(pos) => {
          updateConfig({
            branding: { ...config.branding, handlePosition: pos }
          });
        }}
        onBrandingUpdate={(updates) => {
          updateConfig({
            branding: { ...config.branding, ...updates }
          });
        }}
        onEditingChange={setIsTextEditing}
      />
    </motion.div>
  ))}
</motion.div>
      </main>
    </div>
  );
}
