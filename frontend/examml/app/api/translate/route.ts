import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import readline from "readline";
import { Readable } from "stream";

// Lien direct pour le téléchargement brut depuis Google Drive
const GOOGLE_DRIVE_CSV_URL = "https://docs.google.com/uc?export=download&id=1ZsqJzOlS0UocjPud-g1t-ghWtsvV3fT2";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const word = searchParams.get("word");

  if (!word) {
    return NextResponse.json({ error: "No word provided" }, { status: 400 });
  }

  const searchWord = word.trim().toLowerCase();
  let translation = null;

  try {
    let inputStream: any;

    // Detection de l'environnement : Production (Vercel) vs Local
    const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

    if (isProd) {
      console.log(`Translation: Running in production mode, fetching ${searchWord} from Drive...`);
      const response = await fetch(GOOGLE_DRIVE_CSV_URL);
      
      if (!response.ok) {
        throw new Error(`Google Drive fetch failed: ${response.status} ${response.statusText}`);
      }
      
      if (!response.body) {
        throw new Error("Google Drive response body is empty");
      }

      // Utilisation de Readable.fromWeb pour convertir proprement le Web Stream en Node Stream
      inputStream = Readable.fromWeb(response.body as any);
    } else {
      console.log("Translation: Running in local mode, reading from disk...");
      
      const pathsToTry = [
        path.resolve(process.cwd(), "..", "..", "data", "Datasetvrai.csv"),
        path.resolve(process.cwd(), "data", "Datasetvrai.csv"),
        "D:\\DossierM2\\ML_S1\\examen\\data\\Datasetvrai.csv"
      ];

      let csvPath = "";
      for (const p of pathsToTry) {
        if (fs.existsSync(p)) {
          csvPath = p;
          break;
        }
      }
      
      if (!csvPath) {
        throw new Error(`Dictionnaire local introuvable. Chemins testés : ${pathsToTry.join(", ")}`);
      }
      
      inputStream = fs.createReadStream(csvPath);
    }

    const rl = readline.createInterface({
      input: inputStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const columns = line.split(',');
      if (columns.length > 0 && columns[0].toLowerCase() === searchWord) {
        let translatedTextStr = columns[8];
        if (translatedTextStr?.startsWith('"')) {
          const startIdx = line.indexOf('"');
          const endIdx = line.indexOf('"', startIdx + 1);
          if (startIdx !== -1 && endIdx !== -1) {
            translatedTextStr = line.substring(startIdx + 1, endIdx);
          }
        }
        translation = translatedTextStr || columns[3] || "Traduction non définie";
        break;
      }
    }

    if (translation) {
      return NextResponse.json({ word, translation });
    } else {
      return NextResponse.json({ word, translation: "Non trouvé dans le dictionnaire" }, { status: 404 });
    }
  } catch (err: any) {
    console.error("Translation API Error:", err);
    return NextResponse.json({ 
      error: "Erreur serveur lors de la traduction", 
      message: err.message,
      // On n'inclut la stack qu'en développement (pour ne pas l'exposer en prod)
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    }, { status: 500 });
  }
}
