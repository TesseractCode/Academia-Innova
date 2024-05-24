const OpenAI = require("openai");
const dotenv = require('dotenv');

dotenv.config();
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function create_response(prompt, history=[]) {
    // console.log("aaa")
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: prompt,
        // messages: [
        //     {
        //       "role": "user",
        //       "content": [
        //         {
        //           "type": "text",
        //           "text": prompt
        //         }
        //       ]
              
        //     }
        // ],
        temperature: 1,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
    });

    // const newHistory = history.concat([
    //     {
    //         "role": "assistant",
    //         "content": response.choices[0].message.content
    //     }
    // ]);

    // return {
    //     response: response.choices[0].message.content,
    //     history: newHistory
    // };

    console.log(response.choices[0].message.content)
    return response.choices[0].message.content;
}


module.exports = {
    create_response
};