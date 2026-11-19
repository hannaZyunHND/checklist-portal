import { useEffect, useMemo, useState } from 'react';
import { HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { isTicketOverdue } from './domain/ticketStats';
import { subscribeVisibleTickets } from './services/ticketService';
import { subscribeTeamUsers } from './services/userService';
import type { Ticket } from './types/ticket';
import type { UserProfile } from './types/user';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { CreateTicketModal } from './components/tickets/CreateTicketModal';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { TeamPage } from './pages/TeamPage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { TicketsPage } from './pages/TicketsPage';

function WorkspaceRoutes() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!userProfile) {
      setTickets([]);
      setUsers([]);
      return;
    }
    const unsubTickets = subscribeVisibleTickets(userProfile, setTickets);
    const unsubUsers = subscribeTeamUsers(setUsers);
    return () => {
      unsubTickets();
      unsubUsers();
    };
  }, [userProfile]);

  const overdueCount = useMemo(
    () => tickets.filter((t) => isTicketOverdue(t, nowMs)).length,
    [tickets, nowMs]
  );

  return (
    <AppShell overdueCount={overdueCount} onOpenCreateTicket={() => setCreateModalOpen(true)}>
      {banner && (
        <div
          role="status"
          className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <span>{banner}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-xs font-semibold underline"
          >
            Đóng
          </button>
        </div>
      )}

      <Routes>
        <Route
          path="/"
          element={<DashboardPage tickets={tickets} users={users} nowMs={nowMs} />}
        />
        <Route
          path="/tickets"
          element={
            <TicketsPage
              tickets={tickets}
              users={users}
              nowMs={nowMs}
              onOpenCreateTicket={() => setCreateModalOpen(true)}
            />
          }
        />
        <Route path="/tickets/:id" element={<TicketDetailPage nowMs={nowMs} />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route
          path="/team"
          element={
            <ProtectedRoute requiredRole="MANAGER">
              <TeamPage users={users} />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {userProfile && (
        <CreateTicketModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          users={users}
          onCreated={(ticketId, emailWarning) => {
            if (emailWarning) {
              setBanner(`Ticket đã được tạo nhưng email thông báo chưa gửi được: ${emailWarning}`);
            }
            navigate(`/tickets/${ticketId}`);
          }}
        />
      )}
    </AppShell>
  );
}

export function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <WorkspaceRoutes />
              </ProtectedRoute>
            }
          />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
