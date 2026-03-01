import express from "express";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";
import dotenv from "dotenv";
import multer from "multer";

dotenv.config();

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // OpenAI Proxy Route
  app.post("/api/chat", async (req, res) => {
    const { messages } = req.body;
    
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY not configured on server." });
    }

    try {
      const openai = new OpenAI({ apiKey });
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // or gpt-4-turbo, etc.
        messages: messages,
      });

      res.json({ text: response.choices[0].message.content });
    } catch (error: any) {
      console.error("OpenAI Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate Reels Route
  app.post("/api/generate-reels", upload.single("video"), async (req, res) => {
    try {
      const { duration, prompt, theme, interactiveSubtitles } = req.body;
      const file = req.file; // We receive the file but we'll simulate processing for now

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "OPENAI_API_KEY not configured on server." });
      }

      const openai = new OpenAI({ apiKey });

      const systemPrompt = `Você é um especialista em edição de vídeos curtos (Reels/TikTok) e curadoria de conteúdo viral.
O usuário enviou um vídeo (simulado) com as seguintes preferências:
- Duração desejada por corte: ${duration}
- Tema: ${theme || 'Geral'}
- Instruções adicionais (prompt): ${prompt || 'Nenhuma'}
- Legendas dinâmicas: ${interactiveSubtitles === 'true' ? 'Sim' : 'Não'}

Gere 3 sugestões de cortes virais baseadas no tema e nas instruções do usuário.
Retorne APENAS um JSON válido no seguinte formato exato:
{
  "clips": [
    {
      "id": "1",
      "title": "Título chamativo do corte",
      "duration": "0:30",
      "score": 95,
      "description": "Descrição do que acontece no corte"
    }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Use mini for faster/cheaper JSON generation
        messages: [{ role: "system", content: systemPrompt }],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("Sem resposta do OpenAI");

      const parsed = JSON.parse(content);
      res.json(parsed);
    } catch (error: any) {
      console.error("Erro na API do OpenAI:", error);
      res.status(500).json({ error: error.message || "Erro ao processar o vídeo" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("index.html", { root: "dist" });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
