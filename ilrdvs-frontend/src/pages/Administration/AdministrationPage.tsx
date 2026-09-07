import { useState, useEffect } from "react";
import {
  Users,
  ShieldCheck,
  Settings2,
  ListChecks,
  Database,
  Plug,
  Plus,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
} from "lucide-react";
import { Card, CardBody } from "../../components/ui/Card";
import { Tabs } from "../../components/ui/Tabs";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../components/ui/Toast";
import { CURRENT_USER } from "../../data/mockData";
import {
  getUsers,
  createSystemUser,
  toggleUserStatus,
  type AdminUser,
} from "../../services/admin.service";

const SYSTEM_ROLES = [
  { value: "super_admin", label: "Super Administrator", desc: "Full root access to all portals, users, and audit logs." },
  { value: "state_admin", label: "State Administrator", desc: "State-level oversight and district management." },
  { value: "district_admin", label: "District Administrator", desc: "District collector with tehsil approval workload." },
  { value: "tehsil_officer", label: "Tehsil Land Officer", desc: "Land record document ingestion and management." },
  { value: "verification_officer", label: "Verification Officer", desc: "HITL record review and verification queues." },
  { value: "auditor", label: "Compliance Auditor", desc: "Read-only access to immutable audit trails and compliance reports." },
];

const RULES = [
  { name: "Owner name must match reference database", severity: "Failed" },
  { name: "Survey number format validation", severity: "Warning" },
  { name: "Duplicate survey number + village check", severity: "Warning" },
  { name: "Land area within GIS tolerance (±5%)", severity: "Failed" },
  { name: "Mandatory field completeness check", severity: "Failed" },
];

const INTEGRATIONS = [
  { name: "State Land Records Database", status: "Connected" },
  { name: "GIS / Cadastral Survey Service", status: "Connected" },
  { name: "OCR / HTR Processing Engine", status: "Connected" },
  { name: "Aadhaar Verification Gateway", status: "Not Configured" },
];

