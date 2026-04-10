import 'next-auth';

declare module 'next-auth' {
  interface User {
    role?: string;
    username?: string | null;
    phone?: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      username?: string | null;
      phone?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    id?: string;
    username?: string | null;
    phone?: string | null;
    image?: string | null;
  }
}
