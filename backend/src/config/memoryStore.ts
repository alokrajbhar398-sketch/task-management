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
  priority: 'low' | 'medium' | 'high' | 'urgent';
  user_id: number;
  assignee_id?: number | null;
  due_date?: Date;
  created_at: Date;
};

export type MemoryAttachment = {
  id: number;
  task_id: number;
  user_id: number;
  original_name: string;
  stored_name: string;
  mime_type: string;
  size: number;
  created_at: Date;
};

const memoryStore = {
  users: [] as MemoryUser[],
  tasks: [] as MemoryTask[],
  attachments: [] as MemoryAttachment[],
};

export const getMemoryUsers = () => memoryStore.users;
export const getMemoryTasks = () => memoryStore.tasks;
export const getMemoryAttachments = () => memoryStore.attachments;
