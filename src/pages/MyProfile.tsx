import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, Calendar, CreditCard, Building2, Loader2 } from 'lucide-react';

interface ProfileData {
  full_name: string;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  id_number: string | null;
  employee_id: string | null;
  company_id: string | null;
  guard_status: string | null;
  company_name?: string;
}

export default function MyProfile() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    birth_date: '',
    id_number: '',
  });

  useEffect(() => {
    if (user?.id) fetchProfile();
  }, [user?.id]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, phone, email, birth_date, id_number, employee_id, company_id, guard_status, companies:company_id(name)')
      .eq('id', user!.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      setLoading(false);
      return;
    }

    const profileData: ProfileData = {
      ...data,
      company_name: (data.companies as any)?.name || null,
    };
    setProfile(profileData);
    setForm({
      full_name: data.full_name || '',
      phone: data.phone || '',
      email: data.email || '',
      birth_date: data.birth_date || '',
      id_number: data.id_number || '',
    });
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast({ title: t('myProfile.nameRequired'), variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        birth_date: form.birth_date || null,
        id_number: form.id_number.trim() || null,
      })
      .eq('id', user!.id);

    setSaving(false);

    if (error) {
      toast({ title: t('common.updateFailed'), variant: 'destructive' });
    } else {
      toast({ title: t('common.updateSuccess') });
      fetchProfile();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('myProfile.title')}</h1>
        <p className="text-muted-foreground">{t('myProfile.description')}</p>
      </div>

      {/* Read-only info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('myProfile.accountInfo')}</CardTitle>
          <CardDescription>{t('myProfile.accountInfoDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>{t('common.employeeId')}</span>
            </div>
            <span className="font-mono font-medium">{profile?.employee_id || t('common.notSet')}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{t('myProfile.company')}</span>
            </div>
            <span>{profile?.company_name || t('common.notSet')}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{t('common.status')}</span>
            </div>
            <Badge variant={profile?.guard_status === 'active' ? 'default' : 'secondary'}>
              {profile?.guard_status === 'active' ? t('common.active') : t('common.inactive')}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Editable form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('myProfile.personalInfo')}</CardTitle>
          <CardDescription>{t('myProfile.personalInfoDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name" className="flex items-center gap-2">
              <User className="h-4 w-4" /> {t('common.name')} *
            </Label>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> {t('common.phone')}
            </Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> {t('common.email')}
            </Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="birth_date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" /> {t('myProfile.birthDate')}
            </Label>
            <Input
              id="birth_date"
              type="date"
              value={form.birth_date}
              onChange={(e) => setForm(f => ({ ...f, birth_date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="id_number" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> {t('myProfile.idNumber')}
            </Label>
            <Input
              id="id_number"
              value={form.id_number}
              onChange={(e) => setForm(f => ({ ...f, id_number: e.target.value }))}
              maxLength={30}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
