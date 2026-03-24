1. Appel de services/ml-api.ts par le front des APIs (ex: /api/autocomplete?q=ma)

Format attendu :
{
  "query": "ma",
  "suggestions": [
    { "word": "manao", "score": 0.95 },
    { "word": "manana", "score": 0.82 },
    { "word": "mandeha", "score": 0.70 }
  ]
}

2. Endpoint de Vérification Grammaticale/Orthographique (ex: POST /api/check) : 
Le frontend vous envoie le texte complet du document dans le body ({ "text": "..." }). Votre script Bag of Words détecte les incohérences ou les fautes de probabilité n-gram. Vous devez renvoyer ce tableau (empty [] s'il n'y a pas d'erreur) :

Format attendu : 
{
  "text": "Le texte tel que reçu...",
  "corrections": [
    {
      "id": "une-id-unique-pour-react",
      "original": "hndry",           // Le mot précis qui pose problème
      "suggestion": "hiandry",       // Ce que le modèle suggère
      "context": "Mety [hndry] aty", // Le contexte de la phrase (utile pour l'affichage UI)
      "type": "spell",               // "spell" (orthographe) ou "grammar" (règle n-gram)
      "confidence": 0.89             // Intéressant si vous voulez n'afficher que des alertes sûres à +80%
    }
  ]
}


