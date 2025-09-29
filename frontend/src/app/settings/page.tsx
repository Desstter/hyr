import { BusinessProfile } from "@/components/settings/business-profile";
import { ThemeSettings } from "@/components/settings/theme-settings";
import { ImportExport } from "@/components/settings/import-export";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { PayrollSettings } from "@/components/settings/payroll-settings";
import { useTranslations } from "@/lib/i18n";

export default function SettingsPage() {
  const t = useTranslations("es");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          {t.settings.title}
        </h1>
        <p className="text-muted-foreground">
          Configura tu perfil de empresa y preferencias del sistema
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Business Profile */}
          <div>
            <BusinessProfile />
          </div>

          {/* Theme & Language Settings */}
          <div>
            <ThemeSettings />
          </div>
        </div>

        {/* Payroll Settings */}
        <div>
          <PayrollSettings />
        </div>

        {/* Notification Settings */}
        <div>
          <NotificationSettings />
        </div>

        {/* Import/Export Section */}
        <div>
          <ImportExport />
        </div>
      </div>
    </div>
  );
}
