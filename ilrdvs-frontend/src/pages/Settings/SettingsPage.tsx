import { useState } from "react";
import { Card, CardBody } from "../../components/ui/Card";
import { Tabs } from "../../components/ui/Tabs";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { CURRENT_USER } from "../../data/mockData";
import { User, Bell, Lock } from "lucide-react";
import { useToast } from "../../components/ui/Toast";

export function SettingsPage() {
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSms, setNotifSms] = useState(false);
  const { push } = useToast();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-navy-900">Profile &amp; Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your officer profile, preferences, and account security.</p>
      </div>

      <Card>
        <CardBody>
          <Tabs
            items={[
              {
                id: "profile",
                label: "Profile",
                icon: <User className="h-3.5 w-3.5" />,
                content: (
                  <div className="max-w-lg space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="h-14 w-14 rounded-full bg-brand-600 text-white text-lg font-semibold flex items-center justify-center">
                        {CURRENT_USER.avatarInitials}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-navy-900">{CURRENT_USER.name}</p>
                        <p className="text-xs text-slate-500">{CURRENT_USER.role}</p>
                      </div>
                    </div>
                    <Input label="Full Name" defaultValue={CURRENT_USER.name} />
                    <Input label="Employee ID" defaultValue={CURRENT_USER.employeeId} disabled />
                    <Input label="Role" defaultValue={CURRENT_USER.role} disabled />
                    <Input label="Department" defaultValue={CURRENT_USER.department} />
                    <Button onClick={() => push("success", "Profile updated.")}>Save Changes</Button>
                  </div>
                ),
              },
              {
                id: "preferences",
                label: "Preferences",
                icon: <Bell className="h-3.5 w-3.5" />,
                content: (
                  <div className="max-w-lg space-y-5">
                    <div>
                      <p className="text-sm font-medium text-navy-900 mb-2">Notifications</p>
                      <label className="flex items-center justify-between py-2 border-b border-slate-100 text-sm text-navy-700">
                        Email notifications for assigned tasks
                        <input type="checkbox" checked={notifEmail} onChange={(e) => setNotifEmail(e.target.checked)} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                      </label>
                      <label className="flex items-center justify-between py-2 text-sm text-navy-700">
                        SMS alerts for high-priority verification
                        <input type="checkbox" checked={notifSms} onChange={(e) => setNotifSms(e.target.checked)} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                      </label>
                    </div>
                    <Select label="Language">
                      <option>English</option>
                      <option>हिन्दी (Hindi)</option>
                    </Select>
                    <Select label="Theme">
                      <option>System default</option>
                      <option>Light</option>
                    </Select>
                    <Button onClick={() => push("success", "Preferences saved.")}>Save Preferences</Button>
                  </div>
                ),
              },
              {
                id: "security",
                label: "Security",
                icon: <Lock className="h-3.5 w-3.5" />,
                content: (
                  <div className="max-w-lg space-y-4">
                    <Input label="Current Password" type="password" />
                    <Input label="New Password" type="password" />
                    <Input label="Confirm New Password" type="password" />
                    <Button onClick={() => push("success", "Password changed.")}>Change Password</Button>
                    <div className="pt-4 border-t border-slate-100">
                      <p className="text-sm font-medium text-navy-900 mb-1">Session Information</p>
                      <p className="text-xs text-slate-500">Last sign-in: Today, 9:14 AM · IP 10.24.6.112 · Mathura Field Office</p>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </CardBody>
      </Card>
    </div>
  );
}
