export interface Note {
  id: number;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
}

export interface UserRecord {
  id: number;
  email: string;
  name: string;
  password: string;
}
