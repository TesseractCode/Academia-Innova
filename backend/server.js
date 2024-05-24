const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import the cors package
const { supabase } = require('./supabaseClient');
const {create_response} = require('./open-ai')
require('dotenv').config();

const app = express();

app.use(cors({
    origin: 'http://localhost:3001' // Replace with your frontend URL
}));
app.use(bodyParser.json());

const categories = {
  1: 'Programming Languages',
  2: 'Data Structures and Algorithms',
  3: 'Database Management',
  4: 'Web Development',
  5: 'Software Design and Architecture',
  6: 'Version Control Systems',
  7: 'Testing and Quality Assurance',
  8: 'DevOps and CI/CD',
  9: 'Security',
  10: 'Mobile Development',
};

app.post('/api/evaluate', async (req, res) => {
  const { user_id, responses } = req.body;

  try {
    for (const response of responses) {
      const { question_id, user_answer } = response;

      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .select('correct_answer, category_id, difficulty')
        .eq('id', question_id)
        .single();

      if (questionError) throw questionError;

      console.log('Question Data:', questionData);

      const is_correct = questionData.correct_answer === user_answer;

      const { error: evaluationError } = await supabase
        .from('evaluations')
        .insert([{ 
          user_id: user_id, 
          question_id: question_id, 
          category_id: questionData.category_id,
          user_answer: user_answer, 
          is_correct: is_correct,
          difficulty: questionData.difficulty // Ensure difficulty is inserted
        }]);

      if (evaluationError) throw evaluationError;
    }

    // Evaluate user levels
    await evaluateUserLevels(user_id);
    res.status(200).send('Evaluation completed and levels assigned');
  } catch (error) {
    console.error('Error evaluating responses:', error);
    res.status(500).send('Error evaluating responses');
  }
});

async function evaluateUserLevels(user_id) {
  const { data: categories, error: categoriesError } = await supabase.from('categories').select('id');

  if (categoriesError) throw categoriesError;

  for (const category of categories) {
    const category_id = category.id;

    const { data: responses, error: responsesError } = await supabase
      .from('evaluations')
      .select('question_id, is_correct, difficulty')
      .eq('user_id', user_id)
      .eq('category_id', category_id);

    if (responsesError) throw responsesError;

    console.log(`Evaluating category ${category_id} for user ${user_id}`);
    console.log('Responses:', responses);

    let correctCounts = { beginner: 0, intermediate: 0, advanced: 0, expert: 0 };
    let totalCounts = { beginner: 0, intermediate: 0, advanced: 0, expert: 0 };

    for (const response of responses) {
      totalCounts[response.difficulty]++;
      if (response.is_correct) {
        correctCounts[response.difficulty]++;
      }
    }

    console.log('Total counts:', totalCounts);
    console.log('Correct counts:', correctCounts);

    let difficultyLevel = 'beginner';
    if (totalCounts.expert > 0 && correctCounts.expert / totalCounts.expert > 0.7) {
      difficultyLevel = 'expert';
    } else if (totalCounts.advanced > 0 && correctCounts.advanced / totalCounts.advanced > 0.6) {
      difficultyLevel = 'advanced';
    } else if (totalCounts.intermediate > 0 && correctCounts.intermediate / totalCounts.intermediate > 0.5) {
      difficultyLevel = 'intermediate';
    }

    console.log(`Assigned difficulty level for category ${category_id}: ${difficultyLevel}`);

    const { error: userLevelError } = await supabase
      .from('user_difficulty_levels')
      .upsert([{ user_id: user_id, category_id: category_id, difficulty_level: difficultyLevel }]);

    if (userLevelError) throw userLevelError;
  }
}

async function getFailedQuestions(user_id, category_id) {
  try {
    console.log(user_id)
    const { data: incorrectQuestions, error: incorrectQuestionsError } = await supabase
      .from('evaluations')
      .select('question_id')
      .eq('user_id', user_id)
      .eq('category_id', category_id)
      .eq('is_correct', false);

    if (incorrectQuestionsError) throw incorrectQuestionsError;

    if (incorrectQuestions.length === 0) {
      return 'No failed questions for this category.';
    }

    const questionIds = incorrectQuestions.map(q => q.question_id);

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('question_text')
      .in('id', questionIds);

    if (questionsError) throw questionsError;

    let result = '';
    questions.forEach((question, index) => {
      result += `${index + 1}. ${question.question_text}\n`;
    });

    return result;
  } catch (error) {
    console.error('Error fetching failed questions:', error);
    throw new Error('Error fetching failed questions');
  }
}

async function getChatGPTResponse(user_id, category_id, rank) {
  const category_name = categories[category_id];
  // const prompt = `Generate a detailed explanation for user with ID ${user_id} about ${category_name}. Provide learning materials, links to resources, and videos.`;
  // console.log(user_id)
  const fq = await getFailedQuestions(user_id,category_id)
  // console.log(fq)

  const  prompt = [
    {
      "role": "system",
      "content": [
        {
          "type": "text",
          "text": `Your job is to provide helpful learning resources for programming concepts in the form of links to websites and youtube links. Max 2 links per concept, 4 concepts.  Don't write other text `
        }
      ]
    },
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": `Teach ${category_name}. 
                   I failed these quiz questions ${fq}. Include these topics, and if possible extra topics.
                   IMPORTANT: my level is ${rank} give resources according to this rank. `
        }
      ]
    }
  ];


  try {
    const chatgptResponse = await create_response(prompt);
    console.log("gata")
    console.log(chatgptResponse)
    return chatgptResponse;
  } catch (error) {
    console.error('Error generating ChatGPT response:', error);
    throw error;
  }
}


app.post('/api/chatgpt-response', async (req, res) => {
  // console.log("bbb")
  const { user_id, category_id } = req.body;

  try {
    const chatgptResponse = await getChatGPTResponse(user_id, category_id);
    res.status(200).json({ response: chatgptResponse });
  } catch (error) {
    console.error('Error getting ChatGPT response:', error);
    res.status(500).send('Error getting ChatGPT response');
  }
});


const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

