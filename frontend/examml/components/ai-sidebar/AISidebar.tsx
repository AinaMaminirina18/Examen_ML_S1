"use client";

import { useState } from "react";
import { Sparkles, Languages, CheckCircle, MessageSquare, GraduationCap, X } from "lucide-react";
import { AIWidgetCard } from "./AIWidgetCard";
import { MOCK_GRAMMAR_RULES } from "@/lib/mock-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { mlAPI, type CorrectionAnomaly } from "@/services/ml-api";
import { type Editor } from "@tiptap/react";

interface AISidebarProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
}

export function AISidebar({ isOpen, onClose, editor }: AISidebarProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [anomalies, setAnomalies] = useState<CorrectionAnomaly[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { role: "assistant", content: "Manao ahoana ! Azoko hanampiana anao ve ?" }
  ]);

  const handleAnalysis = async () => {
    if (!editor) return toast.error("Éditeur non initialisé");
    setIsAnalyzing(true);
    toast.info("Analyse du texte avec le modèle ML...");
    
    try {
      const text = editor.getText();
      if (!text.trim()) {
        toast.warning("Le document est vide.");
        return;
      }
      const result = await mlAPI.checkText(text);
      setAnomalies(result.corrections);
      if (result.corrections.length > 0) {
        toast.warning(`${result.corrections.length} correction(s) suggérée(s)`);
      } else {
        toast.success("Aucune faute détectée !");
      }
    } catch (e) {
      toast.error("Erreur serveur lors de l'analyse ML");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyCorrection = (anomaly: CorrectionAnomaly) => {
    if (!editor) return;
    // Approche simplifiée pour le MVP : on remplace la première occurrence avec une balise Tailwind colorée
    const oldHtml = editor.getHTML();
    const highlightSpan = `<span class="bg-green-500/20 text-green-700 dark:text-green-400 rounded px-1 transition-colors" data-ml-corrected="true">${anomaly.suggestion}</span>`;
    
    // Fallback simple search & replace
    const newHtml = oldHtml.replace(anomaly.original, highlightSpan);
    if (newHtml !== oldHtml) {
      editor.commands.setContent(newHtml);
      setAnomalies((prev) => prev.filter((a) => a.id !== anomaly.id));
      toast.success("Correction appliquée");
    } else {
      toast.error("Impossible de cibler ce mot dans l'éditeur riche");
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    setChatHistory([...chatHistory, { role: "user", content: chatMessage }]);
    setChatMessage("");
    
    setTimeout(() => {
       setChatHistory(prev => [...prev, { 
         role: "assistant", 
         content: "Tsara izany ! Tokony hasiana teny manentana kely ve eto amin'ny fehezanteny farany ?" 
       }]);
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <aside className="w-80 lg:w-96 flex-shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col h-[calc(100vh-4rem)] sticky top-16 right-0 overflow-hidden transform transition-all duration-300">
      
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <Sparkles size={20} />
          <h2 className="font-bold text-lg text-neutral-900 dark:text-white">Assistant IA</h2>
        </div>
        <button onClick={onClose} className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Spell Check Widget */}
        <AIWidgetCard 
          title="Correction du texte" 
          icon={<CheckCircle size={18} />}
          actionButton={
            <button 
              onClick={handleAnalysis}
              disabled={isAnalyzing}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded shadow-sm disabled:opacity-50 transition-colors"
            >
              {isAnalyzing ? "..." : "Analyser"}
            </button>
          }
        >
          {isAnalyzing ? (
            <div className="flex flex-col gap-2">
              <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
            </div>
          ) : anomalies.length === 0 ? (
            <div className="text-sm text-neutral-500 italic text-center py-2">
              Cliquez sur Analyser pour vérifier le texte actuel avec notre modèle ML.
            </div>
          ) : (
            <div className="space-y-3">
              {anomalies.map((item) => (
                <div key={item.id} className="bg-neutral-50 dark:bg-neutral-950 border border-red-200 dark:border-red-900/30 rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 italic">"{item.context}"</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-red-500 dark:text-red-400 font-medium line-through text-sm">{item.original}</span>
                      <span className="text-neutral-400 dark:text-neutral-500">→</span>
                      <span className="text-green-600 dark:text-green-400 font-medium text-sm">{item.suggestion}</span>
                    </div>
                    <button 
                      onClick={() => applyCorrection(item)}
                      className="text-xs bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 px-2 py-1 rounded text-neutral-700 dark:text-neutral-300 transition-colors"
                    >
                      Appliquer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AIWidgetCard>

        {/* Grammar / Linguistic Rules Widget */}
        <AIWidgetCard title="Règles Linguistiques" icon={<GraduationCap size={18} />} defaultOpen={false}>
          <div className="space-y-3">
            {MOCK_GRAMMAR_RULES.map((rule, idx) => (
              <div key={idx} className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider block mb-1">
                  Alert
                </span>
                <p className="text-sm font-medium text-white mb-1">{rule.issue}</p>
                <p className="text-xs text-neutral-400">{rule.description}</p>
              </div>
            ))}
          </div>
        </AIWidgetCard>

        {/* Lemmatization Widget */}
        <AIWidgetCard title="Lemmatisation" icon={<Languages size={18} />} defaultOpen={false}>
           <div className="flex gap-2 mb-3">
             <input type="text" placeholder="Entrez un mot..." className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" defaultValue="fanomezan-tsoa" />
             <button className="bg-neutral-800 hover:bg-neutral-700 px-3 rounded text-sm font-medium transition-colors">Chercher</button>
           </div>
           <div className="bg-neutral-950 border border-neutral-800 rounded p-3">
              <p className="text-xs text-neutral-500 mb-1">Racine identifiée :</p>
              <p className="font-mono text-blue-400 font-medium tracking-wide">ome</p>
              <div className="mt-2 text-xs text-neutral-400 bg-neutral-900 p-2 rounded">
                 Préfixe: <span className="text-emerald-400">fan-</span> <br/>
                 Suffixe: <span className="text-emerald-400">-zana</span>
              </div>
           </div>
        </AIWidgetCard>
        
        {/* Chatbot Widget */}
        <AIWidgetCard title="Assistant Chatbot" icon={<MessageSquare size={18} />}>
          <div className="flex flex-col h-64 bg-neutral-950 rounded-lg border border-neutral-800 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                    msg.role === 'user' ? "bg-blue-600 text-white" : "bg-neutral-800 text-neutral-200"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="border-t border-neutral-800 p-2 flex gap-2">
              <input 
                type="text" 
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Posez une question..."
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded flex items-center justify-center transition-colors">
                <MessageSquare size={14} />
              </button>
            </form>
          </div>
        </AIWidgetCard>

      </div>
    </aside>
  );
}
