import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardBody } from "../../components/ui/Card";
import { Tabs } from "../../components/ui/Tabs";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { CURRENT_USER } from "../../data/mockData";
import { User, Bell, Lock } from "lucide-react";
import { useToast } from "../../components/ui/Toast";
import { SUPPORTED_LANGUAGES, changeLanguage } from "../../i18n";

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSms, setNotifSms] = useState(false);
  const { push } = useToast();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-navy-900">{t("nav.settings", "Profile & Settings")}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{t("settings.subtitle", "Manage your officer profile, preferences, and account security.")}</p>
      </div>

      <Card>
        <CardBody>
          <Tabs
            items={[
              {
                id: "profile",
                label: t("header.profile", "Profile"),
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
                    <Input label={t("settings.fullName", "Full Name")} defaultValue={CURRENT_USER.name} />
                    <Input label={t("settings.employeeId", "Employee ID")} defaultValue={CURRENT_USER.employeeId} disabled />
                    <Input label={t("audit.role", "Role")} defaultValue={CURRENT_USER.role} disabled />
                    <Input label={t("settings.department", "Department")} defaultValue={CURRENT_USER.department} />
                    <Button onClick={() => push("success", t("settings.profileUpdated", "Profile updated."))}>{t("common.save", "Save Changes")}</Button>
                  </div>
                ),
              },
              {
                id: "preferences",
                label: t("settings.preferences", "Preferences"),
                icon: <Bell className="h-3.5 w-3.5" />,
                content: (
                  <div className="max-w-lg space-y-5">
                    <div>
                      <p className="text-sm font-medium text-navy-900 mb-2">{t("header.notifications", "Notifications")}</p>
                      <label className="flex items-center justify-between py-2 border-b border-slate-100 text-sm text-navy-700">
                        {t("settings.emailNotifs", "Email notifications for assigned tasks")}
                        <input type="checkbox" checked={notifEmail} onChange={(e) => setNotifEmail(e.target.checked)} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                      </label>
                      <label className="flex items-center justify-between py-2 text-sm text-navy-700">
                        {t("settings.smsAlerts", "SMS alerts for high-priority verification")}
                        <input type="checkbox" checked={notifSms} onChange={(e) => setNotifSms(e.target.checked)} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                      </label>
                    </div>
                    <Select
                      label={t("documents.language", "Language")}
                      value={i18n.language}
                      onChange={(e) => changeLanguage(e.target.value)}
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.nativeName} ({lang.name})
                        </option>
                      ))}
                    </Select>
                    <Select label={t("settings.theme", "Theme")}>
                      <option>{t("settings.systemDefault", "System default")}</option>
                      <option>{t("settings.light", "Light")}</option>
                    </Select>
                    <Button onClick={() => push("success", t("settings.preferencesSaved", "Preferences saved."))}>{t("common.save", "Save Preferences")}</Button>
                  </div>
                ),
              },
              {
                id: "security",
                label: t("settings.security", "Security"),
                icon: <Lock className="h-3.5 w-3.5" />,
                content: (
                  <div className="max-w-lg space-y-4">
                    <Input label={t("settings.currentPassword", "Current Password")} type="password" />
                    <Input label={t("settings.newPassword", "New Password")} type="password" />
                    <Input label={t("settings.confirmPassword", "Confirm New Password")} type="password" />
                    <Button onClick={() => push("success", t("settings.passwordChanged", "Password changed."))}>{t("settings.changePassword", "Change Password")}</Button>
                    <div className="pt-4 border-t border-slate-100">
                      <p className="text-sm font-medium text-navy-900 mb-1">{t("settings.sessionInfo", "Session Information")}</p>
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
