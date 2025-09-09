"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "@/lib/i18n";
import { toast } from "sonner";
import {
  settingsService,
  BusinessProfile as BusinessProfileType,
} from "@/lib/api/settings";
import { handleApiError } from "@/lib/api";

// Usar el tipo del API
type BusinessProfileData = BusinessProfileType;

export function BusinessProfile() {
  const t = useTranslations("es");

  const [profile, setProfile] = useState<BusinessProfileData>({
    name: "HYR Constructora & Soldadura",
    contact: "Ing. Roberto Herrera",
    email: "contacto@hyr-constructora.com",
    phone: "+57 314 567-8901",
    address:
      "Calle 45 No. 23-67, Sector Industrial\nBarranquilla, Atlántico, Colombia",
    currency: "COP (Peso Colombiano)",
    taxId: "901.234.567-8",
    website: "www.hyr-constructora.com",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Cargar perfil desde API al montar el componente
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsInitialLoading(true);
        const profileData = await settingsService.getBusinessProfile();
        setProfile(profileData);
      } catch (error) {
        console.error("Error loading business profile:", error);
        const errorMessage = handleApiError(error);
        toast.error("Error al cargar perfil de empresa: " + errorMessage);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Validar datos antes de enviar
      const validation = settingsService.validateBusinessProfile(profile);
      if (!validation.isValid) {
        validation.errors.forEach(error => toast.error(error));
        return;
      }

      // Guardar en API
      await settingsService.updateBusinessProfile(profile);
      toast.success("Perfil de empresa actualizado exitosamente");

      // Remover datos de localStorage si existen (migración)
      localStorage.removeItem("hyr_business_profile");
    } catch (error) {
      console.error("Error saving business profile:", error);
      const errorMessage = handleApiError(error);
      toast.error("Error al guardar el perfil de empresa: " + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    try {
      // Restablecer valores por defecto desde el API
      const response = await settingsService.reset("business_profile");
      setProfile(response.data.value);
      toast.success("Perfil restaurado a valores por defecto");
    } catch (error) {
      console.error("Error resetting business profile:", error);
      const errorMessage = handleApiError(error);
      toast.error("Error al restaurar perfil: " + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.settings.businessProfile}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Información general de la empresa para documentos y contratos
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isInitialLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">
              Cargando perfil...
            </span>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">{t.settings.companyName}</Label>
                <Input
                  id="companyName"
                  value={profile.name}
                  onChange={e =>
                    setProfile({ ...profile, name: e.target.value })
                  }
                  placeholder="Nombre de la empresa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPerson">
                  {t.settings.contactPerson}
                </Label>
                <Input
                  id="contactPerson"
                  value={profile.contact}
                  onChange={e =>
                    setProfile({ ...profile, contact: e.target.value })
                  }
                  placeholder="Persona de contacto"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t.settings.email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={e =>
                    setProfile({ ...profile, email: e.target.value })
                  }
                  placeholder="correo@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t.settings.phone}</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={e =>
                    setProfile({ ...profile, phone: e.target.value })
                  }
                  placeholder="+57 XXX XXX-XXXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxId">NIT / RUT</Label>
                <Input
                  id="taxId"
                  value={profile.taxId || ""}
                  onChange={e =>
                    setProfile({ ...profile, taxId: e.target.value })
                  }
                  placeholder="XXX.XXX.XXX-X"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Sitio Web</Label>
                <Input
                  id="website"
                  value={profile.website || ""}
                  onChange={e =>
                    setProfile({ ...profile, website: e.target.value })
                  }
                  placeholder="www.empresa.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">{t.settings.address}</Label>
              <Textarea
                id="address"
                rows={3}
                value={profile.address}
                onChange={e =>
                  setProfile({ ...profile, address: e.target.value })
                }
                placeholder="Dirección completa de la empresa..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">{t.settings.currency}</Label>
              <Input
                id="currency"
                value={profile.currency}
                onChange={e =>
                  setProfile({ ...profile, currency: e.target.value })
                }
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                La moneda no se puede cambiar en esta versión
              </p>
            </div>

            <div className="pt-4 flex space-x-2">
              <Button
                onClick={handleSave}
                disabled={isLoading || isInitialLoading}
              >
                {isLoading ? "Guardando..." : t.common.save}
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isLoading || isInitialLoading}
              >
                {isLoading ? "Restaurando..." : "Restaurar Valores"}
              </Button>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold mb-2">
                Vista Previa en Documentos
              </h3>
              <div className="p-4 bg-gray-50 rounded-lg text-sm">
                <div className="font-bold text-base">{profile.name}</div>
                <div>{profile.contact}</div>
                <div>
                  {profile.email} • {profile.phone}
                </div>
                <div className="whitespace-pre-line mt-1">
                  {profile.address}
                </div>
                {profile.taxId && (
                  <div className="mt-1">NIT: {profile.taxId}</div>
                )}
                {profile.website && <div>{profile.website}</div>}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
