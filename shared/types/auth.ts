export type UserRole = 'admin' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatarUrl?: string;
}

/** Earlier default names of the demo accounts, replaced by the current ones unless someone renamed them. */
export const PREVIOUS_DEMO_NAMES: Record<string, string[]> = {
  user_admin: ['Alex Rivera (Admin)'],
  user_nikhil: ['Nikhil Nawale (Employee)'],
};

/** Earlier email addresses of the demo accounts, so stored data can be moved to the current ones. */
export const PREVIOUS_DEMO_EMAILS: Record<string, string[]> = {
  user_admin: ['admin@company.internal'],
  user_nikhil: ['nikhil.nawale01@gmail.com'],
};

export const MOCK_USERS: User[] = [
  {
    id: 'user_admin',
    name: 'VisionEdge Admin',
    email: 'admin@vision-edge.ai',
    role: 'admin',
    department: 'IT Infrastructure',
  },
  {
    id: 'user_nikhil',
    name: 'User',
    email: 'user@vision-edge.ai',
    role: 'employee',
    department: 'Engineering',
  },
  {
    id: 'user_sarah',
    name: 'Sarah Jenkins (Employee)',
    email: 'hr-ops@company.internal',
    role: 'employee',
    department: 'People Operations',
  },
  {
    id: 'user_david',
    name: 'David Chen (Employee)',
    email: 'finance-ops@company.internal',
    role: 'employee',
    department: 'Finance',
  },
];
