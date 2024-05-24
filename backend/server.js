const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { supabase } = require('./supabaseClient');
const {create_response} = require('./open-ai')
require('dotenv').config();

const app = express();

app.use(cors({
    origin: 'http://localhost:3001' // Replace with your frontend URL
}));
app.use(bodyParser.json());

const SCORE_THRESHOLDS = {
  beginner: { min: -10, max: 5 },
  intermediate: { min: 6, max: 15 },
  advanced: { min: 16, max: 30 },
  expert: { min: 31, max: 999 }
};

const SCORE_ADJUSTMENTS = {
  beginner: {
    correct: { beginner: 2, intermediate: 3 },
    incorrect: { beginner: -2, intermediate: -1 }
  },
  intermediate: {
    correct: { beginner: 1, intermediate: 2, advanced: 3 },
    incorrect: { beginner: -3, intermediate: -2, advanced: -1 }
  },
  advanced: {
    correct: { intermediate: 1, advanced: 2, expert: 3 },
    incorrect: { intermediate: -3, advanced: -2, expert: -1 }
  },
  expert: {
    correct: { advanced: 1, expert: 2 },
    incorrect: { advanced: -3, expert: -2 }
  }
};

const PLACEMENT_SCORES = {
  '1111': 16,
  '1110': 13,
  '1100': 6,
  '1000': 2,
  '0000': 0,
  '0001': 7,
  '0100': 4,
  '0010': 6,
  '1010': 7,
  '1001': 9,
  '0110': 9,
  '0101': 10,
  '0011': 11,
  '1101': 11,
  '1011': 12,
  '0111': 13,

};

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
    await evaluateUserLevels(user_id, true);
    res.status(200).send('Evaluation completed and levels assigned');
  } catch (error) {
    console.error('Error evaluating responses:', error);
    res.status(500).send('Error evaluating responses');
  }
});

async function evaluateUserLevels(user_id, isInitialPlacement = false) {
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

    let score = 0;

    if (isInitialPlacement) {
      const correctnessPattern = responses.map(r => r.is_correct ? '1' : '0').join('');
      score = PLACEMENT_SCORES[correctnessPattern] || 0;
    } else {
      for (const response of responses) {
        if (response.is_correct) {
          score += SCORE_ADJUSTMENTS[response.difficulty].correct[response.difficulty];
        } else {
          score -= SCORE_ADJUSTMENTS[response.difficulty].incorrect[response.difficulty];
        }
      }
    }

    console.log('Score:', score);

    let difficultyLevel = 'beginner';
    if (isInitialPlacement) {
      if (score >= SCORE_THRESHOLDS.advanced.min) {
        difficultyLevel = 'advanced';
      } else if (score >= SCORE_THRESHOLDS.intermediate.min) {
        difficultyLevel = 'intermediate';
      } else {
        difficultyLevel = 'beginner';
      }
      // Cap the initial placement to 'advanced'
      if (difficultyLevel === 'expert') {
        difficultyLevel = 'advanced';
      }
    } else {
      if (score >= SCORE_THRESHOLDS.expert.min) {
        difficultyLevel = 'expert';
      } else if (score >= SCORE_THRESHOLDS.advanced.min) {
        difficultyLevel = 'advanced';
      } else if (score >= SCORE_THRESHOLDS.intermediate.min) {
        difficultyLevel = 'intermediate';
      } else {
        difficultyLevel = 'beginner';
      }
    }

    console.log(`Assigned difficulty level for category ${category_id}: ${difficultyLevel}`);

    const { error: userLevelError } = await supabase
      .from('user_difficulty_levels')
      .upsert([{ user_id: user_id, category_id: category_id, difficulty_level: difficultyLevel, score: score }]);

    if (userLevelError) throw userLevelError;
  }
}



