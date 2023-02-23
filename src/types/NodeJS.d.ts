export {};

// This file is used to declare .env types
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_RPC_URL: string;
      NETWORK: string;
      STARKCHECK_PK: string;
      PORT?: string;
    }
  }
}
