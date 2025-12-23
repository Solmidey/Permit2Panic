import { parseAbiItem } from "viem";

export const allowanceAbiItem = parseAbiItem(
  "function allowance(address owner, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)"
);

export const approveAbiItem = parseAbiItem(
  "function approve(address token, address spender, uint160 amount, uint48 expiration)"
);

export const lockdownAbiItem = parseAbiItem(
  "function lockdown((address token,address spender)[] approvals)"
);

export const approvalEvent = parseAbiItem(
  "event Approval(address indexed owner, address indexed token, address indexed spender, uint160 amount, uint48 expiration)"
);

export const permitEvent = parseAbiItem(
  "event Permit(address indexed owner, address indexed token, address indexed spender, uint160 amount, uint48 expiration, uint48 nonce)"
);

export const lockdownEvent = parseAbiItem(
  "event Lockdown(address indexed owner, address indexed token, address indexed spender)"
);

export const permit2Abi = [
  allowanceAbiItem,
  approveAbiItem,
  lockdownAbiItem,
  approvalEvent,
  permitEvent,
  lockdownEvent,
];