app.post('/api/generate-test', async (req, res) => {
  const { user_id } = req.body;

  try {
    // Fetch the user's difficulty levels
    const { data: difficultyLevels, error: difficultyError } = await supabase
      .from('user_difficulty_levels')
      .select('*')
      .eq('user_id', user_id);

    if (difficultyError) throw difficultyError;

    // Determine the categories to focus on
    const sortedLevels = difficultyLevels.sort((a, b) => a.score - b.score);
    const focusedCategories = [sortedLevels[0].category_id, sortedLevels[1].category_id];
    const otherCategories = sortedLevels.filter(level => !focusedCategories.includes(level.category_id));

    // Fetch questions from the lowest graded categories
    let questions = [];
    for (const category_id of focusedCategories) {
      const level = difficultyLevels.find(level => level.category_id === category_id);
      const questionDifficulties = getDifficultyRange(level.difficulty_level);

      let categoryQuestions = [];
      for (const difficulty of questionDifficulties) {
        const { data: levelQuestions, error: questionError } = await supabase
          .from('questions')
          .select('*')
          .eq('category_id', category_id)
          .eq('difficulty', difficulty);

        if (questionError) throw questionError;
        categoryQuestions = categoryQuestions.concat(levelQuestions);
      }

      // Shuffle and limit to between 5 and 8 questions per focused category
      const minQuestions = 5;
      const maxQuestions = 8;
      const numQuestions = Math.floor(Math.random() * (maxQuestions - minQuestions + 1)) + minQuestions;
      categoryQuestions = categoryQuestions.sort(() => 0.5 - Math.random()).slice(0, numQuestions);
      questions = questions.concat(categoryQuestions);
    }

    // Fetch random questions from the other categories
    let randomQuestions = [];
    for (const level of otherCategories) {
      const questionDifficulties = getDifficultyRange(level.difficulty_level);

      for (const difficulty of questionDifficulties) {
        const { data: levelQuestions, error: questionError } = await supabase
          .from('questions')
          .select('*')
          .eq('category_id', level.category_id)
          .eq('difficulty', difficulty);

        if (questionError) throw questionError;
        randomQuestions = randomQuestions.concat(levelQuestions);
      }
    }

    // Shuffle the random questions and take the first 4
    randomQuestions = randomQuestions.sort(() => 0.5 - Math.random()).slice(0, 4);

    // Combine focused and random questions
    questions = questions.concat(randomQuestions);

    // Randomize the final set of questions
    questions = questions.sort(() => 0.5 - Math.random()).slice(0, 20);

    res.status(200).json({ questions });
  } catch (error) {
    console.error('Error generating test:', error);
    res.status(500).send('Error generating test');
  }
});

function getDifficultyRange(currentLevel) {
  if (currentLevel === 'beginner') {
    return ['beginner', 'intermediate'];
  } else if (currentLevel === 'intermediate') {
    return ['beginner', 'intermediate', 'advanced'];
  } else if (currentLevel === 'advanced') {
    return ['intermediate', 'advanced', 'expert'];
  } else if (currentLevel === 'expert') {
    return ['advanced', 'expert'];
  } else {
    return [];
  }
}



