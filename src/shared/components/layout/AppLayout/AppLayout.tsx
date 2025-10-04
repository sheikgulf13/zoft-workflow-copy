import {
  Navigate,
  NavLink,
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthStore } from "../../../../app/store/auth";
import {
  LogOut,
  Settings,
  User2,
  ChevronDown,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Home,
  Zap,
  Bot,
  Database,
  Puzzle,
  CheckSquare,
  Shield,
  Cable,
  BookOpen,
  UserPlus,
  HelpCircle,
} from "lucide-react";
import { toastError, toastSuccess } from "../../../../components/ui/Toast";
import { useContextStore } from "../../../../app/store/context";
import { updateProjectContext } from "../../../../app/store/context/services";
import { http } from "../../../../shared/api";
import { ThemeToggle } from "../../../../components/ui/ThemeToggle";

const navItems = {
  main: [{ label: "Home", to: "/home", icon: Home }],
  products: [
    { label: "Flows", to: "/flows", icon: Zap },
    { label: "Agents", to: "/agents", icon: Bot },
    { label: "Tables", to: "/tables", icon: Database },
    { label: "MCP", to: "/mcp", icon: Puzzle },
    { label: "Todos", to: "/todos", icon: CheckSquare },
  ],
  misc: [
    {
      label: "Enter Platform Admin",
      to: "/enter-platform-admin",
      icon: Shield,
    },
    { label: "Connections", to: "/connections", icon: Cable },
    { label: "Tutorials", to: "/tutorials", icon: BookOpen },
  ],
  others: [
    { label: "Invite User", to: "/invite-user", icon: UserPlus },
    { label: "Help & Feedback", to: "/help-feedback", icon: HelpCircle },
  ],
};

