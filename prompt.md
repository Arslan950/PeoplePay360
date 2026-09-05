Refactor PeoplePay360's frontend navigation from local-state page switching to
real browser routing, and implement the currently-empty Sidebar.jsx and
ProtectedRoute.jsx components. Read these first to avoid breaking anything:

- Frontend/src/App.jsx (current routing-by-state logic to replace)
- Frontend/src/common/components/Navigation.jsx (logic to migrate, then delete)
- Frontend/src/common/components/Sidebar.jsx (currently `return null` — build
  this out properly, this is the file that should now own nav rendering)
- Frontend/src/common/components/ProtectedRoute.jsx (currently `return null`
  — build this out properly)
- Frontend/src/features/auth/AuthContext.jsx (useAuth() -> { user, loading, login, logout })
- Frontend/src/features/employees/EmployeeListPage.jsx and EmployeeFormPage.jsx
- Frontend/src/index.css (.app-layout, .navigation*, .placeholder-page rules —
  you will rename/restyle .navigation into a top navbar layout)

## 0. Dependency
Run: cd Frontend && npm install react-router-dom
(This is the only new package. Nothing else in the app needs to change.)

## 1. Frontend/src/main.jsx
Wrap <App /> in <BrowserRouter> from "react-router-dom".

## 2. Frontend/src/common/components/ProtectedRoute.jsx
Real implementation:
- Import useAuth, Navigate, Outlet.
- If loading -> render the same "Loading..." <main className="loading"> markup
  App.jsx currently uses.
- If !user -> <Navigate to="/login" replace />.
- Else -> <Outlet /> (so nested routes render inside it).

## 3. Frontend/src/common/components/Sidebar.jsx
Real implementation, replacing Navigation.jsx's job:
- Take no page-switching props — use react-router's <NavLink> for each item
  instead of manual activePage/onNavigate props, so the active link is
  determined by the URL, not lifted state.
- Same nav items as Navigation.jsx (dashboard, employees, contracts,
  schedules, attendance, timeoff, payroll), same brand mark, same
  user email/role + sign-out button (call useAuth().logout(), then
  navigate("/login") — get navigate from useNavigate()).
- Structure it as a horizontal bar (brand on the left, nav links in the
  middle, user info + sign-out on the right) — see CSS section below for
  the exact class rename.
- Delete Frontend/src/common/components/Navigation.jsx once Sidebar.jsx
  replaces it everywhere it was imported.

## 4. Frontend/src/index.css
Rename and restyle the sidebar rules into a top navbar:
- Change `.app-layout` from `display: flex` to `display: flex;
  flex-direction: column` (stack navbar above content instead of beside it).
- Rename `.navigation` -> `.navbar` and change it from a fixed-width flex
  column to a full-width flex row: `width: 100%; flex: 0 0 auto; flex-direction: row;
  align-items: center; justify-content: space-between; padding: 12px 24px;`
  Keep the same dark background/colors.
- Rename `.navigation-brand` -> `.navbar-brand` (no longer needs bottom
  padding since it's inline now).
- Rename `.navigation nav` -> `.navbar nav` and change `display: grid` to
  `display: flex; gap: 4px` (nav items sit in a row, not stacked).
- Rename `.navigation-item` -> `.navbar-item`, `.navigation-footer` ->
  `.navbar-footer` (this becomes a flex row of user info + sign-out button,
  not a bordered-top stacked block — drop the `border-top`/`margin-top: auto`
  rules since there's no vertical stack anymore).
- Rename `.navigation-user`/`.navigation-signout` -> `.navbar-user`/
  `.navbar-signout` accordingly, keep their look.
- Update the `@media (max-width: 760px)` block: since the layout is already
  horizontal, simplify it to just let `.navbar nav` scroll horizontally
  (`overflow-x: auto`) on small screens — remove the old
  "switch sidebar to horizontal" mobile-only rules since that's now the
  default at all sizes.
- Leave `.placeholder-page`, `.app-content`, and everything else untouched.

## 5. Frontend/src/App.jsx
Replace the activePage state machine with real <Routes>:

  <Routes>
    <Route path="/login" element={<LoginRoute />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/employees/*" element={<EmployeesPage />} />
        <Route path="/contracts" element={<ContractsPage />} />
        <Route path="/schedules/*" element={<SchedulesPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/timeoff" element={<TimeoffPage />} />
        <Route path="/payroll" element={<PayrollPage />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>

Where:
- LoginRoute: if useAuth().user is already set, <Navigate to="/dashboard"
  replace />; otherwise render the existing <LoginPage /> markup as-is.
- AppLayout (new, small component in App.jsx or its own file): renders
  <div className="app-layout"><Sidebar /><section className="app-content">
  <Outlet /></section></div> — this is the direct replacement for the
  current app-layout JSX block in App.jsx.
- Keep <AuthProvider> wrapping everything, same as today.

## 6. Frontend/src/features/employees/EmployeesPage.jsx (new)
Move the editingEmployee state + toggle-between-List-and-Form logic that
currently lives in App.jsx's AppContent into this new wrapper component.
Mount it at "/employees/*" so it owns its own add/edit view-switching
exactly as it behaves today — no URL changes for individual employees for
now, just moved out of App.jsx into its own feature-owned page component.

## 7. New dedicated page files (replacing PagePlaceholder usage)
Create these, each a minimal named page for now — a heading and nothing
else — but properly located in their feature folder so future work (payroll
engine, time-off approvals, etc.) has a real home instead of a shared
generic component:

- Frontend/src/features/dashboard/DashboardPage.jsx -> <main className="placeholder-page"><p className="eyebrow">PeoplePay360</p><h1>Dashboard</h1></main>
- Frontend/src/features/contracts/ContractsPage.jsx -> same shape, "Contracts"
- Frontend/src/features/attendance/AttendancePage.jsx -> same shape, "Attendance"
  (note: the Attendance backend API already exists and works — this page is
  intentionally left as a name-only placeholder in this pass; it's the next
  natural target for a Schedules-style build-out prompt)
- Frontend/src/features/timeoff/TimeoffPage.jsx -> same shape, "Time off"
- Frontend/src/features/payroll/PayrollPage.jsx -> same shape, "Payroll"

If Frontend/src/features/schedules/SchedulesListPage.jsx already exists
(from the earlier Working Schedule prompt), wrap it the same way as
EmployeesPage.jsx in a Frontend/src/features/schedules/SchedulesPage.jsx and
mount that at "/schedules/*" instead of a placeholder. If that work hasn't
landed yet, use the same placeholder shape as the others for now.

## 8. Cleanup
- Delete Frontend/src/common/components/Navigation.jsx (fully replaced by Sidebar.jsx).
- Frontend/src/common/components/PagePlaceholder.jsx can stay in the repo
  unused, or be deleted — your call, it's no longer referenced.
- Remove the `pageTitles` object from App.jsx, it's no longer needed.

## Constraints
- Do not change EmployeeListPage.jsx/EmployeeFormPage.jsx internals — only
  relocate the state that wraps them into EmployeesPage.jsx.
- Do not touch the backend at all — this is a frontend-only change.
- Keep matching the existing code style (no semicolons, same quoting) used
  throughout the Frontend folder.
- Login/logout behavior must work identically to today — only the URL
  structure and component boundaries change.