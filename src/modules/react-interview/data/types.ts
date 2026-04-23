export type Difficulty = "easy" | "medium" | "hard";

export interface ChallengeTest {
  description: string;
  code: string;
}

export interface ReactChallenge {
  id: string;
  topicId: string;
  title: string;
  difficulty: Difficulty;
  description: string;
  concepts: string[];
  starterCode: string;
  hints: string[];
  tests: ChallengeTest[];
  estimatedMinutes: number;
}

export interface ChallengeTopic {
  id: string;
  title: string;
  icon: string;
  description: string;
  accentColor: string;
  challenges: ReactChallenge[];
}

export interface InterviewTrack {
  id: string;
  title: string;
  description: string;
  icon: string;
  accentColor: string;
  comingSoon?: boolean;
  topics: ChallengeTopic[];
}
