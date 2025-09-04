'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { businessProfile } from '@/data/fixtures';
import { useTranslations } from '@/lib/i18n';
import { toast } from 'sonner';

export function BusinessProfile() {
  const t = useTranslations('es');
  const [profile, setProfile] = useState(businessProfile);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    toast.success('Perfil de empresa actualizado exitosamente');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.settings.businessProfile}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyName">{t.settings.companyName}</Label>
            <Input
              id="companyName"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contactPerson">{t.settings.contactPerson}</Label>
            <Input
              id="contactPerson"
              value={profile.contact}
              onChange={(e) => setProfile({ ...profile, contact: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">{t.settings.email}</Label>
            <Input
              id="email"
              type="email"
              value={profile.email || ''}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">{t.settings.phone}</Label>
            <Input
              id="phone"
              value={profile.phone || ''}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="address">{t.settings.address}</Label>
          <Textarea
            id="address"
            rows={3}
            value={profile.address || ''}
            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="currency">{t.settings.currency}</Label>
          <Input
            id="currency"
            value={profile.currency}
            onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            La moneda no se puede cambiar en esta versión
          </p>
        </div>

        <div className="pt-4">
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Guardando...' : t.common.save}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}