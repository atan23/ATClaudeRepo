import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('readwise_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 by clearing token
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('readwise_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  demoLogin: () => api.post('/auth/demo'),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  googleLoginUrl: () => '/api/auth/google',
};

export const booksApi = {
  search: (q: string) => api.get('/books/search', { params: { q } }),
  getById: (id: string | number) => api.get(`/books/${id}`),
  getCatalog: () => api.get('/books'),
  import: (csvContent: string, source: 'kindle' | 'goodreads') =>
    api.post('/books/import', { csvContent, source }),
};

export const libraryApi = {
  getLibrary: (params?: {
    status?: string;
    source?: string;
    sort?: string;
    order?: string;
  }) => api.get('/library', { params }),
  addBook: (data: { bookId?: number; googleBooksId?: string; status?: string }) =>
    api.post('/library', data),
  updateBook: (bookId: number, data: {
    status?: string;
    rating?: number;
    review?: string;
    started_at?: string;
    finished_at?: string;
  }) => api.put(`/library/${bookId}`, data),
  removeBook: (bookId: number) => api.delete(`/library/${bookId}`),
};

export const recommendationsApi = {
  getAll: () => api.get('/recommendations'),
  getTrending: (limit?: number) => api.get('/recommendations/trending', { params: { limit } }),
  getForYou: (limit?: number) => api.get('/recommendations/for-you', { params: { limit } }),
  getSocial: (limit?: number) => api.get('/recommendations/social', { params: { limit } }),
};

export const goalsApi = {
  getGoals: () => api.get('/goals'),
  createGoal: (data: { type: string; target: number; year: number; month?: number }) =>
    api.post('/goals', data),
  updateGoal: (id: number, data: { target: number }) => api.put(`/goals/${id}`, data),
  deleteGoal: (id: number) => api.delete(`/goals/${id}`),
};

export const statsApi = {
  getStats: () => api.get('/stats'),
  getLeaderboard: () => api.get('/stats/leaderboard'),
  getActivity: () => api.get('/stats/activity'),
};

export default api;
