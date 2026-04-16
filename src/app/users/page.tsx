'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Header from '@/components/Header'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/auth'

export default function UsersPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', userRole: 'VIEW_ONLY' })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(data => { setUsers(data); setLoading(false) })
  }, [])

  async function addUser() {
    setSaving(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const user = await res.json()
      setUsers(prev => [...prev, user])
      setShowAdd(false)
      setForm({ name: '', email: '', password: '', userRole: 'VIEW_ONLY' })
    } else {
      alert('Failed to create user')
    }
    setSaving(false)
  }

  async function updateUser(id: string) {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (res.ok) {
      const updated = await res.json()
      setUsers(prev => prev.map(u => u.id === id ? updated : u))
      setEditingId(null)
    } else {
      alert('Failed to update user')
    }
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`Delete user ${name}? This cannot be undone.`)) return
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (res.ok) setUsers(prev => prev.filter(u => u.id !== id))
    else alert('Failed to delete user')
  }

  if (!session) return null

  return (
    <div>
      <Header />
      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="bg-[#003865] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-900"
          >
            + Add User
          </button>
        </div>

        {showAdd && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">New User</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Name" value={form.name} onChange={(v: any) => setForm(f => ({ ...f, name: v }))} />
              <Field label="Email" value={form.email} onChange={(v: any) => setForm(f => ({ ...f, email: v }))} type="email" />
              <Field label="Password" value={form.password} onChange={(v: any) => setForm(f => ({ ...f, password: v }))} type="password" />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select
                  value={form.userRole}
                  onChange={e => setForm(f => ({ ...f, userRole: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={addUser} disabled={saving} className="bg-[#003865] text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
                {saving ? 'Creating...' : 'Create User'}
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm">Loading users...</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(user => (
                  <tr key={user.id} className={`hover:bg-gray-50 ${!user.active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      {editingId === user.id ? (
                        <select
                          value={editForm.userRole}
                          onChange={e => setEditForm((f: any) => ({ ...f, userRole: e.target.value }))}
                          className="border border-gray-300 rounded-lg px-2 py-1 text-xs"
                        >
                          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      ) : (
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: ROLE_COLORS[user.role] || '#6b7280' }}
                        >
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === user.id ? (
                        <input
                          type="checkbox"
                          checked={editForm.active}
                          onChange={e => setEditForm((f: any) => ({ ...f, active: e.target.checked }))}
                        />
                      ) : (
                        <span className={`text-xs font-medium ${user.active ? 'text-green-600' : 'text-red-500'}`}>
                          {user.active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingId === user.id ? (
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => updateUser(user.id)} className="text-xs bg-green-500 text-white px-2 py-1 rounded">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-xs bg-gray-300 px-2 py-1 rounded">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setEditingId(user.id); setEditForm({ userRole: user.role, active: user.active }) }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteUser(user.id, user.name)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: any) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
