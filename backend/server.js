const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import the cors package
const { supabase } = require('./supabaseClient');
require('dotenv').config();

const app = express();

app.use(cors({
    origin: 'http://localhost:3001' // Replace with your frontend URL
}));
app.use(bodyParser.json());

app.post('/api/evaluate', async (req, res) => {
  const { user_id, responses } = req.body;

  try {
    // Store user responses
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

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
