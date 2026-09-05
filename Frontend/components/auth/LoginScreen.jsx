import React, { useState } from "react";
import { C } from "../../theme/colors";
import { Button } from "../common/UI";
import { users, roleLabel } from "../../data/dummyData";

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("aarav@corp.com");
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
      <div className="w-full max-w-sm p-8 rounded-2xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold mb-6" style={{ background: C.primary }}>PP</div>
        <h1 className="text-xl font-medium mb-1" style={{ color: C.text }}>Welcome back</h1>
        <p className="text-sm mb-6" style={{ color: C.textMuted }}>Sign in to continue to your workspace.</p>

        <div className="space-y-4 mb-6">
          <div>
            <div className="text-xs mb-1" style={{ color: C.textMuted }}>Work email</div>
            <select
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg outline-none"
              style={{ border: `1px solid ${C.border}`, background: C.bg, color: C.text }}
            >
              {users.map((u) => (
                <option key={u._id} value={u.email}>{u.email} — {roleLabel[u.role]}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: C.textMuted }}>Password</div>
            <input type="password" defaultValue="••••••••••" className="w-full text-sm px-3 py-2 rounded-lg outline-none" style={{ border: `1px solid ${C.border}`, background: C.bg, color: C.text }} />
          </div>
        </div>

        <Button className="w-full justify-center" onClick={() => onLogin(users.find((u) => u.email === email))}>Sign in</Button>
        <p className="text-xs text-center mt-6" style={{ color: C.textMuted }}>Accounts are created by an administrator. Pick any demo user above.</p>
      </div>
    </div>
  );
}