// =====================================================
// HOOK - COMPANY SETTINGS
// Hook para gestionar configuraciones dinámicas de la empresa
// =====================================================

import { useState, useEffect, useCallback } from "react";
import { settingsService, type BusinessProfile, type DianSettings } from "@/lib/api/settings";

interface CompanySettings {
  businessProfile: BusinessProfile;
  dianSettings: DianSettings;
}

const defaultBusinessProfile: BusinessProfile = {
  name: "HYR Constructora & Soldadura",
  contact: "Administrador",
  email: "contacto@hyr-constructora.com",
  phone: "+57 314 567-8901",
  address: "Calle 45 No. 23-67, Sector Industrial\nBarranquilla, Atlántico, Colombia",
  currency: "COP",
  taxId: "901.234.567-8",
  website: "www.hyr-constructora.com"
};

const defaultDianSettings: DianSettings = {
  resolutionNumber: "000000000042",
  resolutionValidUntil: "2025-12-31",
  environment: "2", // Habilitación/Pruebas por defecto
  xmlType: "103"
};

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings>({
    businessProfile: defaultBusinessProfile,
    dianSettings: defaultDianSettings
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [businessProfile, dianSettings] = await Promise.all([
        settingsService.getBusinessProfile().catch(() => defaultBusinessProfile),
        settingsService.getDianSettings().catch(() => defaultDianSettings)
      ]);

      setSettings({
        businessProfile,
        dianSettings
      });
    } catch (error: unknown) {
      console.error("Error fetching company settings:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage || "Error al cargar configuraciones");
      
      // Usar valores por defecto en caso de error
      setSettings({
        businessProfile: defaultBusinessProfile,
        dianSettings: defaultDianSettings
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const updateBusinessProfile = useCallback(async (profile: BusinessProfile) => {
    setLoading(true);
    setError(null);

    try {
      await settingsService.updateBusinessProfile(profile);
      setSettings(prev => ({
        ...prev,
        businessProfile: profile
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage || "Error al actualizar perfil de empresa");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDianSettings = useCallback(async (dian: DianSettings) => {
    setLoading(true);
    setError(null);

    try {
      await settingsService.updateDianSettings(dian);
      setSettings(prev => ({
        ...prev,
        dianSettings: dian
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage || "Error al actualizar configuraciones DIAN");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    businessProfile: settings.businessProfile,
    dianSettings: settings.dianSettings,
    loading,
    error,
    updateBusinessProfile,
    updateDianSettings,
    refetch: fetchSettings,
  };
}

export function useBusinessProfile() {
  const { businessProfile, loading, error, updateBusinessProfile, refetch } = useCompanySettings();
  
  return {
    profile: businessProfile,
    loading,
    error,
    update: updateBusinessProfile,
    refetch,
  };
}

export function useDianSettings() {
  const { dianSettings, loading, error, updateDianSettings, refetch } = useCompanySettings();
  
  return {
    settings: dianSettings,
    loading,
    error,
    update: updateDianSettings,
    refetch,
  };
}