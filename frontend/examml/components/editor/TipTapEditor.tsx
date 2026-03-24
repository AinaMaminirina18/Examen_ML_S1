import { useEffect, useState } from "react";
import { EditorContent, type Editor } from "@tiptap/react";
import { EditorToolbar } from "./EditorToolbar";
import { mlAPI } from "@/services/ml-api";

interface TipTapEditorProps {
  editor: Editor | null;
}

export function TipTapEditor({ editor }: TipTapEditorProps) {
  const [suggestion, setSuggestion] = useState<{ word: string, suffix: string } | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

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

  // Handle Tab to accept suggestion
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

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xl dark:shadow-2xl">
      <EditorToolbar editor={editor} />
      
      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto w-full p-4 sm:p-8 md:p-12 relative flex justify-center bg-neutral-100 dark:bg-[#0a0a0a]">
        
        {suggestion && coords && (
          <div 
            className="fixed z-50 pointer-events-none px-2 py-1 flex items-center gap-1.5 rounded-md bg-blue-600 dark:bg-blue-500/90 text-white text-sm shadow-lg animate-in fade-in zoom-in duration-100"
            style={{ top: coords.top + 24, left: coords.left }}
          >
            <span className="opacity-90">{suggestion.word}<span className="font-bold opacity-100">{suggestion.suffix}</span></span>
            <span className="ml-1 text-[10px] uppercase font-bold tracking-wider opacity-80 bg-black/20 px-1 py-0.5 rounded">Tab</span>
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
