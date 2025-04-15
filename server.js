
// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY
}));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getRelevantChunks(query) {
  const embeddingRes = await openai.createEmbedding({
    model: 'text-embedding-ada-002',
    input: query
  });
  const [{ embedding }] = embeddingRes.data.data;

  const { data } = await supabase.rpc('match_documents_with_source', {
    query_embedding: embedding,
    match_count: 5
  });

  return data.map(d => `Source: ${d.source}\n${d.content}`).join("\n\n");
}

app.post('/ask', async (req, res) => {
  const userInput = req.body.question;
  const context = await getRelevantChunks(userInput);

  const chatRes = await openai.createChatCompletion({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'You are a helpful assistant using company-provided knowledge from official standards documents.' },
      { role: 'user', content: `Answer using only the context below. Cite the source at the start of each section.\n\n${context}\n\nQuestion: ${userInput}` }
    ]
  });

  res.json({ answer: chatRes.data.choices[0].message.content });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
