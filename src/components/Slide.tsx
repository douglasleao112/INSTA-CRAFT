import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AspectRatio, Branding, SlideData, LayoutType, SignatureSlot } from '../types';
import { cn } from '../lib/utils';
import { BadgeCheck, Trash2, Plus, X } from 'lucide-react';
import { TextToolbar } from './TextToolbar';

const LAYOUTS: { type: LayoutType; label: string }[] = [
  { type: 'full-bg', label: 'Fundo Total' },
  { type: 'text-top-img-bottom', label: 'Texto Topo' },
  { type: 'img-top-text-bottom', label: 'Imagem Topo' },
  { type: 'img-right-text-left', label: 'Imagem Lado' },
  { type: 'headline-img-subheadline', label: 'Misto' },
];

interface SlideProps {
  data: SlideData;
  branding: Branding;
  aspectRatio: AspectRatio;
  index: number;
  totalSlides: number;
  isGlobalBranding: boolean;
  presets: (SlideData | null)[];
  onSavePreset: (index: number, data: SlideData) => void;
  onDeletePreset: (index: number) => void;
  onUpdate?: (updates: Partial<SlideData>) => void;
  onBrandingUpdate?: (updates: Partial<Branding>) => void;
  onEditingChange?: (isEditing: boolean) => void;
}

