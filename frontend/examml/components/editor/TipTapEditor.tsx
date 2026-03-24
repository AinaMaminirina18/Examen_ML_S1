import { useEffect, useState } from "react";
import { EditorContent, type Editor } from "@tiptap/react";
import { EditorToolbar } from "./EditorToolbar";
import { mlAPI } from "@/services/ml-api";
import { BookOpen, Loader2 } from "lucide-react";

interface TipTapEditorProps {
  editor: Editor | null;
}

interface ContextMenuData {
  top: number;
  left: number;
  word: string;
  translation?: string;
  loading: boolean;
}

export function TipTapEditor({ editor }: TipTapEditorProps) {
  const [suggestion, setSuggestion] = useState<{ word: string, suffix: string } | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null);

  // Close context menu on external click or escape
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setContextMenu(null); };
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  useEffect(() => {
    if (!editor) return;

    const updateSuggestion = async () => {
      const { state, view } = editor;
      if (!state.selection.empty) {
        setSuggestion(null);
        return;
      }

      const $pos = state.selection.$anchor;
      const textBefore = $pos.parent.textBetween(Math.max(0, $pos.parentOffset - 20), $pos.parentOffset, null, '\n');
      const match = textBefore.match(/([a-zA-Z]+)$/);
      
      if (match && match[1].length >= 2) {
        const word = match[1];
        try {
          const res = await mlAPI.getAutocomplete(word);
          if (res.suggestions.length > 0) {
            const best = res.suggestions[0].word;
            if (best.toLowerCase().startsWith(word.toLowerCase()) && best.length > word.length) {
              const suffix = best.substring(word.length);
              setSuggestion({ word, suffix });
              const { top, left } = view.coordsAtPos(state.selection.from);
              setCoords({ top, left });
            } else {
              setSuggestion(null);
            }
          } else {
            setSuggestion(null);
          }
        } catch (e) {
          setSuggestion(null);
        }
      } else {
        setSuggestion(null);
      }
    };

    let debounceTimer: ReturnType<typeof setTimeout>;
    const handleTransaction = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(updateSuggestion, 150);
    };

    editor.on('transaction', handleTransaction);
    return () => { editor.off('transaction', handleTransaction); clearTimeout(debounceTimer); };
  }, [editor]);

  useEffect(() => {
    if (!suggestion || !editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        editor.commands.insertContent(suggestion.suffix);
        setSuggestion(null);
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        setSuggestion(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [suggestion, editor]);

  const handleContextMenu = async (e: React.MouseEvent) => {
    if (!editor) return;
    
    const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
    if (!pos) return;

    const $pos = editor.state.doc.resolve(pos.pos);
    const textBefore = $pos.parent.textBetween(Math.max(0, $pos.parentOffset - 25), $pos.parentOffset, null, '\n');
    const textAfter = $pos.parent.textBetween($pos.parentOffset, Math.min($pos.parent.nodeSize - 2, $pos.parentOffset + 25), null, '\n');
    
    // Find alphabetic word around cursor
    const matchBefore = textBefore.match(/([a-zA-Zà-üéèêîôû'’\-]+)$/);
    const matchAfter = textAfter.match(/^([a-zA-Zà-üéèêîôû'’\-]+)/);
    
    const wordBefore = matchBefore ? matchBefore[1] : '';
    const wordAfter = matchAfter ? matchAfter[1] : '';
    const clickedWord = wordBefore + wordAfter;

    if (clickedWord && clickedWord.trim().length > 0) {
      e.preventDefault(); // Only prevent default if we found a word
      e.stopPropagation();
      setContextMenu({ top: e.clientY, left: e.clientX, word: clickedWord, loading: true });
      
      try {
        const res = await fetch(`/api/translate?word=${encodeURIComponent(clickedWord)}`);
        if (res.ok) {
          const data = await res.json();
          setContextMenu(prev => prev ? { ...prev, loading: false, translation: data.translation } : null);
        } else {
          setContextMenu(prev => prev ? { ...prev, loading: false, translation: "Non trouvé dans le dictionnaire" } : null);
        }
      } catch (err) {
        setContextMenu(prev => prev ? { ...prev, loading: false, translation: "Erreur de connexion" } : null);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xl dark:shadow-2xl">
      <EditorToolbar editor={editor} />
      
      {/* Editor Content Area */}
      <div 
        className="flex-1 overflow-y-auto w-full p-4 sm:p-8 md:p-12 relative flex justify-center bg-neutral-100 dark:bg-[#0a0a0a]"
        onContextMenu={handleContextMenu}
      >
        
        {/* Autocompletion Ghost Text */}
        {suggestion && coords && (
          <div 
            className="fixed z-40 pointer-events-none px-2 py-1 flex items-center gap-1.5 rounded-md bg-blue-600 dark:bg-blue-500/90 text-white text-sm shadow-lg animate-in fade-in zoom-in duration-100"
            style={{ top: coords.top + 24, left: coords.left }}
          >
            <span className="opacity-90">{suggestion.word}<span className="font-bold opacity-100">{suggestion.suffix}</span></span>
            <span className="ml-1 text-[10px] uppercase font-bold tracking-wider opacity-80 bg-black/20 px-1 py-0.5 rounded">Tab</span>
          </div>
        )}

        {/* Translation Context Menu */}
        {contextMenu && (
          <div 
            className="fixed z-50 min-w-[200px] max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-lg p-3 animate-in fade-in zoom-in duration-150"
            style={{ 
              top: Math.min(contextMenu.top, window.innerHeight - 150), 
              left: Math.min(contextMenu.left, window.innerWidth - 250) 
            }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2 mb-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <BookOpen size={16} className="text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-neutral-900 dark:text-white text-sm truncate">
                {contextMenu.word}
              </span>
            </div>
            
            <div className="text-sm text-neutral-600 dark:text-neutral-300">
              {contextMenu.loading ? (
                <div className="flex items-center gap-2 py-1">
                  <Loader2 size={14} className="animate-spin text-neutral-400" />
                  <span className="text-neutral-400 italic">Recherche...</span>
                </div>
              ) : (
                <p className="leading-relaxed capitalize-first">
                  {contextMenu.translation}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="w-full max-w-3xl lg:max-w-4xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm dark:shadow-xl rounded-lg min-h-[800px] p-8 md:p-12 lg:p-16 relative">
          <EditorContent 
            editor={editor} 
            className="prose prose-neutral dark:prose-invert prose-blue max-w-none focus:outline-none min-h-full prose-headings:font-bold prose-p:leading-relaxed prose-a:text-blue-600 dark:prose-a:text-blue-400"
          />
        </div>
      </div>
    </div>
  );
}