app.post('/api/submit-test', async (req, res) => {
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

      const is_correct = questionData.correct_answer === user_answer;
      const currentDifficultyLevel = questionData.difficulty;


      // In the app.post('/api/submit-test', update this part

      const { data: userLevelData, error: userLevelError } = await supabase
        .from('user_difficulty_levels')
        .select('*')
        .eq('user_id', user_id)
        .eq('category_id', questionData.category_id)
        .single();

      if (userLevelError) throw userLevelError;

      let scoreChange;
      const userDifficultyLevel = userLevelData.difficulty_level;

      if (is_correct) {
        scoreChange = SCORE_ADJUSTMENTS[userDifficultyLevel]?.correct?.[currentDifficultyLevel] ?? 0;
      } else {
        scoreChange = SCORE_ADJUSTMENTS[userDifficultyLevel]?.incorrect?.[currentDifficultyLevel] ?? 0;
      }

      const { error: evaluationError } = await supabase
        .from('evaluations')
        .insert([{ 
          user_id: user_id, 
          question_id: question_id, 
          category_id: questionData.category_id,
          user_answer: user_answer, 
          is_correct: is_correct,
          difficulty: questionData.difficulty
      }]);

      if (evaluationError) throw evaluationError;

      const newScore = userLevelData.score + scoreChange;
      console.log(`Updating score for category ${questionData.category_id}: ${userLevelData.score} -> ${newScore} (change: ${scoreChange})`);

      await supabase
        .from('user_difficulty_levels')
        .update({ score: newScore })
        .eq('user_id', user_id)
        .eq('category_id', questionData.category_id);

      // Adjust difficulty level if needed
      const newDifficultyLevel = DifficultyLevel(newScore);
      console.log(`Updating difficulty level for category ${questionData.category_id}: ${userLevelData.difficulty_level} -> ${newDifficultyLevel}`);
      await supabase
        .from('user_difficulty_levels')
        .update({ difficulty_level: newDifficultyLevel })
        .eq('user_id', user_id)
        .eq('category_id', questionData.category_id);
    }
    res.status(200).send('Test results submitted successfully');
  } catch (error) {
    console.error('Error submitting test results:', error);
    res.status(500).send('Error submitting test results');
  }
});


function DifficultyLevel(score) {
  if (score >= SCORE_THRESHOLDS.expert.min) {
    return 'expert';
  } else if (score >= SCORE_THRESHOLDS.advanced.min) {
    return 'advanced';
  } else if (score >= SCORE_THRESHOLDS.intermediate.min) {
    return 'intermediate';
  } else {
    return 'beginner';
  }
}


async function getFailedQuestions(user_id, category_id) {
  try {
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
      .select('question_text, difficulty')
      .in('id', questionIds);

    if (questionsError) throw questionsError;

    let result = '';
    questions.forEach((question, index) => {
      result += `${index + 1}. ${question.question_text}\n`;
    });

    return result || 'No failed questions for this category at the specified difficulty level.';
  } catch (error) {
    console.error('Error fetching failed questions:', error);
    throw new Error('Error fetching failed questions');
  }
}



async function getChatGPTResponse(user_id, category_id) {
  const category_name = categories[category_id];
  
  // Fetch user's difficulty level and failed questions
  const { data: userLevelData, error: userLevelError } = await supabase
    .from('user_difficulty_levels')
    .select('difficulty_level')
    .eq('user_id', user_id)
    .eq('category_id', category_id)
    .single();
  
  if (userLevelError) {
    throw new Error('Error fetching user difficulty level');
  }
  
  const user_level = userLevelData.difficulty_level;

  const fq = await getFailedQuestions(user_id, category_id);

  // Constructing the dynamic prompt
  const prompt = [
    {
      "role": "system",
      "content": `Your task is to provide ${user_level} learning topics for ${category_name} programming concepts. You should tailor the suggestions to EXACTLY the user's difficulty level: ${user_level}. Do not provide introductory or basic topics if the level is advanced. Do not suggest topics for other categories. Provide 4 topics and a link for each one. Don't write other text or instructions.`
    },
    {
      "role": "user",
      "content": `Teach ${category_name}. IMPORTANT: my level is ${user_level}. Suggest topics according to this rank and to this category. I failed these quiz questions: ${fq}. If there are no failed questions, just don't take them into account. Include these topics, and if possible extra topics. Don't suggest topics for other levels or categories.`
    }
  ];

  try {
    const chatgptResponse = await create_response(prompt);
    console.log(chatgptResponse);
    return chatgptResponse;
  } catch (error) {
    console.error('Error generating ChatGPT response:', error);
    throw error;
  }
}

app.post('/api/chatgpt-response', async (req, res) => {
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

