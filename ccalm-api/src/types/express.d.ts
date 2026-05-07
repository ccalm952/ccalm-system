export {}

declare global {
  namespace Express {
    /** JWT strategy attaches this shape to `req.user`. */
    interface User {
      sub: string
      username: string
      role: "user" | "admin"
    }
  }
}
