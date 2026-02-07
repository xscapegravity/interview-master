export interface InterviewSetup {
  jdUrl: string;
  resumeUrl: string;
  jdText: string;
  resumeText: string;
  mode: 'voice' | 'text';
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
