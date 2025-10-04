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
    props?: Record<
      string,
      {
        displayName: string;
        required: boolean;
        type: "SHORT_TEXT" | "SECRET_TEXT" | "STATIC_DROPDOWN" | "CHECKBOX" | "NUMBER" | string;
        defaultValue?: unknown;
        options?: { options?: Array<{ label: string; value: string | number }> };
      }
    >;
    type: string;
    displayName: string;
  };
};
