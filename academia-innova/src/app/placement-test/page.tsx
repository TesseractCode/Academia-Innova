"use client";
import React, { useState, useEffect } from "react";
import axios from 'axios';
import { supabase } from "../supabaseClient";

interface Question {
  id: number;
  category_id: number;
  difficulty: string;
  question_text: string;
  correct_answer: string;
  other_options: string[];
}

interface Response {
  question_id: number;
  user_answer: string;
}

const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];
const OPTION_LETTERS = ["A", "B", "C", "D", "E"];

const PlacementTest: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchQuestions = async () => {
      const { data, error } = await supabase.from('questions').select('*');
      if (error) {
        console.error("Error fetching questions:", error);
      } else {
        const organizedQuestions: Question[] = [];
        const categories = Array.from(new Set(data.map((q: Question) => q.category_id)));

        categories.forEach(category_id => {
          DIFFICULTY_LEVELS.forEach(level => {
            const question = data.find((q: Question) => q.category_id === category_id && q.difficulty === level);
            if (question) organizedQuestions.push(question);
          });
        });

        setQuestions(organizedQuestions);
      }
    };

    fetchQuestions();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    console.log('Submitting responses:', responses);
    
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;

    if (userError) {
      console.error("Error fetching user:", userError.message);
      setMessage('Error fetching user');
      return;
    }

    if (!user) {
      console.error("User not authenticated");
      setMessage('User not authenticated');
      return;
    }

    console.log('User ID:', user.id);

    try {
      const result = await axios.post('http://localhost:3000/api/evaluate', { user_id: user.id, responses });
      console.log('Backend response:', result);

      if (result.status === 200) {
        setMessage('Placement test completed! Your levels have been assigned.');
      } else {
        setMessage('Error submitting placement test.');
      }
    } catch (error) {
      console.error("Error submitting placement test:", error);
      setMessage('Error submitting placement test.');
    }
  };

  const handleChange = (question_id: number, user_answer: string) => {
    const question = questions.find(q => q.id === question_id);
    if (!question) {
      console.error(`Question with id ${question_id} not found`);
      return;
    }

    const allOptions = [question.correct_answer, ...question.other_options];
    const answerLetter = OPTION_LETTERS[allOptions.indexOf(user_answer)];

    console.log(`Question ID: ${question_id}, User Answer: ${user_answer}, Mapped Answer: ${answerLetter}`);

    setResponses((prevResponses) => [
      ...prevResponses.filter((res) => res.question_id !== question_id),
      { question_id, user_answer: answerLetter }
    ]);
  };

  return (
    <div className="max-w-2xl w-full mx-auto rounded-md p-4 md:p-8 shadow-lg bg-white dark:bg-gray-800">
      <h2 className="font-bold text-2xl text-neutral-800 dark:text-neutral-200 mb-6 text-center">
        Placement Test
      </h2>

      {message && (
        <div className={`px-4 py-3 rounded relative mb-4 ${message.includes('Error') ? 'bg-red-100 border border-red-400 text-red-700' : 'bg-green-100 border border-green-400 text-green-700'}`} role="alert">
          <span className="block sm:inline">{message}</span>
        </div>
      )}

      <form className="space-y-8" onSubmit={handleSubmit}>
        <div className="overflow-y-auto max-h-[60vh] p-4 bg-gray-100 dark:bg-gray-700 rounded-lg space-y-6">
          {questions.map((question) => (
            <div key={question.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <p className="text-black dark:text-white mb-2 font-semibold">{question.question_text}</p>
              {[question.correct_answer, ...question.other_options].map((option, index) => (
                <label key={index} className="block mb-2">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option}
                    onChange={() => handleChange(question.id, option)}
                    className="mr-2"
                  />
                  <span className="text-black dark:text-white">{OPTION_LETTERS[index]}: {option}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
        <button
          type="submit"
          className="w-full py-3 bg-gradient-to-br from-blue-500 to-green-500 text-white font-semibold rounded-md shadow-md hover:from-blue-600 hover:to-green-600"
        >
          Submit Test &rarr;
        </button>
      </form>
    </div>
  );
};

export default PlacementTest;
