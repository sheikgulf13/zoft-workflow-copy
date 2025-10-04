import { NavLink, Outlet } from "react-router-dom";

export default function PlatformAdminLayout() {
  return (
    <div className="min-h-screen bg-theme-background">
      <div className="flex h-screen">
        <aside className="flex h-full w-56 flex-col bg-theme-form/95 backdrop-blur-md border-r border-white/20 dark:border-white/10 shadow-xl">
          <div className="border-b border-white/20 dark:border-white/10 px-6 py-6">
            <h2 className="text-base font-semibold text-theme-primary">
              Platform Admin
            </h2>
            <p className="mt-1 text-xs text-theme-secondary">
              Manage your platform settings
            </p>
          </div>
          <nav className="flex-1 overflow-y-auto px-4 py-6 scrollbar-theme">
            <ul className="space-y-1">
              <li>
                <NavLink
                  to="invitations"
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-theme-primary text-theme-inverse shadow-sm border border-theme-primary"
                        : "text-theme-secondary hover:bg-theme-surface-hover hover:text-theme-primary"
                    }`
                  }
                >
                  Invitations
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="users"
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-theme-primary text-theme-inverse shadow-sm border border-theme-primary"
                        : "text-theme-secondary hover:bg-theme-surface-hover hover:text-theme-primary"
                    }`
                  }
                >
                  Users
                </NavLink>
              </li>
            </ul>
          </nav>
        </aside>
        <main className="flex-1 overflow-y-auto bg-theme-background scrollbar-theme">
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}


