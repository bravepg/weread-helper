export type YuqueUserInfo = {
  id: number;
  login: string;
  name: string;
  avatar_url: string;
  description: string;
};

export type YuqueRepository = {
  id: string;
  name: string;
  namespace: string;
  slug: string;
  description?: string;
};

export type YuqueDocument = {
  id: string;
  uuid?: string;
  title: string;
  type: "TITLE" | "DOC";
};
