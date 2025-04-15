
// embed.js
const fs = require("fs");
const pdfParse = require("pdf-parse");
const { Configuration, OpenAIApi } = require("openai");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function chunkText(text, maxLength = 800) {
  const sentences = text.split(".");
  let chunks = [], current = "";
  for (let sentence of sentences) {
    if ((current + sentence).length < maxLength) {
      current += sentence + ".";
    } else {
      chunks.push(current.trim());
      current = sentence + ".";
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

async function embedFile(filePath, sourceName) {
  const buffer = fs.readFileSync(filePath);
  const { text } = await pdfParse(buffer);
  const chunks = chunkText(text);

  for (let chunk of chunks) {
    const embeddingRes = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: chunk,
    });
    const [{ embedding }] = embeddingRes.data.data;

    await supabase.from("documents").insert([
      { content: chunk, embedding, source: sourceName },
    ]);
  }
  console.log(`${sourceName} uploaded`);
}

(async () => {
  await embedFile("data/F1487-21.pdf", "ASTM F1487-21");
  await embedFile("data/2010 ADA.pdf", "2010 ADA Standards");
})();
