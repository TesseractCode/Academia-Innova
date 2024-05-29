### Project Documentation

---

**Project Title**: Academia-Innova & PITECH PLUS: AI/ eLearning Platform Development

**Section**: IT

**Theme**: Artificial Intelligence/(e)Learning

---

**Introduction**:

This project presents an intelligent e-learning platform designed to evaluate and improve technical skills in software development. The platform uses our custom algorithm in order to evaluate users on different programming areas and AI-driven learning path generation in order to guide them through personalized learning journeys.

---

**Technologies Used**:
- **Frontend**: React
- **Backend**: Node.js
- **Database**: Supabase
- **AI**: GPT-4o for learning path generation

---

**Objective**:

The primary goal of the platform is to assess a user's technical proficiency and provide a tailored improvement plan. By generating customized tests and using AI to create learning paths, the platform aims to enhance users' skills effectively.

---

**System Architecture**:

1. **Frontend**:
   - Developed using React.
   - Handles user interactions and displays evaluation results.
   - Communicates with the backend through API calls.

2. **Backend**:
   - Built with Node.js and Express.
   - Manages user evaluations, test generation, and integration with Supabase for data storage.
   - Uses GPT-4o to generate personalized learning paths based on user performance.

3. **Database**:
   - Supabase is used to store questions, evaluations, user data, and difficulty levels.
   - Provides a structured schema for efficient data retrieval and storage.

---

**Functionality**:

1. **User Evaluation**:
   - Users are evaluated through a series of questions categorized by difficulty and topic.
   - Responses are recorded and analyzed to determine the user's proficiency level in various categories.

2. **Test Generation**:
   - Based on the initial evaluation, the platform generates custom tests focusing on areas where the user needs improvement.
   - The test generation algorithm considers the user's current skill level and provides appropriately challenging questions.

3. **Learning Path Generation**:
   - GPT-4o is utilized to create personalized learning paths.
   - Provides resources and suggestions tailored to the user's skill level and the topics they struggled with.
   - Includes links to educational materials and videos.

---

### API Endpoints Technical Overview

This section details the technical implementation and process flow of the key API endpoints in the Intelligent (e)Learning Platform. It provides a comprehensive understanding of how each endpoint works and interacts with the system, highlighting the helper functions used to streamline operations.

#### **1. Evaluate User** (`/api/evaluate`)

This endpoint evaluates a user's responses to questions and updates their proficiency levels based on their performance.

**Process Flow**:
1. **Retrieve Question Data**: For each response, fetch the correct answer, category ID, and difficulty level from the `questions` table in Supabase.
2. **Evaluate Answer**: Compare the user’s answer to the correct answer to determine correctness. Insert the evaluation result into the `evaluations` table.
3. **Update User Levels**: Call `evaluateUserLevels(user_id, true)` to determine and update the user's difficulty level in each category based on their performance.

**Helper Function**:
```javascript
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

    let difficultyLevel = DifficultyLevel(score, isInitialPlacement);
    await supabase
      .from('user_difficulty_levels')
      .upsert([{ user_id, category_id, difficulty_level: difficultyLevel, score }]);
  }
}
```

#### **2. Generate Test** (`/api/generate-test`)

This endpoint generates a customized test based on the user's previous performance.

**Process Flow**:
1. **Fetch User's Difficulty Levels**: Retrieve the user's current difficulty levels from the `user_difficulty_levels` table.
2. **Identify Focus Categories**: Sort categories by the user's scores and focus on the categories with the lowest scores.
3. **Fetch Questions**: Fetch questions for the focused categories, including previously failed questions. Fetch additional questions from other categories to create a balanced test.
4. **Randomize and Limit Questions**: Shuffle and limit the questions to create a final set of 20 questions.

#### **3. Submit Test** (`/api/submit-test`)

This endpoint accepts test responses, evaluates them, and updates the user's scores and difficulty levels.

**Process Flow**:
1. **Retrieve Question Data**: For each response, fetch the correct answer, category ID, and difficulty level from the `questions` table.
2. **Evaluate Answer**: Compare the user’s answer to the correct answer to determine correctness. Insert the evaluation result into the `evaluations` table.
3. **Update User Levels**: Fetch the user’s current difficulty level from the `user_difficulty_levels` table. Calculate the score change based on the correctness of the answer and the difficulty levels. Update the user's score and difficulty level if necessary.

**Helper Functions**:
```javascript
function calculateScoreChange(userDifficultyLevel, questionDifficulty, isCorrect) {
  if (isCorrect) {
    return SCORE_ADJUSTMENTS[userDifficultyLevel].correct[questionDifficulty] || 0;
  } else {
    return SCORE_ADJUSTMENTS[userDifficultyLevel].incorrect[questionDifficulty] || 0;
  }
}

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

async function updateScoreAndLevel(user_id, category_id, is_correct, currentDifficultyLevel, question_id, user_answer) {
  const { data: userLevelData, error: userLevelError } = await supabase
    .from('user_difficulty_levels')
    .select('*')
    .eq('user_id', user_id)
    .eq('category_id', category_id)
    .single();

  if (userLevelError) throw userLevelError;

  const userDifficultyLevel = userLevelData.difficulty_level;
  let scoreChange = calculateScoreChange(userDifficultyLevel, currentDifficultyLevel, is_correct);
  
  const newScore = userLevelData.score + scoreChange;
  await supabase
    .from('user_difficulty_levels')
    .update({ score: newScore })
    .eq('user_id', user_id)
    .eq('category_id', category_id);

  const newDifficultyLevel = DifficultyLevel(newScore);
  await supabase
    .from('user_difficulty_levels')
    .update({ difficulty_level: newDifficultyLevel })
    .eq('user_id', user_id)
    .eq('category_id', category_id);
}
```

