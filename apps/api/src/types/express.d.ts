declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth. Read it through `authenticatedUserId(req)`, never directly. */
      auth?: { userId: string };
    }
  }
}

export {};
