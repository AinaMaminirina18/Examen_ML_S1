// Typages pour le backend ML (Bag of Words, N-grams, API Wiki)

export interface AutocompleteRequest {
  query: string; // Le mot ou fragment tapé (n-gram context for the future)
}

export interface AutocompleteResponse {
  query: string;
  suggestions: {
    word: string;
    score: number; // Probabilité issue du modèle ML
  }[];
}

export interface SpellCheckRequest {
  text: string; // Le texte complet ou la phrase cible
}

export interface CorrectionAnomaly {
  id: string;
  original: string;    // Le mot erroné identifié
  suggestion: string;  // La proposition du modèle ML
  context: string;     // La phrase avec le contexte pour l'affichage
  type: "spell" | "grammar" | "ngram_anomaly"; 
  confidence: number;  // Confiance du modèle (0-1)
}

export interface SpellCheckResponse {
  text: string;
  corrections: CorrectionAnomaly[];
}

/**
 * Service Mock pour simuler la communication avec l'API Backend ML
 * Ces fonctions pourront facilement être remplacées par de vrais appels fetch() plus tard.
 */
export const mlAPI = {
  
  // 1. Service d'autocomplétion (pour >= 2 lettres)
  async getAutocomplete(query: string): Promise<AutocompleteResponse> {
    // Simuler le délai réseau de l'API ML
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    const q = query.toLowerCase();
    let mockSuggestions: { word: string; score: number }[] = [];

    // Exemples mockés typiques (données d'apprentissage hypothétiques)
    if (q.startsWith("ma")) {
      mockSuggestions = [
        { word: "manao", score: 0.95 },
        { word: "manana", score: 0.82 },
        { word: "mandeha", score: 0.70 }
      ];
    } else if (q.startsWith("fi")) {
      mockSuggestions = [
        { word: "fianarana", score: 0.88 },
        { word: "fiainana", score: 0.85 },
      ];
    } else if (q.startsWith("ts")) {
      mockSuggestions = [
        { word: "tsara", score: 0.99 },
        { word: "tsy", score: 0.95 },
      ];
    }

    return {
      query,
      suggestions: mockSuggestions,
    };
  },

  // 2. Service de correction (Bag of Words / N-Grams)
  async checkText(text: string): Promise<SpellCheckResponse> {
    await new Promise((resolve) => setTimeout(resolve, 800)); // Plus long, analyse complète
    
    const anomalies: CorrectionAnomaly[] = [];
    const words = text.split(/[\s,.;!?]+/);

    // Mock arbitraire de détection de fautes courantes
    const mockErrors: Record<string, string> = {
      "akory": "Manao ahoana", // Suggestion n-gram contextuelle
      "tsr": "tsara",
      "hndry": "hiandry",
      "fianran": "fianarana"
    };

    words.forEach((w, index) => {
      const wLower = w.toLowerCase();
      if (mockErrors[wLower]) {
        // Obtenir un bout de contexte autour du mot
        const startCtx = Math.max(0, index - 2);
        const endCtx = Math.min(words.length, index + 3);
        const contextStr = words.slice(startCtx, endCtx).join(" ").replace(w, `[${w}]`);

        anomalies.push({
          id: `err_${Date.now()}_${index}`,
          original: w,
          suggestion: mockErrors[wLower],
          context: contextStr,
          type: "spell",
          confidence: 0.89
        });
      }
    });

    return {
      text,
      corrections: anomalies,
    };
  }
};
