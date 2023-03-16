import express, { Request, Response } from "express";
import cors from "cors";
import {
  ChatCompletionRequestMessage,
  CreateChatCompletionRequest,
  Configuration,
  OpenAIApi,
} from "openai";
import dotenv from "dotenv";
import bodyParser from "body-parser";

import GPT3TokenizerImport from "gpt3-tokenizer";

const GPT3Tokenizer: typeof GPT3TokenizerImport =
  typeof GPT3TokenizerImport === "function"
    ? GPT3TokenizerImport
    : (GPT3TokenizerImport as any).default;

const tokenizer = new GPT3Tokenizer({ type: "gpt3" });

export function getTokens(input: string): number {
  const tokens = tokenizer.encode(input);
  return tokens.text.length;
}
dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(
  cors({
    origin: "*",
  })
);

const port = 8000;

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

app.post("/api/chat", async (req: Request, res: Response) => {
  const requestMessages: ChatCompletionRequestMessage[] = req.body.messages;

  try {
    let tokenCount = 0;

    requestMessages.forEach((msg) => {
      const tokens = getTokens(msg.content);
      tokenCount += tokens;
    });

    const moderationResponse = await openai.createModeration({
      input: requestMessages[requestMessages.length - 1].content,
    });
    if (moderationResponse.data.results[0]?.flagged) {
      return res.status(400).send("Message is inappropriate");
    }

    const prompt = `Eres "Linda", el bot especializado en la organización de eventos de empresa:

    1. Abrir la conversación presentando Eventarte de forma amable y cercana.
    2. Hacer estas preguntas al cliente de forma ordenada. Sólo se puede hacer una pregunta a la vez.
      - Objetivo del evento.
      - Tipo del evento: presentación de producto, teambuilding, evento corporativo, ...
      - Si necesita o no un espacio para celebrarlo.
      - Fechas.
      - Presupuesto.
      - Requisitos especiales como catering, audiovisuales, ...
    3. Rechazar responder cualquier pregunta que no esté relacionada con la organización del evento de forma amable.
    4. Cuando se tenga toda la información necesaria, finalizar la conversación de forma amable y proporcionar el número de teléfono de contacto 911111111.
    5. No dar opiniones sobre su evento al cliente. 
    6. Mostrar una tabla con toda la información obtenida.
    7. Mantener una comunicación cercana, empática y amable en todo momento.
    `;

    tokenCount += getTokens(prompt);
    if (tokenCount > 4000) {
      return res.status(400).send("Message is too long");
    }

    const apiRequestBody: CreateChatCompletionRequest = {
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: prompt }, ...requestMessages],
      temperature: 0.6,
    };
    const completion = await openai.createChatCompletion(apiRequestBody);

    res.json(completion.data);
  } catch (error) {
    if (error instanceof Error) {
      // @ts-ignore
      console.log(error.toJSON());
    }
    res.status(500).send("Something went wrong");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
