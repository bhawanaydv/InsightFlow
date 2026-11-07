import type { Dataset, Project, ProjectFields, ProjectSummary, User } from '../types';

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
export class ApiError extends Error { constructor(message: string, public status = 500) { super(message); } }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('insightflow_token');
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error ?? 'Something went wrong.', response.status);
  return data as T;
}

export const api = {
  async register(input: { name: string; email: string; password: string }) { return request<{ user: User; token: string }>('/auth/register', { method: 'POST', body: JSON.stringify(input) }); },
  async login(input: { email: string; password: string }) { return request<{ user: User; token: string }>('/auth/login', { method: 'POST', body: JSON.stringify(input) }); },
  async me() { return request<{ user: User }>('/auth/me'); },
  async projects() { return request<{ projects: ProjectSummary[] }>('/projects'); },
  async project(id: string) { return request<{ project: Project }>(`/projects/${id}`); },
  async createProject(name: string) { return request<{ project: Project }>('/projects', { method: 'POST', body: JSON.stringify({ name }) }); },
  async renameProject(id: string, name: string) { return request<{ project: ProjectFields }>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }); },
  async deleteProject(id: string) { return request<void>(`/projects/${id}`, { method: 'DELETE' }); },
  async uploadDataset(projectId: string, file: File, onProgress: (value: number) => void) {
    const token = localStorage.getItem('insightflow_token');
    return new Promise<{ dataset: Dataset }>((resolve, reject) => {
      const form = new FormData(); form.append('file', file);
      const xhr = new XMLHttpRequest(); xhr.open('POST', `${baseUrl}/projects/${projectId}/datasets`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
      xhr.onload = () => {
        let data: { dataset?: Dataset; error?: string };
        try { data = JSON.parse(xhr.responseText || '{}') as { dataset?: Dataset; error?: string }; }
        catch { reject(new ApiError('The server returned an unreadable response.', xhr.status)); return; }
        xhr.status >= 200 && xhr.status < 300 ? resolve(data as { dataset: Dataset }) : reject(new ApiError(data.error ?? 'Upload failed.', xhr.status));
      };
      xhr.onerror = () => reject(new ApiError('Network error while uploading the file.'));
      xhr.send(form);
    });
  },
  async preview(datasetId: string, page: number, pageSize = 25) { return request<{ dataset: Dataset; rows: Record<string, unknown>[]; page: number; pageSize: number; totalPages: number }>(`/datasets/${datasetId}/preview?page=${page}&pageSize=${pageSize}`); },
};
