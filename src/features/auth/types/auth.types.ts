export type AuthUser = {
  email: string;
  firstName?: string;
  lastName?: string;
  currentPlatform?: { id: string; name: string; role: string };
  currentProject?: { id: string; name: string; description?: string };
  platforms?: Array<{
    id: string;
    name: string;
    role: string;
    projects?: Array<{ id: string; name: string; description?: string }>;
  }>;
};

export type LoginRequest = { email: string; password: string };
export type LoginResponse = { message: string; token: string; user: AuthUser };

export type SignUpRequest = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};
export type SignUpResponse = {
  message: string;
  token?: string;
  user: { email: string; firstName: string; lastName: string };
};
