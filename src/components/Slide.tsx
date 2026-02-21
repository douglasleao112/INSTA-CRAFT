import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AspectRatio, Branding, SlideData, LayoutType, SignatureSlot } from '../types';
import { cn } from '../lib/utils';
import { BadgeCheck } from 'lucide-react';
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
  onUpdate?: (updates: Partial<SlideData>) => void;
  onBrandingPositionChange?: (pos: { x: number; y: number }) => void;
  onBrandingUpdate?: (updates: Partial<Branding>) => void;
  onEditingChange?: (isEditing: boolean) => void;
}

export const Slide: React.FC<SlideProps> = ({ 
  data, 
  branding, 
  aspectRatio, 
  index, 
  totalSlides,
  isGlobalBranding,
  onUpdate,
  onBrandingPositionChange,
  onBrandingUpdate,
  onEditingChange
}) => {
  const [activeElement, setActiveElement] = useState<'headline' | 'subheadline' | 'branding-name' | 'branding-handle' | null>(null);
  const [editingBrandingField, setEditingBrandingField] = useState<null | 'name' | 'handle'>(null);
  const [editingSlotKey, setEditingSlotKey] = useState<keyof Branding['signatures'] | null>(null);
  const [editingHeadline, setEditingHeadline] = useState(false);
  const [editingSubheadline, setEditingSubheadline] = useState(false);
  const [draftBrandingName, setDraftBrandingName] = useState(branding.name);
const [draftBrandingHandle, setDraftBrandingHandle] = useState(branding.handle);

useEffect(() => {
  setDraftBrandingName(branding.name);
}, [branding.name]);

useEffect(() => {
  setDraftBrandingHandle(branding.handle);
}, [branding.handle]);

const commitBrandingEdit = () => {
  const name = (draftBrandingName || '').trim();
  const handle = (draftBrandingHandle || '').trim();

  if (editingSlotKey) {
    onBrandingUpdate?.({
      signatures: {
        ...branding.signatures,
        [editingSlotKey]: {
          ...branding.signatures[editingSlotKey],
          name: editingBrandingField === 'name' ? name : branding.signatures[editingSlotKey].name,
          handle: editingBrandingField === 'handle' ? handle : branding.signatures[editingSlotKey].handle,
        }
      }
    });
  }

  // mantém rascunhos consistentes
  setDraftBrandingName(name);
  setDraftBrandingHandle(handle);

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
        className={cn(
          "absolute top-5 left-7 z-20 flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all",
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
                {isEditingThisSlot && editingBrandingField === 'name' ? (
                  <input
                    autoFocus
                    value={draftBrandingName}
                    onChange={(e) => setDraftBrandingName(e.target.value)}
                    onBlur={commitBrandingEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitBrandingEdit();
                      if (e.key === 'Escape') cancelBrandingEdit();
                    }}
                    className="text-[13px] font-bold leading-none rounded px-1 py-0.5 outline-none ring-1 ring-indigo-500/60 bg-white/80"
                    style={{ color: effectiveIsDark ? '#111827' : branding.primaryColor }}
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingSlotKey(slotKey);
                      setEditingBrandingField('name');
                      setDraftBrandingName(slot.name);
                      setDraftBrandingHandle(slot.handle);
                      onEditingChange?.(true);
                    }}
                    className="text-[10px] font-bold leading-none rounded px-1 -mx-1 hover:bg-white/5"
                    style={{ color: effectiveIsDark ? '#FFFFFF' : branding.primaryColor }}
                    title="Duplo clique para editar"
                  >
                    {slot.name}
                  </span>
                )}

                {slot.isVerified && (
                  <img 
                    src="https://img.icons8.com/color/512/instagram-verification-badge.png" 
                    className="w-2 h-2" 
                    alt="Verified" 
                  />
                )}
              </div>
           
              {isEditingThisSlot && editingBrandingField === 'handle' ? (
                <input
                  autoFocus
                  value={draftBrandingHandle}
                  onChange={(e) => setDraftBrandingHandle(e.target.value)}
                  onBlur={commitBrandingEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitBrandingEdit();
                    if (e.key === 'Escape') cancelBrandingEdit();
                  }}
                  className="text-[10px] font-medium rounded px-1 py-0.5 outline-none ring-1 ring-indigo-500/60 bg-white/80"
                  style={{ color: effectiveIsDark ? '#111827' : branding.secondaryColor }}
                />
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingSlotKey(slotKey);
                    setEditingBrandingField('handle');
                    setDraftBrandingName(slot.name);
                    setDraftBrandingHandle(slot.handle);
                    onEditingChange?.(true);
                  }}
                  className="text-[8px] font-medium opacity-60 rounded px-1 -mx-1 hover:bg-white/5"
                  style={{ color: effectiveIsDark ? 'rgba(255, 255, 255, 0.8)' : branding.secondaryColor }}
                  title="Duplo clique para editar"
                >
                  {slot.handle}
                </span>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span 
  className="text-[11px] font-semibold tracking-tight"
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
    // Só troca se não for layout full-bg (onde a imagem cobre tudo)
    // e se não estiver editando texto
    if (isFullBg || activeElement !== null) return;
    
    const currentBg = data.backgroundColor || branding.backgroundColor;
    const nextBg = currentBg === branding.backgroundColor 
      ? branding.alternativeBackgroundColor 
      : branding.backgroundColor;
    
    onUpdate?.({ backgroundColor: nextBg });
  };

  const renderLayout = () => {
    const headlineColor = effectiveIsDark ? '#FFFFFF' : branding.primaryColor;
    const subheadlineColor = effectiveIsDark ? 'rgba(255, 255, 255, 0.9)' : branding.secondaryColor;

    const headlineElement = (
      <h2 
        ref={headlineRef}
        contentEditable={editingHeadline}
        suppressContentEditableWarning
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setEditingHeadline(true);
          setActiveElement('headline');
          onEditingChange?.(true);
          // Focus after state update
          setTimeout(() => headlineRef.current?.focus(), 0);
        }}
        onBlur={(e) => {
          const text = e.currentTarget.innerText;
          handleTextChange('headline', text);
          setEditingHeadline(false);
          setTimeout(() => {
            setActiveElement(null);
            onEditingChange?.(false);
          }, 200);
        }}
        className={cn(
          "text-3xl font-extrabold leading-tight mb-4 outline-none transition-all rounded-lg px-2 -mx-2",
          editingHeadline ? "ring-2 ring-indigo-500/50 bg-indigo-50/10 cursor-text" : "hover:bg-white/5 cursor-default"
        )}
        style={{ 
          color: headlineColor,
          textShadow: isFullBg ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
        }}
        title="Duplo clique para editar"
      >
        {data.headline}
      </h2>
    );

    const subheadlineElement = (
      <p 
        ref={subheadlineRef}
        contentEditable={editingSubheadline}
        suppressContentEditableWarning
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setEditingSubheadline(true);
          setActiveElement('subheadline');
          onEditingChange?.(true);
          // Focus after state update
          setTimeout(() => subheadlineRef.current?.focus(), 0);
        }}
        onBlur={(e) => {
          const text = e.currentTarget.innerText;
          handleTextChange('subheadline', text);
          setEditingSubheadline(false);
          setTimeout(() => {
            setActiveElement(null);
            onEditingChange?.(false);
          }, 200);
        }}
        className={cn(
          "text-xl font-medium opacity-90 outline-none transition-all rounded-lg px-2 -mx-2",
          editingSubheadline ? "ring-2 ring-indigo-500/50 bg-indigo-50/10 cursor-text" : "hover:bg-white/5 cursor-default"
        )}
        style={{ 
          color: subheadlineColor,
          textShadow: isFullBg ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
        }}
        title="Duplo clique para editar"
      >
        {data.subheadline}
      </p>
    );

    switch (data.layout) {
      
case 'full-bg':
  return (
    <div
      className="relative w-full h-full overflow-hidden cursor-pointer"
      onClick={pickSlideImage}
      title="Clique para trocar a imagem"
    >
      {/* Imagem (se existir) */}
      {data.image ? (
        <img
          src={data.image}
          className="absolute inset-0 w-full h-full object-cover"
          alt=""
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 bg-black/5 flex items-center justify-center text-gray-300">
          Clique para adicionar imagem
        </div>
      )}

      {/* Overlay do hover (tela toda) */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-black/20 flex items-center justify-center z-10">
        <span className="text-white text-xs font-bold px-3 py-1 rounded-full bg-black/40">
          Trocar foto
        </span>
      </div>

      {/* Gradiente por cima da imagem */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-20 pointer-events-none" />

      {/* Texto em cima (continua editável) */}
      <div 
        className="absolute bottom-16 left-10 right-10 z-30"
        onClick={(e) => e.stopPropagation()}
      >
        {headlineElement}
        {subheadlineElement}
      </div>
    </div>
  );


case 'text-top-img-bottom':
  return (
    <div className="flex flex-col w-full h-full p-10 gap-8">
      <div className="flex-shrink-0 mt-10">
        {headlineElement}
        {subheadlineElement}
      </div>

      {/* 🔥 IMAGEM MENOR */}
<div className="h-[50%] overflow-hidden shadow-2xl" style={imgWrapStyle}>
  <div
    className="relative w-full h-full cursor-pointer"
    onClick={pickSlideImage}
    title="Clique para trocar a imagem"
  >
    {data.image ? (
     <img
  src={data.image}
  className="w-full h-full object-cover"
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
        Trocar foto
      </span>
    </div>
  </div>
</div>
    </div>
  );

      case 'img-top-text-bottom':
        return (
          <div className="flex flex-col w-full h-full p-10 gap-8">
                      
<div className="h-[50%] mt-10 overflow-hidden shadow-2xl" style={imgWrapStyle}>
  <div
    className="relative w-full h-full cursor-pointer"
    onClick={pickSlideImage}
    title="Clique para trocar a imagem"
  >
    {data.image ? (
    <img
  src={data.image}
  className="w-full h-full object-cover"
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
        Trocar foto
      </span>
    </div>
  </div>
</div>
           <div className="flex-shrink-0">
              {headlineElement}
              {subheadlineElement}
            </div>
          </div>
        );

      case 'img-right-text-left':
        return (
          <div className="flex w-full h-full p-10 gap-8">
            <div className="flex-1 mt-10 flex flex-col justify-center">
              {headlineElement}
              {subheadlineElement}
            </div>
<div className="flex-1 overflow-hidden shadow-2xl" style={imgWrapStyle}>
  <div
    className="relative w-full h-full cursor-pointer"
    onClick={pickSlideImage}
    title="Clique para trocar a imagem"
  >
    {data.image ? (
<img
  src={data.image}
  className="w-full h-full object-cover"
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
        Trocar foto
      </span>
    </div>
  </div>
</div>
          </div>
        );
case 'headline-img-subheadline':
  return (
    <div className="flex flex-col w-full h-full p-10 gap-6">
      
    
      <div className="text-left mt-10">
        {headlineElement}
      </div>

<div className="h-[50%] overflow-hidden shadow-2xl" style={imgWrapStyle}>
  <div
    className="relative w-full h-full cursor-pointer"
    onClick={pickSlideImage}
    title="Clique para trocar a imagem"
  >
    {data.image ? (
   <img
  src={data.image}
  className="w-full h-full object-cover"
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
        Trocar foto
      </span>
    </div>
  </div>
</div>
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
        "relative overflow-hidden transition-all",
        getAspectRatioClass(),
        isFullBg ? "border-none shadow-none" : "shadow-2xl border border-black/5"
      )}
      onClick={toggleBackgroundColor}
      style={{ 
        backgroundColor: slideBg,
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
      
      {/* Signature Slots */}
      {(Object.entries(branding.signatures) as [keyof Branding['signatures'], SignatureSlot][]).map(([key, slot]) => 
        renderSignature(key, slot)
      )}

      </div>

      {/* Layout Switcher - Outside and Smaller */}
      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 z-40 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0 flex gap-1.5 bg-white/95 backdrop-blur-sm p-1.5 rounded-xl shadow-xl border border-black/5">
        {LAYOUTS.map((layout) => (
          <button
            key={layout.type}
            onClick={(e) => {
              e.stopPropagation();
              onUpdate?.({ layout: layout.type });
            }}
            className={cn(
              "w-8 h-8 rounded-lg border-2 transition-all flex flex-col items-center justify-center p-1 group/btn",
              data.layout === layout.type 
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
              {layout.type === 'headline-img-subheadline' && (
                <>
                  <div className="w-full h-0.5 bg-slate-400 rounded-full" />
                  <div className="w-full flex-1 bg-slate-200 rounded-sm my-0.5" />
                  <div className="w-full h-0.5 bg-slate-300 rounded-full" />
                </>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
