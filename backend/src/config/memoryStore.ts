export type MemoryUser = {
  id: number;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  created_at: Date;
};

export type MemoryTask = {
  id: number;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  user_id: number;
  created_at: Date;
};

const memoryStore = {
  users: [] as MemoryUser[],
  tasks: [] as MemoryTask[],
};

export const getMemoryUsers = () => memoryStore.users;
export const getMemoryTasks = () => memoryStore.tasks;
