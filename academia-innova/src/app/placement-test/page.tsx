"use client";
import React, { useState, useEffect } from "react";
import axios from 'axios';
import { supabase } from "../supabaseClient";

interface Question {
  id: number;
  question_text: string;
  correct_answer: string;
  other_options: string[];
}

interface Response {
  questionId: number;
  selectedAnswer: string;
}

const QUESTIONS_PER_PAGE = 4;

const PlacementTest: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [message, setMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const fetchQuestions = async () => {
      const { data, error } = await supabase.from('questions').select('*');
      if (error) {
        console.error("Error fetching questions:", error);
      } else {
        setQuestions(data as Question[]);
      }
    };

    fetchQuestions();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("User not authenticated");
      setMessage('User not authenticated');
      return;
    }

    try {
      const result = await axios.post('/api/evaluate', { userId: user.id, responses });
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

  const handleChange = (questionId: number, selectedAnswer: string) => {
    setResponses((prevResponses) => [
      ...prevResponses.filter((res) => res.questionId !== questionId),
      { questionId, selectedAnswer }
    ]);
  };

  const startIndex = currentPage * QUESTIONS_PER_PAGE;
  const currentQuestions = questions.slice(startIndex, startIndex + QUESTIONS_PER_PAGE);

  return (
    <div className="max-w-md w-full mx-auto rounded-none md:rounded-2xl p-4 md:p-8 shadow-input bg-white dark:bg-gray-800">
      <h2 className="font-bold text-xl text-neutral-800 dark:text-neutral-200 mb-4">
        Placement Test
      </h2>

      {message && (
        <div className={`px-4 py-3 rounded relative mb-4 ${message.includes('Error') ? 'bg-red-100 border border-red-400 text-red-700' : 'bg-green-100 border border-green-400 text-green-700'}`} role="alert">
          <span className="block sm:inline">{message}</span>
        </div>
      )}

      <form className="my-8" onSubmit={handleSubmit}>
        {currentQuestions.map((question) => (
          <div key={question.id} className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <p className="text-black dark:text-white mb-2">{question.question_text}</p>
            {[question.correct_answer, ...question.other_options].map((option, index) => (
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
        <div className="flex justify-between items-center">
          {currentPage > 0 && (
            <button
              type="button"
              className="bg-gradient-to-br from-black dark:from-gray-900 dark:to-gray-900 to-neutral-600 text-white rounded-md h-10 px-4"
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </button>
          )}
          {startIndex + QUESTIONS_PER_PAGE < questions.length ? (
            <button
              type="button"
              className="bg-gradient-to-br from-black dark:from-gray-900 dark:to-gray-900 to-neutral-600 text-white rounded-md h-10 px-4"
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              className="bg-gradient-to-br from-black dark:from-gray-900 dark:to-gray-900 to-neutral-600 text-white rounded-md h-10 px-4"
            >
              Submit Test &rarr;
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default PlacementTest;
