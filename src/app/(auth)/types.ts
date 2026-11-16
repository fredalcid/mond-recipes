export type AuthFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Partial<Record<string, string>>;
};

export const initialAuthState: AuthFormState = { status: "idle" };