function AppLayout() {
  const { isAuthenticated, user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentPlatform,
    currentProject,
    platforms,
    setCurrentProject,
    setPlatformProjects,
    addProjectToPlatform,
    restore: restoreCtx,
    clear: clearCtx,
  } = useContextStore();
  const loadFullContext = useContextStore((s) => s.loadFullContext);
  const loadProjectsForCurrentPlatform = useContextStore(
    (s) => s.loadProjectsForCurrentPlatform
  );
  const setProjectDetails = useContextStore((s) => s.setProjectDetails);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteScope, setInviteScope] = useState<"platform" | "project">(
    "platform"
  );
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [isScopeDropdownOpen, setIsScopeDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isDeleteProjectOpen, setIsDeleteProjectOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [editOriginalName, setEditOriginalName] = useState<string>("");
  const [editOriginalDesc, setEditOriginalDesc] = useState<string>("");
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);

  // Check if we're on the flow editor page
  const isFlowEditor = location.pathname === "/flows/create";
  const isPlatformAdmin = location.pathname.startsWith("/enter-platform-admin");

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest("[data-dropdown]")) {
        setIsScopeDropdownOpen(false);
        setIsRoleDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Ensure context is restored on app load/refresh
    restoreCtx();
    // Load full context from API if we have a token
    (async () => {
      try {
        const token = document.cookie.split("zw_access=")[1]?.split(";")[0];
        if (token) {
          await loadFullContext();
          await loadProjectsForCurrentPlatform();
          // Also fetch current project details for full info
          if (currentProject?.id) {
            try {
              const baseUrl = getBackendBaseUrl();
              const detailsUrl = `${
                baseUrl ? baseUrl.replace(/\/$/, "") : ""
              }/api/platforms/${currentPlatform?.id}/projects/${currentProject.id}`;
              const resp = await http.get<{
                project: {
                  id: string;
                  name: string;
                  description?: string;
                  createdAt: string;
                  users: Array<{ id: string; email: string; role: string }>;
                };
              }>(detailsUrl);
              setProjectDetails(resp.data.project);
            } catch {
              // silent
            }
          }
        }
      } catch {
        // silent; non-blocking for layout
      }
    })();
  }, [
    restoreCtx,
    loadFullContext,
    currentProject?.id,
    setProjectDetails,
    loadProjectsForCurrentPlatform,
  ]);

  if (!isAuthenticated) {
    // Preserve the current path when redirecting to sign-in
    const currentPath = location.pathname + location.search;
    return (
      <Navigate
        to={`/auth/sign-in?redirect=${encodeURIComponent(currentPath)}`}
        replace
      />
    );
  }

  const handleSignOut = () => {
    try {
      signOut();
      clearCtx();
      toastSuccess("Signed out", "You have been logged out safely");
    } finally {
      navigate("/auth/sign-in", { replace: true });
    }
  };

  // If we're on the flow editor, render without sidebar
  if (isFlowEditor) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-theme-background">
      <div className="flex h-screen">
        <aside className="flex h-full w-64 flex-col bg-theme-form/95 backdrop-blur-md border-r border-white/20 dark:border-white/10 shadow-xl">
          <div className="flex items-center justify-between w-full gap-3 border-b border-white/20 dark:border-white/10 px-6 py-6">
            <div className="relative w-[80%]">
              <button
                type="button"
                onClick={() => setIsDropdownOpen((o) => !o)}
                className="flex w-full items-center justify-between rounded-2xl border border-white/20 dark:border-white/10 bg-theme-input px-4 py-2.5 text-left text-sm font-semibold text-theme-primary shadow-sm transition-all duration-200 hover:bg-theme-input-focus focus:outline-none focus:ring-2 focus:ring-theme-primary/20"
                aria-haspopup="listbox"
                aria-expanded={isDropdownOpen}
              >
                <div className="min-w-0 flex-1">
                  <span
                    className="block truncate"
                    title={currentProject?.name ?? "Select project"}
                  >
                    {currentProject?.name ?? "Select project"}
                  </span>
                </div>
                <ChevronDown
                  size={16}
                  className="ml-2 shrink-0 text-theme-secondary"
                />
              </button>
            </div>
            {isDropdownOpen && (
              <div className="absolute left-5 top-18 z-20 mt-2 w-[80%] overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 bg-theme-input backdrop-blur-md shadow-xl">
                <div className="border-b border-white/20 dark:border-white/10 p-3">
                  <div
                    className="mb-2 text-xs font-semibold uppercase tracking-wider text-theme-secondary truncate"
                    title={currentPlatform?.name ?? "Platform"}
                  >
                    {currentPlatform?.name ?? "Platform"}
                  </div>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-theme-tertiary">
                      <Search size={14} />
                    </span>
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search projects"
                      className="block w-full rounded-xl border border-white/20 dark:border-white/10 bg-theme-input px-3 py-2 pl-9 text-sm text-theme-primary placeholder:text-theme-tertiary outline-none transition-all duration-200 focus:bg-theme-input-focus focus:ring-2 focus:ring-theme-primary/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentPlatform?.id) {
                        toastError(
                          "Missing platform",
                          "No platform context available"
                        );
                        return;
                      }
                      setIsEditingProject(false);
                      setEditProjectId(null);
                      setNewProjectName("");
                      setNewProjectDesc("");
                      setEditOriginalName("");
                      setEditOriginalDesc("");
                      setIsCreateOpen(true);
                      setIsDropdownOpen(false);
                    }}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#b3a1ff]/20 bg-[#b3a1ff]/10 px-3 py-2 text-sm font-semibold text-[#b3a1ff] transition-all duration-200 hover:bg-[#b3a1ff]/20 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-theme-accent/20"
                  >
                    <Plus size={16} /> Create project
                  </button>
                </div>

                <ProjectList
                  platforms={platforms}
                  platformId={currentPlatform?.id ?? ""}
                  currentProjectId={currentProject?.id ?? ""}
                  searchQuery={searchQuery}
                  onSelect={(proj) => {
                    if (!currentPlatform?.id) return;
                    setCurrentProject(currentPlatform.id, {
                      id: proj.id,
                      name: proj.name,
                      description: proj.description,
                    });
                    try {
                      sessionStorage.setItem(
                        "zw_last_selected_platform",
                        currentPlatform.id
                      );
                      sessionStorage.setItem(
                        "zw_last_selected_project",
                        proj.id
                      );
                    } catch {
                      /* noop */
                    }
                    setIsDropdownOpen(false);
                    toastSuccess("Project switched", proj.name);
                    // Inform backend about project context switch
                    (async () => {
                      try {
                        await updateProjectContext(proj.id);
                      } catch {
                        // silent; non-blocking for UX
                      }
                    })();
                    // Fetch latest details for selected project
                    (async () => {
                      try {
                        const baseUrl = getBackendBaseUrl();
                        const detailsUrl = `${
                          baseUrl ? baseUrl.replace(/\/$/, "") : ""
                        }/api/platforms/${currentPlatform?.id}/projects/${proj.id}`;
                        const resp = await http.get<{
                          project: {
                            id: string;
                            name: string;
                            description?: string;
                            createdAt: string;
                            users: Array<{
                              id: string;
                              email: string;
                              role: string;
                            }>;
                          };
                        }>(detailsUrl);
                        setProjectDetails(resp.data.project);
                      } catch {
                        // silent
                      }
                    })();
                  }}
                  onDeleteRequested={(proj) => {
                    setProjectToDelete({ id: proj.id, name: proj.name });
                    setIsDeleteProjectOpen(true);
                    setIsDropdownOpen(false);
                  }}
                  onEditRequested={(proj) => {
                    setIsEditingProject(true);
                    setEditProjectId(proj.id);
                    setNewProjectName(proj.name);
                    setNewProjectDesc(proj.description ?? "");
                    setEditOriginalName(proj.name);
                    setEditOriginalDesc(proj.description ?? "");
                    setIsCreateOpen(true);
                    setIsDropdownOpen(false);
                  }}
                />
              </div>
            )}

            <button
              className="rounded-2xl p-2.5 text-theme-secondary transition-all duration-200 hover:bg-theme-input hover:text-theme-primary hover:scale-105"
              aria-label="Settings"
            >
              <Settings size={18} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-8 scrollbar-theme">
            <div className="space-y-6">
              {/* Main Navigation */}
              <ul className="space-y-1">
                {navItems.main.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-[#b3a1ff] text-[#222222] shadow-lg"
                            : "text-theme-secondary hover:bg-theme-input hover:text-theme-primary"
                        }`
                      }
                    >
                      <item.icon size={16} />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>

              {/* Products Section */}
              <div>
                <h3 className="px-4 text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-3">
                  Products
                </h3>
                <ul className="space-y-1">
                  {navItems.products.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 ${
                            isActive
                              ? "bg-theme-primary text-theme-inverse shadow-sm border border-theme-primary"
                              : "text-theme-secondary hover:bg-theme-surface-hover hover:text-theme-primary"
                          }`
                        }
                      >
                        <item.icon size={16} />
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Misc Section */}
              <div>
                <h3 className="px-4 text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-3">
                  Misc
                </h3>
                <ul className="space-y-1">
                  {navItems.misc.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 ${
                            isActive
                              ? "bg-theme-primary text-theme-inverse shadow-sm border border-theme-primary"
                              : "text-theme-secondary hover:bg-theme-surface-hover hover:text-theme-primary"
                          }`
                        }
                      >
                        <item.icon size={16} />
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Others Section */}
              <div>
                <h3 className="px-4 text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-3">
                  Others
                </h3>
                <ul className="space-y-1">
                  {navItems.others.map((item) => (
                    <li key={item.to}>
                      {item.label === "Invite User" ? (
                        <button
                          type="button"
                          onClick={() => setIsInviteOpen(true)}
                          className="w-full text-left flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-theme-secondary transition-all duration-200 hover:bg-theme-input hover:text-theme-primary"
                        >
                          <item.icon size={16} />
                          {item.label}
                        </button>
                      ) : (
                        <NavLink
                          to={item.to}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 ${
                              isActive
                                ? "bg-theme-primary text-theme-inverse shadow-sm border border-theme-primary"
                                : "text-theme-secondary hover:bg-theme-surface-hover hover:text-theme-primary"
                            }`
                          }
                        >
                          <item.icon size={16} />
                          {item.label}
                        </NavLink>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </nav>

          <div className="flex flex-col items-center justify-center border-t border-white/20 dark:border-white/10 p-4">
            <ThemeToggle
              variant="dropdown"
              dropdownPosition="top"
              widthFull={true}
              className="w-full"
            />
            <div className="flex items-center gap-3 rounded-2xl bg-theme-input p-2 pt-4">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  className="h-8 w-8 rounded-xl object-cover ring-2 ring-white shadow-md"
                  alt={user.name ?? "User avatar"}
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#b3a1ff] text-white ring-2 ring-white shadow-md">
                  <User2 size={24} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-theme-primary">
                  {user?.name ?? "User"}
                </div>
                <div className="truncate text-xs text-theme-secondary">
                  {user?.email ?? ""}
                </div>
              </div>
              <button
                className="rounded-2xl p-2.5 text-theme-secondary transition-all duration-200 hover:bg-theme-input hover:text-theme-primary hover:scale-105"
                onClick={handleSignOut}
                aria-label="Sign out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-theme-background scrollbar-theme">
          <div className={location.pathname === "/home" || isPlatformAdmin ? "" : "p-8"}>
            <Outlet />
          </div>
        </main>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-theme-form/95 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/20 dark:border-white/10 p-6">
              <div>
                <h3 className="text-lg font-semibold text-theme-primary">
                  {isEditingProject ? "Edit Project" : "Create Project"}
                </h3>
                <p className="mt-1 text-sm text-theme-secondary">
                  {isEditingProject
                    ? `Update project in ${
                        currentPlatform?.name ?? "your platform"
                      }.`
                    : `Add a project to ${
                        currentPlatform?.name ?? "your platform"
                      }.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  setIsEditingProject(false);
                  setEditProjectId(null);
                }}
                className="rounded-2xl p-2 text-theme-tertiary transition-all duration-200 hover:bg-theme-input hover:text-theme-primary hover:scale-105 focus:outline-none focus:ring-2 focus:ring-theme-primary/20"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-theme-primary">
                  Project name
                </label>
                <input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Sales"
                  className="block w-full rounded-xl border border-white/20 dark:border-white/10 bg-theme-input px-3 py-2.5 text-sm text-theme-primary placeholder:text-theme-secondary outline-none transition-all duration-200 focus:border-[#b3a1ff] focus:ring-4 focus:ring-[#b3a1ff]/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-theme-primary">
                  Description
                </label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Project for sales team"
                  rows={3}
                  className="block w-full rounded-xl border border-white/20 dark:border-white/10 bg-theme-input px-3 py-2.5 text-sm text-theme-primary placeholder:text-theme-secondary outline-none transition-all duration-200 focus:border-[#b3a1ff] focus:ring-4 focus:ring-[#b3a1ff]/10"
                />
              </div>
            </div>
            <div className="px-6 pb-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-theme-secondary transition-all duration-200 hover:bg-theme-input-focus"
                onClick={() => {
                  setIsCreateOpen(false);
                  setIsEditingProject(false);
                  setEditProjectId(null);
                }}
              >
                Cancel
              </button>
              {isEditingProject ? (
                <button
                  type="button"
                  disabled={
                    isUpdatingProject ||
                    (newProjectName.trim() === editOriginalName.trim() &&
                      (newProjectDesc.trim() || "") ===
                        (editOriginalDesc.trim() || "")) ||
                    newProjectName.trim().length < 2
                  }
                  onClick={async () => {
                    if (!currentPlatform?.id || !editProjectId) {
                      toastError(
                        "Missing context",
                        "Platform or project missing"
                      );
                      return;
                    }
                    const name = newProjectName.trim();
                    const description = newProjectDesc.trim() || undefined;
                    setIsUpdatingProject(true);
                    try {
                      const baseUrl = getBackendBaseUrl();
                      const url = `${
                        baseUrl ? baseUrl.replace(/\/$/, "") : ""
                      }/api/platforms/${
                        currentPlatform.id
                      }/projects/${editProjectId}`;
                      await http.put(url, { name, description });
                      const platformId = currentPlatform.id;
                      const platform = platforms.find(
                        (p) => p.id === platformId
                      );
                      const existing = platform?.projects ?? [];
                      const updatedProject = {
                        id: editProjectId,
                        name,
                        description,
                      };
                      const nextProjects = existing.map((p) =>
                        p.id === editProjectId ? updatedProject : p
                      );
                      setPlatformProjects(platformId, nextProjects);
                      if (currentProject?.id === editProjectId) {
                        setCurrentProject(platformId, updatedProject);
                      }
                      toastSuccess("Project updated", name);
                      setIsCreateOpen(false);
                      setIsEditingProject(false);
                      setEditProjectId(null);
                    } catch (error: unknown) {
                      const message =
                        extractAxiosMessage(error) ||
                        "Failed to update project";
                      toastError("Update project failed", message);
                    } finally {
                      setIsUpdatingProject(false);
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#b3a1ff] px-5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#a08fff] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUpdatingProject ? "Updating…" : "Update"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={async () => {
                    if (!currentPlatform?.id) {
                      toastError(
                        "Missing platform",
                        "No platform context available"
                      );
                      return;
                    }
                    const name = newProjectName.trim();
                    if (name.length < 2) {
                      toastError(
                        "Invalid name",
                        "Project name must be at least 2 characters"
                      );
                      return;
                    }
                    setIsCreating(true);
                    try {
                      const baseUrl = getBackendBaseUrl();
                      const url = `${
                        baseUrl ? baseUrl.replace(/\/$/, "") : ""
                      }/api/platforms/${currentPlatform.id}/projects`;
                      const resp = await http.post<{
                        message: string;
                        project: {
                          id: string;
                          name: string;
                          description?: string;
                        };
                      }>(url, {
                        name,
                        description: newProjectDesc.trim() || undefined,
                      });
                      const created = resp.data.project;
                      addProjectToPlatform(currentPlatform.id, created);
                      setIsCreateOpen(false);
                      setNewProjectName("");
                      setNewProjectDesc("");
                      toastSuccess("Project created", created.name);
                    } catch (error: unknown) {
                      const message =
                        extractAxiosMessage(error) ||
                        "Failed to create project";
                      toastError("Create project failed", message);
                    } finally {
                      setIsCreating(false);
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#b3a1ff] px-5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#a08fff] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreating ? "Creating…" : "Create"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isInviteOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-theme-form/95 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/20 dark:border-white/10 p-6">
              <div>
                <h3 className="text-lg font-semibold text-theme-primary">
                  Invite user
                </h3>
                <p className="mt-1 text-sm text-theme-secondary">
                  Send an invitation to your platform or a project.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsInviteOpen(false);
                  setInviteEmail("");
                  setInviteScope("platform");
                  setInviteRole("MEMBER");
                  setSelectedProjectIds([]);
                }}
                className="rounded-2xl p-2 text-theme-tertiary transition-all duration-200 hover:bg-theme-input hover:text-theme-primary hover:scale-105 focus:outline-none focus:ring-2 focus:ring-theme-primary/20"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-theme-primary">
                  Email
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="invitee@example.com"
                  className="block w-full rounded-2xl border border-white/20 dark:border-white/10 bg-theme-input px-3 py-2.5 text-sm text-theme-primary placeholder:text-theme-secondary outline-none transition-all duration-200 focus:border-[#b3a1ff] focus:ring-4 focus:ring-[#b3a1ff]/10"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-theme-primary">
                    Invite to
                  </label>
                  <div className="relative" data-dropdown>
                    <button
                      type="button"
                      onClick={() =>
                        setIsScopeDropdownOpen(!isScopeDropdownOpen)
                      }
                      className="flex w-full items-center justify-between rounded-xl border border-white/20 dark:border-white/10 bg-theme-input px-3 py-2.5 text-left text-sm text-theme-primary transition-all duration-200 hover:bg-theme-input-focus focus:outline-none focus:border-[#b3a1ff] focus:ring-4 focus:ring-[#b3a1ff]/10"
                    >
                      <span>
                        {inviteScope === "platform"
                          ? "Entire Platform"
                          : "Specific project(s)"}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-theme-tertiary transition-transform duration-200 ${
                          isScopeDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isScopeDropdownOpen && (
                      <div className="absolute left-0 right-0 z-10 mt-1 overflow-hidden rounded-xl border border-white/20 dark:border-white/10 bg-theme-form/95 backdrop-blur-md shadow-lg">
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setInviteScope("platform");
                              setIsScopeDropdownOpen(false);
                            }}
                            className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                              inviteScope === "platform"
                                ? "bg-[#b3a1ff]/10 text-theme-primary"
                                : "text-theme-primary hover:bg-theme-input-focus"
                            }`}
                          >
                            Entire Platform
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setInviteScope("project");
                              setIsScopeDropdownOpen(false);
                            }}
                            className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                              inviteScope === "project"
                                ? "bg-[#b3a1ff]/10 text-theme-primary"
                                : "text-theme-primary hover:bg-theme-input-focus"
                            }`}
                          >
                            Specific project(s)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-theme-primary">
                    Role
                  </label>
                  <div className="relative" data-dropdown>
                    <button
                      type="button"
                      onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                      className="flex w-full items-center justify-between rounded-xl border border-white/20 dark:border-white/10 bg-theme-input px-3 py-2.5 text-left text-sm text-theme-primary transition-all duration-200 hover:bg-theme-input-focus focus:outline-none focus:border-[#b3a1ff] focus:ring-4 focus:ring-[#b3a1ff]/10"
                    >
                      <span>{inviteRole}</span>
                      <ChevronDown
                        size={16}
                        className={`text-theme-tertiary transition-transform duration-200 ${
                          isRoleDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isRoleDropdownOpen && (
                      <div className="absolute left-0 right-0 z-10 mt-1 overflow-hidden rounded-xl border border-white/20 dark:border-white/10 bg-theme-form/95 backdrop-blur-md shadow-lg">
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setInviteRole("ADMIN");
                              setIsRoleDropdownOpen(false);
                            }}
                            className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                              inviteRole === "ADMIN"
                                ? "bg-[#b3a1ff]/10 text-theme-primary"
                                : "text-theme-primary hover:bg-theme-input-focus"
                            }`}
                          >
                            ADMIN
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setInviteRole("MEMBER");
                              setIsRoleDropdownOpen(false);
                            }}
                            className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                              inviteRole === "MEMBER"
                                ? "bg-[#b3a1ff]/10 text-theme-primary"
                                : "text-theme-primary hover:bg-theme-input-focus"
                            }`}
                          >
                            MEMBER
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {inviteScope === "project" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-theme-primary">
                    Select project(s)
                  </label>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-white/20 dark:border-white/10 bg-theme-form/70 backdrop-blur-md p-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-theme-secondary/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-theme-secondary/50">
                    {(
                      platforms.find(
                        (p) => p.id === (currentPlatform?.id ?? "")
                      )?.projects ?? []
                    ).length === 0 ? (
                      <div className="px-2 py-1 text-sm text-theme-secondary">
                        No projects available
                      </div>
                    ) : (
                      (
                        platforms.find(
                          (p) => p.id === (currentPlatform?.id ?? "")
                        )?.projects ?? []
                      ).map((proj) => (
                        <label
                          key={proj.id}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-theme-primary transition-colors hover:bg-theme-input-focus cursor-pointer"
                        >
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              className="peer h-4 w-4 appearance-none rounded border-2 border-white/20 bg-theme-input transition-all duration-200 checked:border-[#b3a1ff] checked:bg-[#b3a1ff] focus:outline-none focus:ring-4 focus:ring-[#b3a1ff]/10"
                              checked={selectedProjectIds.includes(proj.id)}
                              onChange={(e) => {
                                setSelectedProjectIds((prev) =>
                                  e.target.checked
                                    ? [...prev, proj.id]
                                    : prev.filter((id) => id !== proj.id)
                                );
                              }}
                            />
                            <svg
                              className="pointer-events-none absolute left-0.5 top-0.5 h-3 w-3 text-white opacity-0 transition-opacity duration-200 peer-checked:opacity-100"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="3"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                          <span
                            title={proj.name}
                            className="truncate font-medium"
                          >
                            {proj.name}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 pb-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-theme-secondary transition-all duration-200 hover:bg-theme-input-focus"
                onClick={() => {
                  setIsInviteOpen(false);
                  setInviteEmail("");
                  setInviteScope("platform");
                  setInviteRole("MEMBER");
                  setSelectedProjectIds([]);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isInviting}
                onClick={async () => {
                  if (!currentPlatform?.id) {
                    toastError(
                      "Missing platform",
                      "No platform context available"
                    );
                    return;
                  }
                  const email = inviteEmail.trim();
                  const emailValid = /.+@.+\..+/.test(email);
                  if (!emailValid) {
                    toastError(
                      "Invalid email",
                      "Please enter a valid email address"
                    );
                    return;
                  }
                  if (
                    inviteRole === "MEMBER" &&
                    inviteScope === "project" &&
                    selectedProjectIds.length === 0
                  ) {
                    toastError(
                      "Select project(s)",
                      "Choose at least one project for member role"
                    );
                    return;
                  }
                  setIsInviting(true);
                  try {
                    const baseUrl = getBackendBaseUrl();
                    const url = `${
                      baseUrl ? baseUrl.replace(/\/$/, "") : ""
                    }/api/platforms/${currentPlatform.id}/invitations`;
                    const payload: {
                      email: string;
                      role: "ADMIN" | "MEMBER";
                      projectIds?: string[];
                    } = {
                      email,
                      role: inviteRole,
                      ...(inviteRole === "MEMBER" &&
                      inviteScope === "project" &&
                      selectedProjectIds.length > 0
                        ? { projectIds: selectedProjectIds }
                        : {}),
                    };
                    await http.post(url, payload);
                    toastSuccess(
                      "Invitation sent",
                      `${email} has been invited`
                    );
                    setIsInviteOpen(false);
                    setInviteEmail("");
                    setInviteScope("platform");
                    setInviteRole("MEMBER");
                    setSelectedProjectIds([]);
                  } catch (error: unknown) {
                    const message =
                      extractAxiosMessage(error) || "Failed to send invitation";
                    toastError("Invite failed", message);
                  } finally {
                    setIsInviting(false);
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#b3a1ff] px-5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#a08fff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isInviting ? "Inviting…" : "Invite"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteProjectOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-theme-form backdrop-blur-md border border-white/20 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/20 dark:border-white/10 p-6">
              <div>
                <h3 className="text-lg font-semibold text-theme-primary">
                  Delete project
                </h3>
                <p className="text-sm text-theme-secondary">
                  This action cannot be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteProjectOpen(false);
                  setProjectToDelete(null);
                }}
                className="rounded-2xl p-2 text-theme-tertiary transition-all duration-200 hover:bg-theme-input hover:text-theme-primary hover:scale-105 focus:outline-none focus:ring-2 focus:ring-theme-primary/20"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-theme-primary">
                Are you sure you want to delete {""}
                <span className="font-semibold">"{projectToDelete?.name}"</span>
                ?
              </p>
            </div>
            <div className="px-6 pb-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-theme-secondary transition-all duration-200 hover:bg-theme-input-focus"
                onClick={() => {
                  setIsDeleteProjectOpen(false);
                  setProjectToDelete(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingProject || !projectToDelete}
                onClick={async () => {
                  if (!projectToDelete) return;
                  if (!currentPlatform?.id) {
                    toastError(
                      "Missing platform",
                      "No platform context available"
                    );
                    return;
                  }
                  setIsDeletingProject(true);
                  try {
                    const baseUrl = getBackendBaseUrl();
                    const platformId = currentPlatform.id;
                    const url = `${
                      baseUrl ? baseUrl.replace(/\/$/, "") : ""
                    }/api/platforms/${platformId}/projects/${
                      projectToDelete.id
                    }`;
                    await http.delete(url);
                    toastSuccess("Project deleted", projectToDelete.name);
                    const platform = platforms.find((p) => p.id === platformId);
                    const existing = platform?.projects ?? [];
                    const nextProjects = existing.filter(
                      (p) => p.id !== projectToDelete.id
                    );
                    setPlatformProjects(platformId, nextProjects);
                    if (
                      currentProject?.id === projectToDelete.id &&
                      nextProjects.length > 0
                    ) {
                      setCurrentProject(platformId, nextProjects[0]);
                    }
                    setIsDeleteProjectOpen(false);
                    setProjectToDelete(null);
                  } catch (error: unknown) {
                    const message =
                      extractAxiosMessage(error) || "Failed to delete project";
                    toastError("Delete project failed", message);
                  } finally {
                    setIsDeletingProject(false);
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ef4a45] px-5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#e13c38] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeletingProject ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ProjectListProps = {
  platforms: Array<{
    id: string;
    name: string;
    projects?: Array<{ id: string; name: string; description?: string }>;
  }>;
  platformId: string;
  currentProjectId: string;
  searchQuery: string;
  onSelect: (project: {
    id: string;
    name: string;
    description?: string;
  }) => void;
  onDeleteRequested: (project: {
    id: string;
    name: string;
    description?: string;
  }) => void;
  onEditRequested: (project: {
    id: string;
    name: string;
    description?: string;
  }) => void;
};

function ProjectList({
  platforms,
  platformId,
  currentProjectId,
  searchQuery,
  onSelect,
  onDeleteRequested,
  onEditRequested,
}: ProjectListProps) {
  const platform = platforms.find((p) => p.id === platformId);
  const projects = platform?.projects ?? [];
  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q)
      )
    : projects;
  return (
    <ul
      role="listbox"
      className="max-h-64 overflow-y-auto p-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-300"
    >
      {filtered.length === 0 ? (
        <li className="px-3 py-2 text-sm text-theme-secondary">
          No projects found
        </li>
      ) : (
        filtered.map((proj) => (
          <li key={proj.id}>
            <div
              onClick={() => onSelect(proj)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-all duration-200 cursor-pointer ${
                proj.id === currentProjectId
                  ? "bg-theme-primary text-theme-inverse shadow-sm"
                  : "text-theme-primary hover:bg-theme-input"
              }`}
              role="option"
              aria-selected={proj.id === currentProjectId}
            >
              <span
                className={`truncate ${
                  proj.id === currentProjectId
                    ? "text-theme-inverse"
                    : "text-theme-primary"
                }`}
                title={proj.name}
              >
                {proj.name}
              </span>
              <div className="flex items-center gap-2">
                {proj.id === currentProjectId && (
                  <span
                    className={`text-xs font-medium ${
                      proj.id === currentProjectId
                        ? "text-theme-inverse"
                        : "text-theme-primary"
                    }`}
                  >
                    Current
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`Edit ${proj.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditRequested(proj);
                  }}
                  className={`rounded-lg p-1 transition-all duration-200 ${
                    proj.id === currentProjectId
                      ? "text-theme-inverse/80 hover:text-theme-inverse hover:bg-white/20"
                      : "text-theme-secondary hover:text-theme-primary hover:bg-theme-input-focus"
                  }`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${proj.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRequested(proj);
                  }}
                  className={`rounded-lg p-1 transition-all duration-200 ${
                    proj.id === currentProjectId
                      ? "text-theme-inverse/80 hover:text-theme-inverse hover:bg-white/20"
                      : "text-theme-secondary hover:text-theme-primary hover:bg-theme-input-focus"
                  }`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </li>
        ))
      )}
    </ul>
  );
}

function getBackendBaseUrl(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return env.VITE_BACKEND_API_URL ?? env.BACKEND_API_URL ?? "";
}

function extractAxiosMessage(error: unknown): string | null {
  if (typeof error === "object" && error && "response" in error) {
    const err = error as { response?: { data?: { message?: string } } };
    return err.response?.data?.message ?? null;
  }
  if (error instanceof Error) return error.message;
  return null;
}

export default AppLayout;
