import { HoverEffect } from "../ui/card-hover-effect";

export function CategoryCards() {
  return (
    <div className="max-w-5xl mx-auto px-8">
      <HoverEffect items={projects} />
    </div>
  );
}

export const projects = [
  {
    title: "Programming Languages",
    description: "Learn about various programming languages and their applications.",
    link: "https://stripe.com",
  },
  {
    title: "Data Structures and Algorithms",
    description: "Understand fundamental data structures and algorithms for efficient coding.",
    link: "https://netflix.com",
  },
  {
    title: "Database Management",
    description: "Explore the principles and practices of managing databases.",
    link: "https://google.com",
  },
  {
    title: "Web Development",
    description: "Get insights into building and maintaining websites.",
    link: "https://meta.com",
  },
  {
    title: "Software Design and Architecture",
    description: "Learn about designing and structuring software systems.",
    link: "https://amazon.com",
  },
  {
    title: "Version Control Systems",
    description: "Discover tools and techniques for version control in software development.",
    link: "https://microsoft.com",
  },
  {
    title: "Testing and Quality Assurance",
    description: "Understand the importance of testing and ensuring software quality.",
    link: "https://microsoft.com",
  },
  {
    title: "DevOps and CI/CD",
    description: "Learn about DevOps practices and continuous integration/delivery.",
    link: "https://microsoft.com",
  },
  {
    title: "Security",
    description: "Explore methods for securing software and systems.",
    link: "https://microsoft.com",
  },
  {
    title: "Mobile Development",
    description: "Get started with developing applications for mobile devices.",
    link: "https://microsoft.com",
  },
];
