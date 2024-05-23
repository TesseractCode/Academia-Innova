"use client";
import React, { useEffect, useState } from "react";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { cn } from "../../utils/cn";
import { useSearchParams } from 'next/navigation';
import { IconBrandGithub, IconBrandGoogle, IconBrandOnlyfans } from "@tabler/icons-react";
import { supabase } from '../../supabaseClient'; // Ensure this path matches your project structure

const SignupFormDemo: React.FC = () => {
  const searchParams = useSearchParams();
  const title = searchParams.get('title');
  const [rank, setRank] = useState('loading...');

  useEffect(() => {
    if (!title) {
      setRank('Category title is missing');
      return;
    }

    const fetchRank = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Error fetching session:', error);
        setRank('Error fetching rank');
        return;
      }

      if (session) {
        const user = session.user;
        const { data, error } = await supabase
          .from('user_difficulty_levels')
          .select('difficulty_level')
          .eq('user_id', user.id)
          .eq('category_id', getCategoryID(title));

        if (error) {
          console.error('Error fetching difficulty level:', error);
          setRank('Error fetching rank');
        } else if (data.length > 0) {
          setRank(data[0].difficulty_level);
        } else {
          setRank('No rank found');
        }
      } else {
        setRank('User not authenticated');
      }
    };

    fetchRank();
  }, [title]);

  return (
    <div className="space-y-10 max-w-md w-full mx-auto rounded-none md:rounded-2xl p-4 md:p-8 shadow-input bg-white dark:bg-black">
      <h2 className="font-bold text-xl text-neutral-800 dark:text-neutral-200">
        {title}
      </h2>
      <h2
        className="flex justify-center items-center bg-gradient-to-br relative group/btn from-black dark:from-zinc-900 dark:to-zinc-900 to-neutral-600 block dark:bg-zinc-800 w-full text-white rounded-md h-10 font-medium shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:shadow-[0px_1px_0px_0px_var(--zinc-800)_inset,0px_-1px_0px_0px_var(--zinc-800)_inset]"
      >
        Current rank: {rank}
      </h2>
      <button
        className="bg-gradient-to-br relative group/btn from-black dark:from-zinc-900 dark:to-zinc-900 to-neutral-600 block dark:bg-zinc-800 w-full text-white rounded-md h-10 font-medium shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:shadow-[0px_1px_0px_0px_var(--zinc-800)_inset,0px_-1px_0px_0px_var(--zinc-800)_inset]"
        type="submit"
      >
        Learning Path
        <BottomGradient />
      </button>
    </div>
  );
};

export default SignupFormDemo;

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

// Helper function to map category titles to category IDs
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