export const Slide = React.memo<SlideProps>(({ 
  data, 
  branding, 
  aspectRatio, 
  index, 
  totalSlides,
  isGlobalBranding,
  presets,
  onSavePreset,
  onDeletePreset,
  onUpdate,
  onBrandingUpdate,
  onEditingChange
}) => {
  const [activePresetIndex, setActivePresetIndex] = useState<number | null>(null);
  const [activeElement, setActiveElement] = useState<'headline' | 'subheadline' | 'branding-name' | 'branding-handle' | null>(null);
  const [editingBrandingField, setEditingBrandingField] = useState<null | 'name' | 'handle'>(null);
  const [editingSlotKey, setEditingSlotKey] = useState<keyof Branding['signatures'] | null>(null);
  const [editingHeadline, setEditingHeadline] = useState(false);
  const [editingSubheadline, setEditingSubheadline] = useState(false);

const commitBrandingEdit = (value: string) => {
  if (editingSlotKey && editingBrandingField) {
    onBrandingUpdate?.({
      signatures: {
        ...branding.signatures,
        [editingSlotKey]: {
          ...branding.signatures[editingSlotKey],
          [editingBrandingField]: value
        }
      }
    });
  }

  setEditingBrandingField(null);
  setEditingSlotKey(null);
  onEditingChange?.(false);
};

const cancelBrandingEdit = () => {
  setEditingBrandingField(null);
  setEditingSlotKey(null);
  onEditingChange?.(false);
};
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subheadlineRef = useRef<HTMLParagraphElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const handleRef = useRef<HTMLSpanElement>(null);

 const imageInputRef = useRef<HTMLInputElement>(null);

  const pickSlideImage = () => {
    if (editingBrandingField !== null) return; // não atrapalhar edição do branding
    imageInputRef.current?.click();
  };

  const onSlideImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      onUpdate?.({ image: reader.result as string });
    };
    reader.readAsDataURL(file);

    // permite selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  const onBrandingPositionChangeInternal = (slotKey: keyof Branding['signatures'], pos: { x: number; y: number }) => {
    if (isGlobalBranding) {
      onBrandingUpdate?.({
        signatures: {
          ...branding.signatures,
          [slotKey]: { ...branding.signatures[slotKey], position: pos }
        }
      });
    } else {
      onUpdate?.({
        signaturePositions: {
          ...(data.signaturePositions || {}),
          [slotKey]: pos
        }
      });
    }
  };

  const getSlotPosition = (slotKey: keyof Branding['signatures']) => {
    if (isGlobalBranding) {
      return branding.signatures[slotKey].position;
    }
    return data.signaturePositions?.[slotKey] || branding.signatures[slotKey].position;
  };

  const renderSignature = (slotKey: keyof Branding['signatures'], slot: SignatureSlot) => {
    if (!slot.enabled) return null;
    const currentPos = getSlotPosition(slotKey);
    const isEditingThisSlot = editingSlotKey === slotKey;

    return (
      <motion.div 
        key={slotKey}
        drag={editingBrandingField === null}
        dragMomentum={false}
        initial={false}
        animate={{ x: currentPos.x, y: currentPos.y }}
        transition={{ duration: 0 }}
        onDragEnd={(_, info) => {
          const newPos = { 
            x: currentPos.x + info.offset.x, 
            y: currentPos.y + info.offset.y 
          };
          onBrandingPositionChangeInternal(slotKey, newPos);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        data-imageframe="true"
        className={cn(
          "absolute top-5 left-7 z-20 flex items-center gap-3 cursor-grab active:cursor-grabbing",
          slot.showFrame ? "p-2.5 border" : "p-0"
        )}
        style={{
          userSelect: editingBrandingField ? 'text' : 'none',
          backgroundColor: slot.showFrame 
            ? `${branding.container.backgroundColor}${Math.round((branding.container.opacity / 100) * 255).toString(16).padStart(2, '0')}` 
            : 'transparent',
          borderColor: slot.showFrame ? branding.container.borderColor : 'transparent',
          borderRadius: slot.showFrame ? `${branding.container.borderRadius}px` : '0px',
        }}
      >
        {slot.showAvatar && slot.type === 'text' && (
          <div 
            className="w-10 h-10 overflow-hidden flex-shrink-0 border" 
            style={{ 
              backgroundColor: branding.highlightColor,
              borderColor: slot.avatarBorderColor,
              borderWidth: `${slot.avatarBorderWidth}px`,
              borderRadius: `${slot.avatarBorderRadius}%`
            }}
          >
            {slot.avatar ? (
              <img src={slot.avatar} className="w-full h-full object-cover" alt="" />
            ) : (
              <span className="text-xs font-bold text-white flex items-center justify-center h-full">
                {slot.name.charAt(0)}
              </span>
            )}
          </div>
        )}
        <div className="flex flex-col">
          {slot.type === 'text' ? (
            <>
              <div className="flex items-center gap-1">
                <span
                  ref={nameRef}
                  contentEditable={isEditingThisSlot && editingBrandingField === 'name'}
                  suppressContentEditableWarning
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingSlotKey(slotKey);
                    setEditingBrandingField('name');
                    onEditingChange?.(true);
                    setTimeout(() => nameRef.current?.focus(), 0);
                  }}
                  onBlur={(e) => {
                    commitBrandingEdit(e.currentTarget.innerHTML);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitBrandingEdit(e.currentTarget.innerHTML);
                    }
                    if (e.key === 'Escape') cancelBrandingEdit();
                  }}
                  className={cn(
                    "text-[10px] font-bold leading-none rounded px-1 -mx-1 outline-none transition-all",
                    isEditingThisSlot && editingBrandingField === 'name' ? "ring-1 ring-indigo-500/60 bg-white/80" : "hover:bg-white/5"
                  )}
                  style={{ color: effectiveIsDark ? '#FFFFFF' : '#000000' }}
                  dangerouslySetInnerHTML={{ __html: slot.name }}
                  title="Duplo clique para editar"
                />

                {slot.isVerified && (
                  <img 
                    src="https://img.icons8.com/color/512/instagram-verification-badge.png" 
                    className="w-2 h-2" 
                    alt="Verified" 
                  />
                )}
              </div>
           
              <span
                ref={handleRef}
                contentEditable={isEditingThisSlot && editingBrandingField === 'handle'}
                suppressContentEditableWarning
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingSlotKey(slotKey);
                  setEditingBrandingField('handle');
                  onEditingChange?.(true);
                  setTimeout(() => handleRef.current?.focus(), 0);
                }}
                onBlur={(e) => {
                  commitBrandingEdit(e.currentTarget.innerHTML);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitBrandingEdit(e.currentTarget.innerHTML);
                  }
                  if (e.key === 'Escape') cancelBrandingEdit();
                }}
                className={cn(
                  "text-[8px] font-medium opacity-60 rounded px-1 -mx-1 outline-none transition-all",
                  isEditingThisSlot && editingBrandingField === 'handle' ? "ring-1 ring-indigo-500/60 bg-white/80" : "hover:bg-white/5"
                )}
                style={{ color: effectiveIsDark ? 'rgba(255, 255, 255, 0.8)' : '#4A4A4A' }}
                dangerouslySetInnerHTML={{ __html: slot.handle }}
                title="Duplo clique para editar"
              />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span 
  className="text-[9px] font-semibold tracking-tight"
  style={{ 
    color: effectiveIsDark ? '#FFFFFF' : branding.secondaryColor,
    opacity: 0.8
  }}
