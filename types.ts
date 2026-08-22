export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Profile {
  fullName: string;
  email: string;
  goal: string;
  pace: string;
  subjects: string;
  preferences: string;
  strongSubjects: string[];
  weakSubjects: string[];
  availableToday: number;
  schoolHours: number;
  tuitionHours: number;
  socialUse: string;
  socialPlatforms: string[];
  hobbies: string[];
  style: string;
  dailyTime: number;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
}

export interface Target {
  id: string;
  title: string;
  time: string;
  note: string;
  done: boolean;
}

export interface StudyLog {
  id: string;
  type: "study" | "wellness";
  title: string;
  minutes: number;
  createdAt: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}
