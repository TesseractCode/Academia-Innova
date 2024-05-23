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
const OPTION_LETTERS = ["A", "B", "C", "D"];

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

    const answerLetter = OPTION_LETTERS[question.other_options.indexOf(user_answer)];

    console.log(`Question ID: ${question_id}, User Answer: ${user_answer}, Mapped Answer: ${answerLetter}`);

    setResponses((prevResponses) => [
      ...prevResponses.filter((res) => res.question_id !== question_id),
      { question_id, user_answer: answerLetter }
    ]);
  };

  return (
    <div className="max-w-3xl w-full mx-auto rounded-none md:rounded-2xl p-4 md:p-8 shadow-input bg-white dark:bg-black">
      <h2 className="font-bold text-xl text-neutral-800 dark:text-neutral-200 text-center mb-6">
        Placement Test
      </h2>

      {message && (
        <div className={`px-4 py-3 rounded relative mb-4 ${message.includes('Error') ? 'bg-red-100 border border-red-400 text-red-700' : 'bg-green-100 border border-green-400 text-green-700'}`} role="alert">
          <span className="block sm:inline">{message}</span>
        </div>
      )}

      <form className="space-y-8" onSubmit={handleSubmit}>
        <div className="overflow-y-auto max-h-[60vh] p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg space-y-6 ">
          {questions.map((question) => (
            <div key={question.id} className="p-4 bg-neutral-200 dark:bg-neutral-900 rounded-lg shadow-sm">
              <p className="text-black dark:text-white mb-2 font-semibold">{question.question_text}</p>
              {question.other_options.map((option, index) => (
                <label key={index} className="block mb-2">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option}
                    onChange={() => handleChange(question.id, option)}
                    className="mr-2"
                  />
                  <span className="text-black dark:text-white">{option}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
        <button
          type="submit"
          className="bg-gradient-to-br relative group/btn from-black dark:from-zinc-900 dark:to-zinc-900 to-neutral-600 block dark:bg-zinc-800 w-full text-white rounded-md h-10 font-medium shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:shadow-[0px_1px_0px_0px_var(--zinc-800)_inset,0px_-1px_0px_0px_var(--zinc-800)_inset]"
        >
          Submit Test &rarr;
          <BottomGradient />
        </button>
      </form>
    </div>
  );
};

export default PlacementTest;

const BottomGradient = () => {
  return (
    <>
      <span className="group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
      <span className="group-hover/btn:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
    </>
  );
};