>
  {index + 1} <span className="opacity-40">/</span> {totalSlides}
</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case '1:1': return 'aspect-square';
      case '4:5': return 'aspect-[4/5]';
      case '9:16': return 'aspect-[9/16]';
      default: return 'aspect-square';
    }
  };

  const handleTextChange = (type: 'headline' | 'subheadline', value: string) => {
    if (onUpdate) {
      onUpdate({ [type]: value });
    }
  };

  const slideBg = data.backgroundColor || branding.backgroundColor;
  const isFullBg = data.layout === 'full-bg';

  const isAltBg = slideBg === branding.alternativeBackgroundColor;
  const isThirdBg = slideBg === branding.thirdBackgroundColor;
  const isMainBg = !isAltBg && !isThirdBg;

  const showVignette = 
    (isMainBg && branding.vignette) ||
    (isAltBg && branding.alternativeVignette) ||
    (isThirdBg && branding.thirdVignette);

  const isDarkBg = (color: string) => {
    const hex = color.replace('#', '');
    if (hex.length !== 6) return false;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  };

  const effectiveIsDark = isFullBg || isDarkBg(slideBg);

  // Radius dinâmico das imagens (não aplicar no full-bg por padrão)
  const imgRadius = isFullBg ? 0 : (branding.imageRadius ?? 0);

  const imgWrapStyle: React.CSSProperties = {
    borderRadius: `${imgRadius}px`,
  };

  const imgStyle: React.CSSProperties = {
    borderRadius: `${imgRadius}px`,
  };

