const OpenAI = require("openai");
const dotenv = require('dotenv');

dotenv.config();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function create_response(prompt, history = []) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: prompt,
    temperature: 0.2,
    max_tokens: 256,
    top_p: 0.95,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  console.log(response.choices[0].message.content);
  return response.choices[0].message.content;
}

module.exports = {
  create_response
};
