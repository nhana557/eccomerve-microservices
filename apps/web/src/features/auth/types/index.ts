export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
  };
  error?: {
    code: string;
    message: string;
  };
}
