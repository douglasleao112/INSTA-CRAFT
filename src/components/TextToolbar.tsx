import React from 'react';
import { 
  Bold, 
  Italic,
  Underline,
  Strikethrough,
  AlignCenter, 
  AlignLeft,
  AlignRight,
  Baseline, 
  Highlighter, 
  ChevronDown,
  Type,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface TextToolbarProps {
  className?: string;
}

export const TextToolbar: React.FC<TextToolbarProps> = ({ className }) => {
  const [showFormatting, setShowFormatting] = React.useState(false);
  const [showAlignment, setShowAlignment] = React.useState(false);
  const [showFontSize, setShowFontSize] = React.useState(false);
  const [showTextColor, setShowTextColor] = React.useState(false);
  const [showHighlightColor, setShowHighlightColor] = React.useState(false);
  const textColorInputRef = React.useRef<HTMLInputElement>(null);
  const highlightColorInputRef = React.useRef<HTMLInputElement>(null);

  const exec = (command: string, value?: string) => {
    // Ensure we have a selection before executing
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    document.execCommand('styleWithCSS', false, "true");
    
    if (command === 'fontSize' && value) {
      // Convert 1-7 to actual pixels for better UX if needed, 
      // but execCommand fontSize only accepts 1-7.
      // To use pixels, we'd need to wrap in a span.
      // For now, let's stick to 1-7 but ensure it's applied correctly.
      document.execCommand(command, false, value);
    } else {
      document.execCommand(command, false, value);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex items-center bg-white border border-black/10 shadow-2xl rounded-2xl p-1.5 gap-1 z-[100]",
        className
      )}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing focus on click
    >
      {/* Font Selection */}
      <div className="relative group border-r border-black/5">
        <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-black/5 rounded-xl transition-colors">
          <span className="text-xs font-bold text-gray-700">Inter</span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>
        <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-black/10 shadow-xl rounded-xl hidden group-hover:block overflow-hidden z-50">
          {['Inter', 'Plus Jakarta Sans', 'Playfair Display', 'JetBrains Mono'].map(font => (
            <button 
              key={font}
              onClick={() => exec('fontName', font)}
              className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-black/5 transition-colors"
              style={{ fontFamily: font }}
            >
              {font}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size - Custom Dropdown */}
      <div className="relative border-r border-black/5">
        <button 
          onClick={() => setShowFontSize(!showFontSize)}
          className={cn(
            "flex items-center gap-1 px-3 py-1.5 hover:bg-black/5 rounded-xl transition-colors",
            showFontSize && "bg-black/5"
          )}
        >
          <Type className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-bold text-gray-700">32px</span>
          <ChevronDown className={cn("w-3 h-3 text-gray-400 transition-transform", showFontSize && "rotate-180")} />
        </button>
        <AnimatePresence>
          {showFontSize && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute top-full left-0 mt-2 w-20 bg-white border border-black/10 shadow-xl rounded-xl flex flex-col p-1 gap-1 z-50 overflow-hidden"
            >
              {[1, 2, 3, 4, 5, 6, 7].map(size => (
                <button
                  key={size}
                  onClick={() => {
                    exec('fontSize', size.toString());
                    setShowFontSize(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-gray-700 hover:bg-black/5 rounded-lg transition-colors"
                >
                  {size * 8}px
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Formatting Group - Dropdown */}
      <div className="relative border-r border-black/5">
        <button 
          onClick={() => setShowFormatting(!showFormatting)}
          className={cn(
            "flex items-center gap-1 px-3 py-1.5 hover:bg-black/5 rounded-xl transition-colors",
            showFormatting && "bg-black/5"
          )}
        >
          <span className="text-sm font-black italic line-through text-gray-700 leading-none select-none">B</span>
          <ChevronDown className={cn("w-3 h-3 text-gray-400 transition-transform", showFormatting && "rotate-180")} />
        </button>
        <AnimatePresence>
          {showFormatting && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute top-full left-0 mt-2 w-12 bg-white border border-black/10 shadow-xl rounded-xl flex flex-col items-center p-1 gap-1 z-50"
            >
              <ToolbarButton icon={Bold} onClick={() => { exec('bold'); setShowFormatting(false); }} />
              <ToolbarButton icon={Italic} onClick={() => { exec('italic'); setShowFormatting(false); }} />
              <ToolbarButton icon={Underline} onClick={() => { exec('underline'); setShowFormatting(false); }} />
              <ToolbarButton icon={Strikethrough} onClick={() => { exec('strikeThrough'); setShowFormatting(false); }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Alignment Group - Dropdown */}
      <div className="relative border-r border-black/5">
        <button 
          onClick={() => setShowAlignment(!showAlignment)}
          className={cn(
            "flex items-center gap-1 px-3 py-1.5 hover:bg-black/5 rounded-xl transition-colors",
            showAlignment && "bg-black/5"
          )}
        >
          <div className="flex flex-col gap-[3px] w-4 items-center py-1">
            <div className="h-[1.5px] w-full bg-gray-700 rounded-full" />
            <div className="h-[1.5px] w-2/3 bg-gray-700 rounded-full" />
            <div className="h-[1.5px] w-full bg-gray-700 rounded-full" />
          </div>
          <ChevronDown className={cn("w-3 h-3 text-gray-400 transition-transform", showAlignment && "rotate-180")} />
        </button>
        <AnimatePresence>
          {showAlignment && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute top-full left-0 mt-2 w-32 bg-white border border-black/10 shadow-xl rounded-xl flex flex-row justify-around p-1 gap-1 z-50"
            >
              <ToolbarButton icon={AlignLeft} onClick={() => { exec('justifyLeft'); setShowAlignment(false); }} />
              <ToolbarButton icon={AlignCenter} onClick={() => { exec('justifyCenter'); setShowAlignment(false); }} />
              <ToolbarButton icon={AlignRight} onClick={() => { exec('justifyRight'); setShowAlignment(false); }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Color Group */}
      <div className="flex items-center gap-0.5 px-1 border-r border-black/5">
        {/* Text Color */}
        <div className="relative">
          <ToolbarButton 
            icon={Baseline} 
            onClick={() => {
              setShowTextColor(!showTextColor);
              setShowHighlightColor(false);
            }} 
            active={showTextColor}
          />
          <AnimatePresence>
            {showTextColor && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute top-full left-0 mt-2 p-3 bg-white border border-black/10 shadow-2xl rounded-2xl w-48 z-50"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cores do Texto</span>
                    <button 
                      onClick={() => textColorInputRef.current?.click()}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700"
                    >
                      + Add custom
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {['#000000', '#4B5563', '#9CA3AF', '#FFFFFF', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#14B8A6', '#06B6D4', '#2DD4BF'].map(color => (
                      <button 
                        key={color}
                        onClick={() => {
                          exec('foreColor', color);
                          setShowTextColor(false);
                        }}
                        className="w-6 h-6 rounded-full border border-black/5 hover:scale-110 transition-transform shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <button 
                      onClick={() => textColorInputRef.current?.click()}
                      className="w-6 h-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      <Plus className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                </div>
                <input 
                  type="color" 
                  ref={textColorInputRef}
                  className="hidden"
                  onChange={(e) => {
                    exec('foreColor', e.target.value);
                    setShowTextColor(false);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Highlight Color */}
        <div className="relative">
          <ToolbarButton 
            icon={Highlighter} 
            onClick={() => {
              setShowHighlightColor(!showHighlightColor);
              setShowTextColor(false);
            }}
            active={showHighlightColor}
          />
          <AnimatePresence>
            {showHighlightColor && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute top-full left-0 mt-2 p-3 bg-white border border-black/10 shadow-2xl rounded-2xl w-48 z-50"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Destaque</span>
                    <button 
                      onClick={() => highlightColorInputRef.current?.click()}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700"
                    >
                      + Add custom
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {['#FFFF00', '#00FF00', '#00FFFF', '#FF00FF', '#FFA500', '#FFC0CB', '#E6E6FA', '#F0E68C', '#DDA0DD', '#98FB98', 'transparent'].map(color => (
                      <button 
                        key={color}
                        onClick={() => {
                          exec('hiliteColor', color);
                          setShowHighlightColor(false);
                        }}
                        className={cn(
                          "w-6 h-6 rounded-full border border-black/5 hover:scale-110 transition-transform shadow-sm",
                          color === 'transparent' && "bg-white relative after:absolute after:inset-0 after:bg-red-500 after:h-[1px] after:w-full after:top-1/2 after:-rotate-45"
                        )}
                        style={{ backgroundColor: color !== 'transparent' ? color : undefined }}
                      />
                    ))}
                    <button 
                      onClick={() => highlightColorInputRef.current?.click()}
                      className="w-6 h-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      <Plus className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                </div>
                <input 
                  type="color" 
                  ref={highlightColorInputRef}
                  className="hidden"
                  onChange={(e) => {
                    exec('hiliteColor', e.target.value);
                    setShowHighlightColor(false);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

const ToolbarButton = ({ icon: Icon, active, onClick }: { icon: any, active?: boolean, onClick?: (e: React.MouseEvent) => void }) => (
  <button 
    onClick={(e) => {
      e.preventDefault();
      onClick?.(e);
    }}
    className={cn(
      "p-2 rounded-xl transition-colors",
      active ? "bg-indigo-50 text-indigo-600" : "text-gray-600 hover:bg-black/5"
    )}
  >
    <Icon className="w-4 h-4" />
  </button>
);
