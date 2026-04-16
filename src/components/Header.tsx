'use client'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROLE_LABELS, ROLE_COLORS, canApprove, canManageUsers } from '@/lib/auth'
import { useState } from 'react'

const APP_VERSION = 'v0.5'

export default function Header() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  if (!session) return null

  const role = (session.user as any).role || 'VIEW_ONLY'
  const roleLabel = ROLE_LABELS[role] || role
  const roleColor = ROLE_COLORS[role] || '#6b7280'

  const navLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/panels', label: 'Panels' },
    { href: '/search', label: 'Search' },
    { href: '/qr-codes', label: 'QR Codes' },
    ...(canApprove(role) ? [{ href: '/change-requests', label: 'Requests' }] : []),
    ...(canManageUsers(role) ? [{ href: '/users', label: 'Users' }] : []),
    ...(canManageUsers(role) ? [{ href: '/import', label: 'Import' }] : []),
  ]

  return (
    <header className="bg-[#003865] text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo + Title */}
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-[#78BE20] rounded flex items-center justify-center font-bold text-[#003865] text-xs flex-shrink-0">
              VCH
            </div>
            <div className="hidden sm:block">
              <div className="font-semibold text-sm leading-tight">Electrical Panel Directory</div>
              <div className="text-[10px] text-blue-300 leading-tight">Vancouver Coastal Health</div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-white/20 text-white'
                    : 'text-blue-200 hover:text-white hover:bg-white/10'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* User info + version */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: roleColor, color: 'white' }}
              >
                {roleLabel.toUpperCase()}
              </span>
              <span className="text-xs text-blue-300">{APP_VERSION}</span>
            </div>
            <button
              onClick={() => signOut()}
              className="text-xs text-blue-300 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors"
            >
              Sign out
            </button>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-1.5 rounded hover:bg-white/10"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="md:hidden pb-3 border-t border-blue-700 mt-1 pt-2">
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: roleColor }}>
                {roleLabel}
              </span>
              <span className="text-xs text-blue-300">{APP_VERSION}</span>
            </div>
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 rounded text-sm font-medium ${
                  pathname === link.href ? 'bg-white/20' : 'text-blue-200 hover:bg-white/10'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
