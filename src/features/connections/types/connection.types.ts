export type { Connection } from "../../../types/connection";

export type ActivePiece = {
  id: string;
  name: string;
  displayName: string;
  logoUrl: string;
  description: string;
  categories: string[];
  actions: number;
  triggers: number;
  auth?: {
    required: boolean;
    description: string;
    props: Record<
      string,
      { displayName: string; required: boolean; type: string }
    >;
    type: string;
    displayName: string;
  };
};
