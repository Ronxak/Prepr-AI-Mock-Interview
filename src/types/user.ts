/** The user shape safe to expose to the client (never includes passwordHash). */
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}
