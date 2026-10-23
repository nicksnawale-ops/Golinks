export type UserRole = 'admin' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatarUrl?: string;
}

export const MOCK_USERS: User[] = [
  {
    id: 'user_admin',
    name: 'Alex Rivera (Admin)',
    email: 'admin@company.internal',
    role: 'admin',
    department: 'IT Infrastructure',
  },
  {
    id: 'user_nikhil',
    name: 'Nikhil Nawale (Employee)',
    email: 'nikhil.nawale01@gmail.com',
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
