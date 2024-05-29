"use client";
import React, { useEffect, useState } from "react";
import { cn } from "../utils/cn";
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const Category: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const title = searchParams ? searchParams.get('title') : null;
  const [rank, setRank] = useState('loading...');
  const [chatgptResponse, setChatgptResponse] = useState('Loading...');

  useEffect(() => {
    if (!title) {
      setRank('Category title is missing');
      return;
    }

    const fetchRank = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error fetching session:', error);
        setRank('Error fetching rank');
        return;
      }

      const session = data?.session;
      if (session) {
        const user = session.user;
        const { data: rankData, error: rankError } = await supabase
          .from('user_difficulty_levels')
          .select('difficulty_level')
          .eq('user_id', user.id)
          .eq('category_id', getCategoryID(title));

        if (rankError) {
          console.error('Error fetching difficulty level:', rankError);
          setRank('Error fetching rank');
        } else if (rankData.length > 0) {
          setRank(rankData[0].difficulty_level);
        } else {
          setRank('No rank found');
        }
      } else {
        setRank('User not authenticated');
      }
    };

    fetchRank();
  }, [title]);

  useEffect(() => {
    const fetchChatgptResponse = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        if (title && session?.user) {
          const response = await fetch('http://localhost:3000/api/chatgpt-response', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id: session.user.id, category_id: getCategoryID(title), rank: rank }),
          });

          if (!response.ok) {
            throw new Error('Failed to fetch ChatGPT response');
          }

          const data = await response.json();
          setChatgptResponse(data.response);
        }
      } catch (error) {
        console.error('Error fetching ChatGPT response:', error);
        setChatgptResponse('Error fetching ChatGPT response');
      }
    };

    if (rank !== 'loading...') {
      fetchChatgptResponse();
    }
  }, [rank]);

  return (
    <div className="space-y-10 max-w-2xl w-full mx-auto rounded-none md:rounded-2xl p-6 md:p-10 shadow-input bg-white dark:bg-black">
      <h2 className="font-bold text-2xl text-neutral-800 dark:text-neutral-200">
        {title}
      </h2>
      <h2 className="font-bold text-xl text-neutral-800 dark:text-neutral-200">
        Current rank: {rank}
      </h2>
      <div className="mt-6 p-6 bg-zinc-800 text-gray-200 rounded-lg">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" {...props} />,
          }}
        >
          {chatgptResponse}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default Category;

const BottomGradient: React.FC = () => {
  return (
    <>
      <span className="group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
      <span className="group-hover/btn:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
    </>
  );
};

interface LabelInputContainerProps {
  children: React.ReactNode;
  className?: string;
}

const LabelInputContainer: React.FC<LabelInputContainerProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn("flex flex-col space-y-2 w-full", className)}>
      {children}
    </div>
  );
};

const getCategoryID = (title: string): number | null => {
  const categories: { [key: string]: number } = {
    'Programming Languages': 1,
    'Data Structures and Algorithms': 2,
    'Database Management': 3,
    'Web Development': 4,
    'Software Design and Architecture': 5,
    'Version Control Systems': 6,
    'Testing and Quality Assurance': 7,
    'DevOps and CI/CD': 8,
    'Security': 9,
    'Mobile Development': 10,
  };
  return categories[title] || null;
};
