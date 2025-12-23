export interface TokenSpenderPair {
  token: string;
  spender: string;
}

export interface Allowance {
  id?: number;
  chainId: number;
  owner: string;
  token: string;
  spender: string;
  amount: string;
  expiration: number;
  updatedAt: number;
  lastSeen: number;
  riskLabels?: string[];
  verified?: boolean;
}

export interface Receipt {
  id?: number;
  owner: string;
  chainId: number;
  revoked: number;
  limited: number;
  panicked: number;
  createdAt: number;
  summary: string;
}
