export type Connection = {
  id: string;
  created: string;
  updated: string;
  displayName: string;
  externalId: string;
  pieceName: string;
  type: string;
  status: string;
  scope: string;
  ownerId: string;
  platformId: string;
  projectIds: string[];
  metadata: {
    createdAt: string;
    pieceLogoUrl: string;
    pieceDisplayName: string;
  };
  owner: {
    id: string;
    userIdentity: {
      email: string;
      firstName: string;
      lastName: string;
    };
  };
};