export function AdministrationPage() {
  const [tab] = useState("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleName, setRoleName] = useState("tehsil_officer");
  const [scopeType, setScopeType] = useState<string>("tehsil");
  const [scopeId, setScopeId] = useState<string>("TH-HAVELI");

  const { push } = useToast();

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch {
      push("error", "Failed to fetch users from database.");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      push("error", "Please fill in all required fields (Name, Email, Password).");
      return;
    }
    if (password.length < 6) {
      push("error", "Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newUser = await createSystemUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role_name: roleName,
        scope_type: scopeType || undefined,
        scope_id: scopeId ? scopeId.trim() : undefined,
      });

      push("success", `User "${newUser.name}" (${newUser.email}) created successfully.`);
      setIsModalOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setRoleName("tehsil_officer");
      setScopeType("tehsil");
      setScopeId("TH-HAVELI");
      await loadUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create user.";
      push("error", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: AdminUser) => {
    const newStatus = user.status === "active" ? "suspended" : "active";
    try {
      await toggleUserStatus(user.id, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );
      push("success", `User ${user.name} is now ${newStatus}.`);
    } catch {
      push("error", "Failed to update user status.");
    }
  };

  const getRoleLabel = (role?: string) => {
    const found = SYSTEM_ROLES.find((r) => r.value === role);
    return found ? found.label : role || "User";
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-navy-900">Administration</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage system users, roles, permissions, validation rules, and integrations.
          </p>
        </div>
        <Button
          size="sm"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Add New User
        </Button>
      </div>

      <Card>
        <CardBody>
          <Tabs
            defaultTab={tab}
            items={[
              {
                id: "users",
                label: "Users & Accounts",
                icon: <Users className="h-3.5 w-3.5" />,
                content: (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-sm font-semibold text-navy-900">
                          Registered System Users
                        </h2>
                        <p className="text-xs text-slate-500">
                          {users.length} active officer and administrator accounts in MongoDB
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<RefreshCw className={`h-3.5 w-3.5 ${loadingUsers ? "animate-spin" : ""}`} />}
                          onClick={loadUsers}
                          disabled={loadingUsers}
                        >
                          Refresh
                        </Button>
                        <Button
                          size="sm"
                          icon={<Plus className="h-3.5 w-3.5" />}
                          onClick={() => setIsModalOpen(true)}
                        >
                          Add User
                        </Button>
                      </div>
                    </div>

                    {loadingUsers ? (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Loader2 className="h-6 w-6 animate-spin mb-2 text-brand-600" />
                        <p className="text-sm">Loading users from MongoDB...</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-100 rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50/75 border-b border-slate-100 text-left text-xs text-slate-500 font-medium">
                            <tr>
                              <th className="py-3 px-4 font-semibold">User Details</th>
                              <th className="py-3 px-4 font-semibold">Email / Gmail</th>
                              <th className="py-3 px-4 font-semibold">System Role</th>
                              <th className="py-3 px-4 font-semibold">Scope / Jurisdiction</th>
                              <th className="py-3 px-4 font-semibold">Status</th>
                              <th className="py-3 px-4 font-semibold text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {users.map((u) => (
                              <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-4 font-medium text-navy-900">
                                  <div className="flex items-center gap-2">
                                    <span className="h-7 w-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-xs shrink-0">
                                      {u.name.charAt(0).toUpperCase()}
                                    </span>
                                    <span>{u.name}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-slate-600 font-ids text-xs">
                                  {u.email}
                                </td>
                                <td className="py-3 px-4 text-slate-700">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                                    {getRoleLabel(u.role_name)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-slate-500 text-xs">
                                  {u.scope_id ? (
                                    <span className="font-mono bg-slate-50 px-1.5 py-0.5 border border-slate-200 rounded">
                                      {u.scope_id} ({u.scope_type || "scope"})
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">National / Global</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <Badge tone={u.status === "active" ? "success" : "neutral"}>
                                    {u.status === "active" ? "Active" : "Suspended"}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => handleToggleStatus(u)}
                                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded transition-colors ${
                                      u.status === "active"
                                        ? "text-slate-500 hover:text-danger-600 hover:bg-danger-50"
                                        : "text-brand-600 hover:text-brand-700 hover:bg-brand-50"
                                    }`}
                                    title={u.status === "active" ? "Suspend Account" : "Activate Account"}
                                  >
                                    {u.status === "active" ? (
                                      <>
                                        <UserX className="h-3.5 w-3.5" /> Suspend
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck className="h-3.5 w-3.5" /> Activate
                                      </>
                                    )}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ),
              },
              {
                id: "roles",
                label: "Roles & Permissions",
                icon: <ShieldCheck className="h-3.5 w-3.5" />,
                content: (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {SYSTEM_ROLES.map((r) => (
                      <div key={r.value} className="rounded-lg border border-slate-200 p-4 bg-white shadow-sm">
                        <div className="flex items-center gap-2 mb-1.5">
                          <ShieldCheck className="h-4 w-4 text-brand-600" />
                          <p className="text-sm font-semibold text-navy-900">{r.label}</p>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">{r.desc}</p>
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                          <span>Role Key</span>
                          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono text-[11px]">{r.value}</code>
                        </div>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                id: "rules",
                label: "Validation Rules",
                icon: <ListChecks className="h-3.5 w-3.5" />,
                content: (
                  <div className="divide-y divide-slate-100">
                    {RULES.map((r) => (
                      <div key={r.name} className="flex items-center justify-between py-3">
                        <span className="text-sm font-medium text-navy-800">{r.name}</span>
                        <Badge tone={r.severity === "Failed" ? "danger" : "warning"}>{r.severity}</Badge>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                id: "reference",
                label: "Reference Data",
                icon: <Database className="h-3.5 w-3.5" />,
                content: (
                  <p className="text-sm text-slate-500 py-4">
                    Master tables of states, districts, tehsils, and revenue villages synced with Survey of India & NIC database.
                  </p>
                ),
              },
              {
                id: "integrations",
                label: "Integration Status",
                icon: <Plug className="h-3.5 w-3.5" />,
                content: (
                  <div className="divide-y divide-slate-100">
                    {INTEGRATIONS.map((i) => (
                      <div key={i.name} className="flex items-center justify-between py-3">
                        <span className="text-sm font-medium text-navy-800">{i.name}</span>
                        <Badge tone={i.status === "Connected" ? "success" : "neutral"}>{i.status}</Badge>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                id: "config",
                label: "System Configuration",
                icon: <Settings2 className="h-3.5 w-3.5" />,
                content: (
                  <p className="text-sm text-slate-500 py-4">
                    Signed in as {CURRENT_USER.name} ({CURRENT_USER.role}). System configuration is active.
                  </p>
                ),
              },
            ]}
          />
        </CardBody>
      </Card>

      {/* Add User Modal Dialog */}
      <Modal
        open={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title="Add New System User"
        size="md"
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              loading={isSubmitting}
              onClick={handleCreateUser}
            >
              Create User Account
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Full Name *"
            placeholder="e.g. Ramesh Kumar"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Email / Gmail Address *"
            type="email"
            placeholder="e.g. officer.ramesh@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Initial Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-navy-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              User can log in immediately with this email and password.
            </p>
          </div>

          <Select
            label="System Role *"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
          >
            {SYSTEM_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Scope Level"
              value={scopeType}
              onChange={(e) => setScopeType(e.target.value)}
            >
              <option value="">National / Universal</option>
              <option value="state">State</option>
              <option value="district">District</option>
              <option value="tehsil">Tehsil</option>
            </Select>

            <Input
              label="Scope Code / ID"
              placeholder="e.g. TH-HAVELI or D-PUNE"
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
