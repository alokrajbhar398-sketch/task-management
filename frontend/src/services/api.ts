const BASE_URL = 'http://localhost:5000/api';

const getHeaders = (token?: string | null) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

export const authApi = {
  getUsers: async (token: string) => {
    const res = await fetch(`${BASE_URL}/auth/users`, { headers: getHeaders(token) });
    return res.json();
  },
  register: async (name: string, email: string, password: string, role: string) => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, email, password, role }),
    });
    return res.json();
  },

  login: async (email: string, password: string) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },
};

export const taskApi = {
  listAttachments: async (token: string, taskId: number) => {
    const res = await fetch(`${BASE_URL}/attachments/task/${taskId}`, { headers: getHeaders(token) });
    return res.json();
  },
  uploadAttachment: async (token: string, taskId: number, file: File) => {
    const body = new FormData();
    body.append('file', file);
    const res = await fetch(`${BASE_URL}/attachments/task/${taskId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    return res.json();
  },
  deleteAttachment: async (token: string, id: number) => {
    const res = await fetch(`${BASE_URL}/attachments/${id}`, { method: 'DELETE', headers: getHeaders(token) });
    return res.json();
  },
  downloadAttachment: async (token: string, id: number) => {
    const res = await fetch(`${BASE_URL}/attachments/${id}/download`, { headers: getHeaders(token) });
    if (!res.ok) return null;
    return { blob: await res.blob(), name: res.headers.get('Content-Disposition') || 'attachment' };
  },
  getAll: async (token: string) => {
    const res = await fetch(`${BASE_URL}/tasks`, {
      headers: getHeaders(token),
    });
    return res.json();
  },

  create: async (token: string, title: string, description: string, dueDate?: string, priority = 'medium', assigneeId?: number | null) => {
    const res = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ title, description, dueDate: dueDate || null, priority, assigneeId: assigneeId || null }),
    });
    return res.json();
  },

  updateStatus: async (token: string, id: number, status: string) => {
    const res = await fetch(`${BASE_URL}/tasks/${id}`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  updateDetails: async (token: string, id: number, title: string, description: string, dueDate?: string, priority = 'medium', assigneeId?: number | null) => {
    const res = await fetch(`${BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify({ title, description, dueDate: dueDate || null, priority, assigneeId: assigneeId || null }),
    });
    return res.json();
  },

  delete: async (token: string, id: number) => {
    const res = await fetch(`${BASE_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    return res.json();
  },
};
