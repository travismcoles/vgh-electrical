import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './db'

export const ROLES = {
  ADMIN: 'ADMIN',
  CHARGEHAND: 'CHARGEHAND',
  ELECTRICIAN: 'ELECTRICIAN',
  SUBCONTRACTOR: 'SUBCONTRACTOR',
  VIEW_ONLY: 'VIEW_ONLY',
} as const

export type Role = keyof typeof ROLES

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  CHARGEHAND: 'Chargehand / Supervisor',
  ELECTRICIAN: 'Electrician',
  SUBCONTRACTOR: 'Subcontractor',
  VIEW_ONLY: 'View Only',
}

export const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#dc2626',
  CHARGEHAND: '#d97706',
  ELECTRICIAN: '#2563eb',
  SUBCONTRACTOR: '#7c3aed',
  VIEW_ONLY: '#6b7280',
}

// Permission helpers
export function canEdit(role: string): boolean {
  return ['ADMIN', 'CHARGEHAND', 'ELECTRICIAN'].includes(role)
}

export function canApprove(role: string): boolean {
  return ['ADMIN', 'CHARGEHAND'].includes(role)
}

export function canManageUsers(role: string): boolean {
  return role === 'ADMIN'
}

export function canDirectEdit(role: string): boolean {
  return ['ADMIN', 'CHARGEHAND'].includes(role)
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.active) return null

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role
        ;(session.user as any).id = token.id
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
}