const toggleBackgroundColor = (e: React.MouseEvent) => {
  if (isFullBg || activeElement !== null) return;

  const target = e.target as HTMLElement;

  // NÃO troca fundo se clicou em cima de área de imagem, textos, botões, ou qualquer coisa marcada como "image click"
  if (
    target.closest('[data-imageclick="true"]') ||
    target.closest('[data-imageframe="true"]') || // extra segurança, vc já usa
    target.closest('img') ||
    target.closest('h2') ||
    target.closest('p') ||
    target.closest('button') ||
    target.closest('input') ||
    target.closest('textarea')
  ) {
    return;
  }

  const currentBg = data.backgroundColor || branding.backgroundColor;
  let nextBg = branding.backgroundColor;
  
  if (currentBg === branding.backgroundColor) {
    nextBg = branding.alternativeBackgroundColor;
  } else if (currentBg === branding.alternativeBackgroundColor) {
    nextBg = branding.thirdBackgroundColor;
  } else {
    nextBg = branding.backgroundColor;
  }

  setActivePresetIndex(null);
  onUpdate?.({ backgroundColor: nextBg });
};

  const renderLayout = () => {
    const currentBg = data.backgroundColor || branding.backgroundColor;
    
    let headlineColor = branding.primaryColor;
    let subheadlineColor = branding.secondaryColor;

    if (isFullBg) {
      headlineColor = branding.alternativePrimaryColor;
      subheadlineColor = branding.alternativeSecondaryColor;
    } else if (currentBg === branding.alternativeBackgroundColor) {
      headlineColor = branding.alternativePrimaryColor;
      subheadlineColor = branding.alternativeSecondaryColor;
    } else if (currentBg === branding.thirdBackgroundColor) {
      headlineColor = branding.thirdPrimaryColor;
      subheadlineColor = branding.thirdSecondaryColor;
    } else {
      const isDark = isDarkBg(currentBg);
      headlineColor = isDark ? branding.alternativePrimaryColor : branding.primaryColor;
      subheadlineColor = isDark ? branding.alternativeSecondaryColor : branding.secondaryColor;
    }

    const hPos = data.headlinePos || { x: 0, y: 0 };
    const sPos = data.subheadlinePos || { x: 0, y: 0 };
    const iPos = data.imagePos || { x: 0, y: 0 };

    const headlineElement = (
      <motion.div
        drag={!editingHeadline}
        dragMomentum={false}
        animate={{ x: hPos.x, y: hPos.y }}
        onDragEnd={(_, info) => {
          setActivePresetIndex(null);
          onUpdate?.({ headlinePos: { x: hPos.x + info.offset.x, y: hPos.y + info.offset.y } });
        }}
        className="z-30"
        data-imageframe="true"
      >
        <h2 
          ref={headlineRef}
          contentEditable={editingHeadline}
          suppressContentEditableWarning
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditingHeadline(true);
            setActiveElement('headline');
            onEditingChange?.(true);
            // Focus after state update
            setTimeout(() => headlineRef.current?.focus(), 0);
          }}
          onBlur={(e) => {
            const html = e.currentTarget.innerHTML;
            handleTextChange('headline', html);
            setEditingHeadline(false);
            setTimeout(() => {
              setActiveElement(null);
              onEditingChange?.(false);
            }, 200);
          }}
          className={cn(
            "text-2xl font-extrabold leading-tight mb-4 outline-none rounded-lg px-2 -mx-2 cursor-grab active:cursor-grabbing",
            editingHeadline ? "ring-2 ring-indigo-500/50 bg-indigo-50/10 cursor-text" : "hover:bg-white/5"
          )}
          style={{ 
            color: headlineColor,
            textShadow: isFullBg ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
          }}
          dangerouslySetInnerHTML={{ __html: data.headline }}
          title="Arraste para mover | Duplo clique para editar"
        />
      </motion.div>
    );

    const subheadlineElement = (
      <motion.div
        drag={!editingSubheadline}
        dragMomentum={false}
        animate={{ x: sPos.x, y: sPos.y }}
        onDragEnd={(_, info) => {
          setActivePresetIndex(null);
          onUpdate?.({ subheadlinePos: { x: sPos.x + info.offset.x, y: sPos.y + info.offset.y } });
        }}
        className="z-30"
        data-imageframe="true"
      >
        <p 
          ref={subheadlineRef}
          contentEditable={editingSubheadline}
          suppressContentEditableWarning
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditingSubheadline(true);
            setActiveElement('subheadline');
            onEditingChange?.(true);
            // Focus after state update
            setTimeout(() => subheadlineRef.current?.focus(), 0);
          }}
          onBlur={(e) => {
            const html = e.currentTarget.innerHTML;
            handleTextChange('subheadline', html);
            setEditingSubheadline(false);
            setTimeout(() => {
              setActiveElement(null);
              onEditingChange?.(false);
            }, 200);
          }}
          className={cn(
            "text-lg font-medium opacity-90 outline-none rounded-lg px-2 -mx-2 cursor-grab active:cursor-grabbing",
            editingSubheadline ? "ring-2 ring-indigo-500/50 bg-indigo-50/10 cursor-text" : "hover:bg-white/5"
          )}
          style={{ 
            color: subheadlineColor,
            textShadow: isFullBg ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
          }}
          dangerouslySetInnerHTML={{ __html: data.subheadline }}
          title="Arraste para mover | Duplo clique para editar"
        />
      </motion.div>
    );

    switch (data.layout) {
      
case 'full-bg':
  return (
<div
  className="relative w-full h-full overflow-hidden cursor-pointer"
  data-imageclick="true"
  onDoubleClick={(e) => {
    e.stopPropagation();
    pickSlideImage();
  }}
  onClick={(e) => e.stopPropagation()} // evita o “piscar” por clique simples
  title="Duplo clique para trocar a imagem"
>
      {/* Imagem (se existir) */}
      {data.image ? (
        <motion.img
          drag
          dragMomentum={false}
          animate={{ x: iPos.x, y: iPos.y }}
          onDragEnd={(_, info) => {
            setActivePresetIndex(null);
            onUpdate?.({ imagePos: { x: iPos.x + info.offset.x, y: iPos.y + info.offset.y } });
          }}
          src={data.image}
          className="absolute inset-0 w-full h-full object-cover cursor-grab active:cursor-grabbing"
          alt=""
          draggable={false}
          data-imageframe="true"
        />
      ) : (
        <div className="absolute inset-0 bg-black/5 flex items-center justify-center text-gray-300">
          Clique para adicionar imagem
        </div>
      )}

      {/* Overlay do hover (tela toda) */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-black/20 flex items-center justify-center z-10">
        <span className="text-white text-xs font-bold px-3 py-1 rounded-full bg-black/40">
          Duplo clique para trocar
        </span>
      </div>

     {/* Gradiente por cima da imagem (mais escuro embaixo) */}
<div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent z-20 pointer-events-none" />

      {/* Texto em cima (continua editável) */}
    <div 
  className="absolute bottom-10 left-4 right-4 z-30"
  onClick={(e) => e.stopPropagation()}
>
        {headlineElement}
        {subheadlineElement}
      </div>
    </div>
  );


case 'text-top-img-bottom':
  return (
 <div className="flex flex-col w-full h-full px-6 py-8 gap-8">
      <div className="flex-shrink-0 mt-10">
        {headlineElement}
        {subheadlineElement}
      </div>

      {/* 🔥 IMAGEM MENOR */}
<motion.div 
  drag
  dragMomentum={false}
  animate={{ x: iPos.x, y: iPos.y }}
  onDragEnd={(_, info) => {
    setActivePresetIndex(null);
    onUpdate?.({ imagePos: { x: iPos.x + info.offset.x, y: iPos.y + info.offset.y } });
  }}
  className="h-[50%] overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing" 
  style={imgWrapStyle}
  data-imageframe="true"
>
  <div
    className="relative w-full h-full cursor-pointer"
onDoubleClick={(e) => {
  e.stopPropagation();
  pickSlideImage();
}}
      onClick={(e) => e.stopPropagation()} // evita clique simples cair no toggle do fundo
  title="Duplo clique para trocar"
  >
    {data.image ? (
     <img
  src={data.image}
  className="w-full h-full object-cover pointer-events-none"
  style={imgStyle}
  alt=""
  draggable={false}
/>
    ) : (
      <div className="w-full h-full bg-black/5 flex items-center justify-center text-gray-300">
        Clique para adicionar
      </div>
    )}

    <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-black/20 flex items-center justify-center" style={imgWrapStyle}>
      <span className="text-white text-xs font-bold px-3 py-1 rounded-full bg-black/40">
        Duplo clique para trocar
      </span>
    </div>
  </div>
</motion.div>
    </div>
  );

      case 'img-top-text-bottom':
       return (
  <div className="flex flex-col w-full h-full px-6 py-6 gap-8">
                    
    <motion.div 
      drag
      dragMomentum={false}
      animate={{ x: iPos.x, y: iPos.y }}
      onDragEnd={(_, info) => {
        setActivePresetIndex(null);
        onUpdate?.({ imagePos: { x: iPos.x + info.offset.x, y: iPos.y + info.offset.y } });
      }}
      className="h-[50%] mt-5 overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing" 
      style={imgWrapStyle}
      data-imageframe="true"
    >
  <div
    className="relative w-full h-full cursor-pointer"
onDoubleClick={(e) => {
  e.stopPropagation();
  pickSlideImage();
}}
      onClick={(e) => e.stopPropagation()} // evita clique simples cair no toggle do fundo
  title="Duplo clique para trocar a imagem"
  >
    {data.image ? (
    <img
  src={data.image}
  className="w-full h-full object-cover pointer-events-none"
  style={imgStyle}
  alt=""
  draggable={false}
/>
    ) : (
      <div className="w-full h-full bg-black/5 flex items-center justify-center text-gray-300">
        Clique para adicionar
      </div>
    )}

    <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-black/20 flex items-center justify-center" style={imgWrapStyle}>
      <span className="text-white text-xs font-bold px-3 py-1 rounded-full bg-black/40">
        Duplo clique para trocar
      </span>
    </div>
  </div>
</motion.div>
           <div className="flex-shrink-0">
              {headlineElement}
              {subheadlineElement}
            </div>
          </div>
        );

      case 'img-right-text-left':
        return (
          <div className="flex w-full h-full px-6 py-8 gap-8">
            <div className="flex-1 mt-10 flex flex-col justify-center">
              {headlineElement}
              {subheadlineElement}
            </div>
<motion.div 
  drag
  dragMomentum={false}
  animate={{ x: iPos.x, y: iPos.y }}
  onDragEnd={(_, info) => {
    setActivePresetIndex(null);
    onUpdate?.({ imagePos: { x: iPos.x + info.offset.x, y: iPos.y + info.offset.y } });
  }}
  className="flex-1 overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing" 
  style={imgWrapStyle}
  data-imageframe="true"
>
  <div
    className="relative w-full h-full cursor-pointer"
onDoubleClick={(e) => {
  e.stopPropagation();
  pickSlideImage();
}}
     onClick={(e) => e.stopPropagation()} // evita clique simples cair no toggle do fundo
  title="Duplo clique para trocar a imagem"
  >
    {data.image ? (
<img
  src={data.image}
  className="w-full h-full object-cover pointer-events-none"
  style={imgStyle}
  alt=""
  draggable={false}
/>
    ) : (
      <div className="w-full h-full bg-black/5 flex items-center justify-center text-gray-300">
        Clique para adicionar
      </div>
    )}

    {/* overlay opcional */}
    <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-black/20 flex items-center justify-center" style={imgWrapStyle}>
      <span className="text-white text-xs font-bold px-3 py-1 rounded-full bg-black/40">
        Duplo clique para trocar
      </span>
    </div>
  </div>
</motion.div>
          </div>
        );
case 'headline-img-subheadline':
  return (
    <div className="flex flex-col w-full h-full px-6 py-8 gap-8">
      
    
      <div className="text-left mt-10">
        {headlineElement}
      </div>

<motion.div 
  drag
  dragMomentum={false}
  animate={{ x: iPos.x, y: iPos.y }}
  onDragEnd={(_, info) => {
    setActivePresetIndex(null);
    onUpdate?.({ imagePos: { x: iPos.x + info.offset.x, y: iPos.y + info.offset.y } });
  }}
  className="h-[50%] overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing" 
  style={imgWrapStyle}
  data-imageframe="true"
>
  <div
    className="relative w-full h-full cursor-pointer"
onDoubleClick={(e) => {
  e.stopPropagation();
  pickSlideImage();
}}
    onClick={(e) => e.stopPropagation()} // evita clique simples cair no toggle do fundo
  title="Duplo clique para trocar a imagem"
  >
    {data.image ? (
   <img
  src={data.image}
  className="w-full h-full object-cover pointer-events-none"
  style={imgStyle}
  alt=""
  draggable={false}
/>
    ) : (
      <div className="w-full h-full bg-black/5 flex items-center justify-center text-gray-300">
        Clique para adicionar
      </div>
    )}

    <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-black/20 flex items-center justify-center" style={imgWrapStyle}>
      <span className="text-white text-xs font-bold px-3 py-1 rounded-full bg-black/40">
        Duplo clique para trocar
      </span>
    </div>
  </div>
</motion.div>
      <div className="text-left">
        {subheadlineElement}
      </div>
    </div>
  );

      default:
        return null;
    }
  }; 

  return (
    <div className="relative group shrink-0">
<div
  className={cn(
    "relative shadow-2xl overflow-hidden",
    getAspectRatioClass(),
    data.layout !== 'full-bg' && "cursor-pointer"
  )}
  onClick={toggleBackgroundColor}
  style={{
    backgroundColor: data.backgroundColor || branding.backgroundColor,
    width: aspectRatio === '9:16' ? '400px' : '450px'
  }} 
>

       <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onSlideImageSelected}
      />

      {renderLayout()}
      
      {showVignette && (
        <div className="absolute inset-0 pointer-events-none z-[25] bg-[radial-gradient(circle,transparent_40%,rgba(0,0,0,0.4)_100%)]" />
      )}

      {/* Signature Slots */}
      {(Object.entries(branding.signatures) as [keyof Branding['signatures'], SignatureSlot][]).map(([key, slot]) => 
        renderSignature(key, slot)
      )}

      </div>

    


    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 z-40 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0 flex flex-col items-center gap-3 w-auto">
  {/* CONTAINER ÚNICO: Layouts (esquerda) | Divisor | Presets (direita) */}
  <div className="inline-flex items-center bg-white/95 backdrop-blur-sm p-1.5 rounded-xl shadow-xl border border-black/5">

    {/* Layouts */}
    <div className="flex gap-1.5">
      {LAYOUTS.map((layout) => (
        <button
          key={layout.type}
          onClick={(e) => {
            e.stopPropagation();
            setActivePresetIndex(null);
            onUpdate?.({ 
              layout: layout.type,
              imagePos: { x: 0, y: 0 },
              headlinePos: { x: 0, y: 0 },
              subheadlinePos: { x: 0, y: 0 }
            });
          }}
          className={cn(
            "w-8 h-8 rounded-lg border-2 transition-all flex flex-col items-center justify-center p-1 group/btn",
            (data.layout === layout.type && activePresetIndex === null)
              ? "border-indigo-500 bg-indigo-50"
              : "border-transparent hover:bg-black/5"
          )}
          title={layout.label}
        >
          <div className="w-full h-full flex flex-col gap-0.5 overflow-hidden">
            {layout.type === 'full-bg' && (
              <div className="w-full h-full bg-slate-200 rounded-sm relative">
                <div className="absolute bottom-0.5 left-0.5 right-0.5 h-0.5 bg-slate-400 rounded-full" />
              </div>
            )}

            {layout.type === 'text-top-img-bottom' && (
              <>
                <div className="w-full h-0.5 bg-slate-400 rounded-full" />
                <div className="w-2/3 h-0.5 bg-slate-300 rounded-full" />
                <div className="w-full flex-1 bg-slate-200 rounded-sm mt-0.5" />
              </>
            )}

            {layout.type === 'headline-img-subheadline' && (
              <>
                <div className="w-full h-0.5 bg-slate-400 rounded-full" />
                <div className="w-full flex-1 bg-slate-200 rounded-sm my-0.5" />
                <div className="w-full h-0.5 bg-slate-300 rounded-full" />
              </>
            )}

            {layout.type === 'img-top-text-bottom' && (
              <>
                <div className="w-full flex-1 bg-slate-200 rounded-sm mb-0.5" />
                <div className="w-full h-0.5 bg-slate-400 rounded-full" />
                <div className="w-2/3 h-0.5 bg-slate-300 rounded-full" />
              </>
            )}

            {layout.type === 'img-right-text-left' && (
              <div className="flex gap-0.5 h-full w-full">
                <div className="flex-1 flex flex-col gap-0.5 justify-center">
                  <div className="w-full h-0.5 bg-slate-400 rounded-full" />
                  <div className="w-2/3 h-0.5 bg-slate-300 rounded-full" />
                </div>
                <div className="w-1/3 bg-slate-200 rounded-sm" />
              </div>
            )}

          </div>
        </button>
      ))}
    </div>

    {/* DIVISOR VERTICAL */}
    <div className="mx-2 h-7 w-px bg-black/10" />

  {/* PRESETS: números compactados + + no final com o mesmo gap */}