#### **4. ChatGPT Response** (`/api/chatgpt-response`)

This endpoint generates a customized learning path with resources tailored to the user's needs using GPT-4o. To enhance the accuracy and relevance of the responses, we've adjusted the temperature and top_p settings in the GPT-4o API and experimented with different prompt models and phrasing.

**Process Flow**:
1. **Fetch User's Difficulty Level and Failed Questions**: Retrieve the user’s current difficulty level and failed questions from the `user_difficulty_levels` and `evaluations` tables.
2. **Generate GPT-4o Prompt**: Construct a prompt for GPT-4o using the user's difficulty level and failed questions.
3. **Fetch GPT-4o Response**: Call the GPT-4o API to generate a personalized learning path.

**Helper Functions**:
```javascript
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


    return chatgptResponse;
  } catch (error) {
    throw error;
  }
}
```
---

### Scoring System Overview

The scoring system in the Intelligent (e)Learning Platform is designed to dynamically assess and update a user's proficiency in various technical categories. The system adjusts a user's score based on the correctness of their answers and the difficulty of the questions. This system ensures that users are placed and advanced through difficulty levels that accurately reflect their current skill set.

### Detailed Scoring Mechanics

1. **Score Thresholds**:
   - These thresholds define the score ranges for each proficiency level:
     - **Beginner**: -10 to 5
     - **Intermediate**: 6 to 15
     - **Advanced**: 16 to 30
     - **Expert**: 31 and above

2. **Score Adjustments**:
   - Score adjustments are made based on whether the user's answers are correct or incorrect, and the difficulty of the questions they answered.
   - The adjustments vary depending on the user's current difficulty level and the difficulty level of the question.
   
   **Example**: A user at the intermediate level will receive different score changes for answering beginner, intermediate, or advanced questions correctly or incorrectly.

#### Score Adjustment Tables:

| Current Level | Answer Correct | Beginner Question | Intermediate Question | Advanced Question | Expert Question |
|---------------|----------------|-------------------|-----------------------|-------------------|-----------------|
| Beginner      | Yes            | +2                | +3                    | -                 | -               |
|               | No             | -2                | -1                    | -                 | -               |
| Intermediate  | Yes            | +1                | +2                    | +3                | -               |
|               | No             | -3                | -2                    | -1                | -               |
| Advanced      | Yes            | -                 | +1                    | +2                | +3              |
|               | No             | -                 | -3                    | -2                | -1              |
| Expert        | Yes            | -                 | -                     | +1                | +2              |
|               | No             | -                 | -                     | -3                | -2              |

### Score Calculation Process

1. **Initial Placement**:
   - During the initial evaluation, users answer a series of questions to determine their starting proficiency levels.
   - The system forms a correctness pattern (e.g., '1101') based on their answers, which maps to a predefined score in the `PLACEMENT_SCORES` table.
   - This score is then used to determine their initial difficulty level, with a maximum initial placement of 'advanced'.

2. **Ongoing Evaluations**:
   - For each test response, the platform calculates the user's score change based on:
     - The user's current difficulty level.
     - The difficulty level of the question.
     - Whether the answer was correct or incorrect.

3. **Score Updates**:
   - After calculating the score change, the system updates the user's total score in the relevant category.
   - The system then determines if the user's difficulty level should be adjusted based on the new score.

### Example of Score Adjustments

#### Case 1: User at Intermediate Level
- **Question Difficulty**: Intermediate
- **Correct Answer**: +2 points
- **Incorrect Answer**: -2 points

#### Case 2: User at Advanced Level
- **Question Difficulty**: Expert
- **Correct Answer**: +3 points
- **Incorrect Answer**: -2 points

### Summary

- This scoring system ensures that users are continuously evaluated and placed in difficulty levels that match their skill. By adjusting scores based on the complexity of questions and the correctness of answers, the platform provides a dynamic and personalized learning experience.

---

**Usage Flow**:

1. **Initial Evaluation**:
   - The user takes an initial test to assess their skill level.
   - The platform evaluates the responses and assigns initial difficulty levels.

2. **Custom Test Generation**:
   - Based on the evaluation, the platform generates a custom test to target areas of improvement.
   - The user takes the test, and the responses are evaluated.

3. **Personalized Learning Path**:
   - GPT-4o generates a learning path with resources to help the user improve.
   - The user follows the learning path and retakes evaluations to track progress.

---

**Conclusion**:

The intelligent e-learning platform leverages modern web technologies and AI to provide a personalized learning experience. By continuously evaluating and adapting to the user's needs, it aims to enhance their technical skills efficiently and effectively.

---
