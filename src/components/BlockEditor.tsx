import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Type, 
  Image as ImageIcon, 
  Mic, 
  Video, 
  GripVertical, 
  X, 
  Bold, 
  Palette, 
  Highlighter,
  Trash2,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type BlockType = 'text' | 'image' | 'audio' | 'video';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
}

interface BlockEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}

const SIDEBAR_ITEMS = [
  { type: 'text', icon: <Type size={18} />, label: 'Text Block' },
  { type: 'image', icon: <ImageIcon size={18} />, label: 'Image' },
  { type: 'audio', icon: <Mic size={18} />, label: 'Voice/Audio' },
  { type: 'video', icon: <Video size={18} />, label: 'Video' },
] as const;

export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = blocks.findIndex((block) => block.id === active.id);
      const newIndex = blocks.findIndex((block) => block.id === over.id);
      onChange(arrayMove(blocks, oldIndex, newIndex));
    }
    
    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const addBlock = (type: BlockType) => {
    const newBlock: Block = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: type === 'text' ? '<p>New text block...</p>' : '',
    };
    onChange([...blocks, newBlock]);
  };

  const updateBlock = (id: string, content: string) => {
    onChange(blocks.map(b => b.id === id ? { ...b, content } : b));
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter(b => b.id !== id));
  };

  const activeBlock = activeId ? blocks.find(b => b.id === activeId) : null;

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[400px]">
      {/* Sidebar */}
      <div className="w-full md:w-56 shrink-0 space-y-4">
        <div className="p-4 bg-white rounded-2xl border border-foundation-300 shadow-sm">
          <p className="text-[10px] font-bold text-foundation-500 uppercase tracking-widest mb-4">Elements</p>
          <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
            {SIDEBAR_ITEMS.map((item) => (
              <button
                key={item.type}
                onClick={() => addBlock(item.type)}
                className="flex items-center gap-3 p-3 rounded-xl border border-foundation-200 hover:border-foundation-500 hover:bg-foundation-100 transition-all group text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-foundation-200 flex items-center justify-center text-foundation-600 group-hover:bg-foundation-900 group-hover:text-white transition-colors">
                  {item.icon}
                </div>
                <span className="text-xs font-bold text-foundation-800">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 italic text-[10px] text-indigo-700">
          Tip: Drag handles to reorder blocks. Select text to see styling options.
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 bg-white rounded-3xl border border-foundation-300 shadow-xl overflow-hidden flex flex-col min-h-[600px]">
        <div className="p-4 border-b border-foundation-200 bg-foundation-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foundation-500 uppercase tracking-widest">Story Canvas</span>
            {activeId && (
              <div className="px-2 py-0.5 bg-indigo-100 rounded-full text-[8px] font-bold text-indigo-600 uppercase animate-pulse">
                Moving Element
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] text-emerald-600 font-bold uppercase">Ready</span>
          </div>
        </div>

        <div className={cn(
          "flex-1 p-8 space-y-4 transition-colors duration-300",
          activeId && "bg-indigo-50/20"
        )}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={blocks.map(b => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <AnimatePresence initial={false}>
                {blocks.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center py-20 border-2 border-dashed border-foundation-200 rounded-3xl"
                  >
                    <div className="w-16 h-16 rounded-full bg-foundation-100 flex items-center justify-center text-foundation-300 mb-4">
                      <Plus size={32} />
                    </div>
                    <h3 className="text-foundation-900 font-bold mb-1">Your canvas is empty</h3>
                    <p className="text-xs text-foundation-500 max-w-[200px]">Drag or click elements from the sidebar to start building your story.</p>
                  </motion.div>
                ) : (
                  blocks.map((block) => (
                    <SortableBlock 
                      key={block.id} 
                      block={block} 
                      onUpdate={updateBlock} 
                      onRemove={removeBlock} 
                    />
                  ))
                )}
              </AnimatePresence>
            </SortableContext>
            
            <DragOverlay dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({
                styles: {
                  active: {
                    opacity: '0.4',
                  },
                },
              }),
            }}>
              {activeId && activeBlock ? (
                <div className="opacity-95 scale-[1.02] shadow-[0_20px_50px_rgba(99,102,241,0.2),0_10px_15px_rgba(0,0,0,0.1)] ring-2 ring-indigo-500 rounded-2xl border-2 border-indigo-400 bg-white pointer-events-none overflow-hidden">
                  <div className="p-1 px-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                    <span className="text-[8px] font-bold text-indigo-500 uppercase">Repositioning</span>
                    <GripVertical size={12} className="text-indigo-400" />
                  </div>
                  <BlockItem 
                    block={activeBlock} 
                    isOverlay 
                    onUpdate={() => {}} 
                    onRemove={() => {}} 
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </div>
  );
}

function SortableBlock({ block, onUpdate, onRemove }: { 
  block: Block, 
  onUpdate: (id: string, content: string) => void,
  onRemove: (id: string) => void,
  key?: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative transition-all duration-200",
        isDragging && "z-10"
      )}
    >
      {isDragging ? (
        <div className="h-20 w-full rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 flex items-center justify-center">
          <div className="flex items-center gap-2 text-indigo-300">
            <Plus size={16} className="animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Drop Here</span>
          </div>
        </div>
      ) : (
        <div className={cn(
          "bg-white border rounded-2xl shadow-sm transition-all duration-200",
          "border-foundation-200 hover:border-foundation-400"
        )}>
          <BlockItem 
            block={block} 
            attributes={attributes} 
            listeners={listeners} 
            onUpdate={onUpdate} 
            onRemove={onRemove} 
          />
        </div>
      )}
    </div>
  );
}

function BlockItem({ 
  block, 
  attributes, 
  listeners, 
  onUpdate, 
  onRemove,
  isOverlay = false
}: { 
  block: Block, 
  attributes?: any, 
  listeners?: any, 
  onUpdate: (id: string, content: string) => void,
  onRemove: (id: string) => void,
  isOverlay?: boolean
}) {
  return (
    <div className={cn("flex gap-3 p-2", isOverlay && "p-4")}>
      <div 
        {...attributes} 
        {...listeners}
        className={cn(
          "shrink-0 w-8 flex flex-col items-center pt-2 transition-colors",
          isOverlay ? "text-indigo-600" : "cursor-grab active:cursor-grabbing text-foundation-300 hover:text-foundation-900"
        )}
      >
        <GripVertical size={16} />
      </div>
      
      <div className="flex-1 min-w-0 pr-10 py-2">
        {block.type === 'text' && (
          <TextBlock 
            content={block.content} 
            onChange={(html) => onUpdate(block.id, html)} 
            disabled={isOverlay}
          />
        )}
        {block.type === 'image' && (
          <MediaBlock 
            type="image" 
            url={block.content} 
            onChange={(url) => onUpdate(block.id, url)} 
            placeholder="Paste Image URL or Upload File" 
            disabled={isOverlay}
          />
        )}
        {block.type === 'audio' && (
          <MediaBlock 
            type="audio" 
            url={block.content} 
            onChange={(url) => onUpdate(block.id, url)} 
            placeholder="Paste Audio URL or Upload File" 
            disabled={isOverlay}
          />
        )}
        {block.type === 'video' && (
          <MediaBlock 
            type="video" 
            url={block.content} 
            onChange={(url) => onUpdate(block.id, url)} 
            placeholder="Paste Video URL or Upload File" 
            disabled={isOverlay}
          />
        )}
      </div>

      {!isOverlay && (
        <button 
          onClick={() => onRemove(block.id)}
          className="absolute top-2 right-2 p-2 text-foundation-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

function TextBlock({ content, onChange, disabled }: { content: string, onChange: (html: string) => void, disabled?: boolean }) {
  const editableRef = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });

  const handleInput = () => {
    if (editableRef.current && !disabled) {
      onChange(editableRef.current.innerHTML);
    }
  };

  const handleMouseUp = () => {
    if (disabled) return;
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const parentRect = editableRef.current?.getBoundingClientRect();
      
      if (parentRect) {
        setToolbarPos({
          top: rect.top - parentRect.top - 45,
          left: rect.left - parentRect.left + (rect.width / 2) - 80
        });
        setShowToolbar(true);
      }
    } else {
      setShowToolbar(false);
    }
  };

  const applyStyle = (command: string, value?: string) => {
    if (disabled) return;
    document.execCommand(command, false, value);
    handleInput();
  };

  return (
    <div className="relative">
      <div
        ref={editableRef}
        contentEditable={!disabled}
        dangerouslySetInnerHTML={{ __html: content }}
        onInput={handleInput}
        onMouseUp={handleMouseUp}
        onKeyUp={handleMouseUp}
        className={cn(
          "outline-none min-h-[1.5em] text-sm leading-relaxed text-foundation-900 rich-content",
          disabled && "cursor-default select-none opacity-80"
        )}
      />

      <AnimatePresence>
        {showToolbar && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            style={{ 
              position: 'absolute', 
              top: toolbarPos.top, 
              left: Math.max(10, Math.min(toolbarPos.left, (editableRef.current?.offsetWidth || 0) - 260)),
              zIndex: 100 
            }}
            className="flex items-center gap-1 p-1 bg-foundation-900 text-white rounded-xl shadow-2xl border border-white/10 no-drag"
          >
            <ToolbarButton onClick={() => applyStyle('bold')} title="Bold"><Bold size={14} /></ToolbarButton>
            <ToolbarButton onClick={() => applyStyle('italic')} title="Italic"><Type size={14} className="italic" /></ToolbarButton>
            
            <div className="w-px h-4 bg-white/20 mx-1" />
            
            <div className="flex items-center">
              <ToolbarButton onClick={() => applyStyle('foreColor', '#FF3B30')}><div className="w-3 h-3 rounded-full bg-red-500" /></ToolbarButton>
              <ToolbarButton onClick={() => applyStyle('foreColor', '#007AFF')}><div className="w-3 h-3 rounded-full bg-blue-500" /></ToolbarButton>
              <ToolbarButton onClick={() => applyStyle('foreColor', '#34C759')}><div className="w-3 h-3 rounded-full bg-green-500" /></ToolbarButton>
              <ToolbarButton onClick={() => applyStyle('foreColor', '#000000')}><div className="w-3 h-3 rounded-full bg-white" /></ToolbarButton>
            </div>

            <div className="w-px h-4 bg-white/20 mx-1" />

            <div className="flex items-center">
              <ToolbarButton onClick={() => applyStyle('hiliteColor', '#FFE600')} title="Yellow Highlight"><Highlighter size={14} className="text-yellow-400" /></ToolbarButton>
              <ToolbarButton onClick={() => applyStyle('hiliteColor', '#00FF00')} title="Green Highlight"><Highlighter size={14} className="text-green-400" /></ToolbarButton>
              <ToolbarButton onClick={() => applyStyle('hiliteColor', 'transparent')} title="Clear Highlight"><X size={10} /></ToolbarButton>
            </div>
            
            <div className="w-px h-4 bg-white/20 mx-1" />

            <ToolbarButton onClick={() => applyStyle('formatBlock', 'h2')} title="Heading 2"><span className="text-[10px] font-bold">H2</span></ToolbarButton>
            <ToolbarButton onClick={() => applyStyle('formatBlock', 'h3')} title="Heading 3"><span className="text-[10px] font-bold">H3</span></ToolbarButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToolbarButton({ children, onClick, title }: { children: React.ReactNode, onClick: () => void, title?: string }) {
  return (
    <button 
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent shadow domain losing focus
        onClick();
      }}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
    >
      {children}
    </button>
  );
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Quality 0.7 is a good balance for web
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedDataUrl);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

function MediaBlock({ type, url, onChange, placeholder, disabled }: { 
  type: BlockType, 
  url: string, 
  onChange: (url: string) => void,
  placeholder: string,
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(!url && !disabled);
  const [mode, setMode] = useState<'link' | 'upload'>('link');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    // Hard limit for Firestore documents is 1MB total. 
    // Base64 adds ~33% overhead. So we limit files to ~800KB.
    const LIMIT_BYTES = 800 * 1024; 
    const sizeInKB = Math.round(file.size / 1024);

    if (type === 'image') {
      setIsProcessing(true);
      try {
        const compressed = await compressImage(file);
        // Base64 length is roughly 4/3 of the byte size
        const estimatedSize = compressed.length * 0.75;
        
        if (estimatedSize > LIMIT_BYTES) {
          setError(`Image is still too large (${Math.round(estimatedSize / 1024)}KB) after compression. Please try a smaller image.`);
          setIsProcessing(false);
          return;
        }
        onChange(compressed);
        setEditing(false);
      } catch (err) {
        console.error("Compression failed", err);
        setError("Failed to process image.");
      } finally {
        setIsProcessing(false);
      }
    } else {
      if (file.size > LIMIT_BYTES) {
        setError(`File is too large (${sizeInKB}KB). Max allowed is 800KB. Use a Link/Embed instead for larger files.`);
        return;
      }
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result as string);
        setEditing(false);
        setIsProcessing(false);
      };
      reader.onerror = () => {
        setError("Failed to read file.");
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const isDataUrl = url?.startsWith('data:');

  return (
    <div className="space-y-2">
      {editing && !disabled ? (
        <div className="bg-foundation-50 p-5 rounded-2xl border border-foundation-200">
          <div className="flex gap-2 p-1 bg-foundation-200/50 rounded-xl mb-5 w-fit mx-auto">
            <button 
              onClick={() => { setMode('link'); setError(null); }}
              className={cn("px-5 py-2 text-[10px] font-bold rounded-lg transition-all", mode === 'link' ? "bg-white shadow-sm text-foundation-900" : "text-foundation-500")}
            > Link / Embed </button>
            <button 
              onClick={() => { setMode('upload'); setError(null); }}
              className={cn("px-5 py-2 text-[10px] font-bold rounded-lg transition-all", mode === 'upload' ? "bg-white shadow-sm text-foundation-900" : "text-foundation-500")}
            > Local Upload </button>
          </div>

          {mode === 'link' ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input 
                  autoFocus
                  className="flex-1 p-3 text-xs bg-white rounded-xl border border-foundation-200 outline-none focus:border-foundation-900 shadow-sm transition-all font-mono"
                  placeholder={placeholder}
                  value={url || ''}
                  onChange={(e) => { onChange(e.target.value); setError(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && url && setEditing(false)}
                />
                <button 
                  onClick={() => url && setEditing(false)}
                  className="bg-foundation-900 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-black transition-colors shadow-md active:scale-95"
                  disabled={!url}
                > Set </button>
              </div>
              <p className="text-[9px] text-foundation-400 italic">Supports YouTube, Vimeo, and direct file URLs.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div 
                className={cn(
                  "flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-2xl transition-all cursor-pointer group relative overflow-hidden",
                  error ? "border-red-200 bg-red-50/30" : "border-foundation-200 hover:border-indigo-400 hover:bg-indigo-50/30",
                  isProcessing && "pointer-events-none"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                {isProcessing && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center z-20">
                    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest animate-pulse">
                      {type === 'image' ? 'Optimizing Image...' : 'Processing File...'}
                    </p>
                  </div>
                )}
                
                <input 
                  ref={fileInputRef}
                  type="file" 
                  className="hidden" 
                  accept={type === 'image' ? 'image/*' : type === 'video' ? 'video/*' : 'audio/*'} 
                  onChange={handleFileUpload} 
                />
                
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-colors mb-4",
                  error ? "bg-red-100 text-red-500" : "bg-foundation-100 text-foundation-400 group-hover:bg-indigo-100 group-hover:text-indigo-600"
                )}>
                  {error ? <X size={24} /> : <Plus size={24} />}
                </div>
                
                <div className="text-center">
                  <p className="text-xs font-bold text-foundation-900 uppercase tracking-widest">
                    {error ? 'Try Another File' : `Choose ${type}`}
                  </p>
                  <p className="text-[9px] text-foundation-400 mt-2">
                    Click to browse storage
                  </p>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600">
                  <X size={14} className="shrink-0" />
                  <p className="text-[10px] font-medium leading-tight">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-xl border border-foundation-200">
                  <p className="text-[8px] font-bold text-foundation-400 uppercase tracking-widest mb-1">Max Size</p>
                  <p className="text-xs font-bold text-foundation-900">800 KB</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-foundation-200">
                  <p className="text-[8px] font-bold text-foundation-400 uppercase tracking-widest mb-1">File Type</p>
                  <p className="text-xs font-bold text-foundation-900 uppercase">{type}</p>
                </div>
              </div>
              
              <p className="text-[9px] text-foundation-400 text-center px-4">
                Images are automatically compressed to fit database limits. Other files must be under the limit.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div 
          onClick={() => !disabled && setEditing(true)}
          className={cn(
            "group relative overflow-hidden rounded-2xl border border-foundation-200 bg-black/5",
            !disabled && "cursor-pointer"
          )}
        >
          {url ? (
            <>
              {!disabled && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold z-10 backdrop-blur-[2px]">
                  Click to Replace {type}
                </div>
              )}
              {type === 'image' && <img src={url} alt="" className="w-full aspect-video object-cover" />}
              {type === 'audio' && (
                <div className="p-6 bg-white flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-foundation-900 flex items-center justify-center text-white">
                      <Mic size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-foundation-900 truncate">
                        {isDataUrl ? 'Uploaded Voice Note' : 'Audio Stream'}
                      </p>
                      <p className="text-[8px] text-foundation-400 truncate mt-0.5">{url}</p>
                    </div>
                  </div>
                  <audio src={url} controls className="w-full h-8" />
                </div>
              )}
              {type === 'video' && (
                <div className="aspect-video bg-black flex items-center justify-center text-white">
                  {isDataUrl ? (
                    <video src={url} className="w-full h-full" controls={!disabled} />
                  ) : (
                    <iframe 
                      src={url.includes('youtube.com') ? url.replace('watch?v=', 'embed/') : url} 
                      className="w-full h-full border-0" 
                      allowFullScreen 
                    />
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center bg-foundation-50 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-foundation-100 flex items-center justify-center text-foundation-300 mb-3">
                {type === 'image' && <ImageIcon size={24} />}
                {type === 'audio' && <Mic size={24} />}
                {type === 'video' && <Video size={24} />}
              </div>
              <p className="text-[10px] font-bold text-foundation-400 uppercase tracking-widest">No {type} content</p>
              {!disabled && <p className="text-[8px] text-foundation-300 mt-1 uppercase">Click to add</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