<div className="flex items-center gap-2">
  {presets.map((preset, i) => {
    if (!preset) return null;

    return (



<div key={i} className="relative w-8 h-8 group/preset">
  {/* Botão número */}
  <button
    onClick={(e) => {
      e.stopPropagation();
      setActivePresetIndex(i);
      onUpdate?.({
        layout: preset.layout,
        headlinePos: preset.headlinePos,
        subheadlinePos: preset.subheadlinePos,
        imagePos: preset.imagePos,
        backgroundColor: preset.backgroundColor,
      });
    }}
    className={cn(
      "w-8 h-8 rounded-lg flex items-center justify-center",
      "text-[14px] font-extrabold border-2 transition-all",
      activePresetIndex === i
        ? "border-indigo-500 bg-indigo-50 text-indigo-600 shadow-md"
        : "border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200"
    )}
    title="Aplicar Favorito"
  >
    {i + 1}
  </button>

  {/* Bolinha vermelha (aparece no hover do container) */}
  <button
    onClick={(e) => {
      e.stopPropagation();
      if (activePresetIndex === i) setActivePresetIndex(null);
      onDeletePreset(i);
    }}
    className={cn(
      "absolute -top-1 -right-1 z-50",
      "w-3 h-3 rounded-full bg-red-500",
      "flex items-center justify-center shadow-sm",
      "opacity-0 scale-75 pointer-events-none",
      "transition-all duration-150",
      "group-hover/preset:opacity-100 group-hover/preset:scale-100 group-hover/preset:pointer-events-auto",
      "group-focus-within/preset:opacity-100 group-focus-within/preset:scale-100 group-focus-within/preset:pointer-events-auto"
    )}
    title="Excluir Favorito"
  >
    <X className="w-2 h-2 text-white" />
  </button>
</div>


    );
  })}

  {/* BOTÃO + sempre no final (mesmo gap do último número) */}
  {presets.filter((p) => p !== null).length < 5 && (
    <button
      onClick={(e) => {
        e.stopPropagation();
        const firstEmptyIndex = presets.findIndex((p) => p === null);
        if (firstEmptyIndex !== -1) {
          setActivePresetIndex(firstEmptyIndex);
          onSavePreset(firstEmptyIndex, data);
        }
      }}
      className={cn(
        "w-8 h-8 rounded-lg border-2 border-dashed flex items-center justify-center",
        "text-gray-400 hover:text-indigo-500 hover:border-indigo-400 transition-all"
      )}
      title="Salvar como Favorito"
    >
      <Plus className="w-4 h-4" />
    </button>
  )}
</div>
  </div>
</div>
      






    </div>
  );
});
