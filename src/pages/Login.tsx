import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Cloud, User, Mail } from 'lucide-react';
import { FloatingDevices } from '@/components/FloatingDevices';
import { useAuth } from '@/components/auth/AuthProvider';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function Login() {
  const { user, signIn, loading } = useAuth();
  const { t } = useTranslation();
  const [loginType, setLoginType] = useState<'email' | 'staffId'>('staffId');
  const [email, setEmail] = useState('');
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberPassword, setRememberPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (user && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const loginEmail = loginType === 'staffId' 
        ? `${staffId.toLowerCase()}@guard.local`
        : email;
      await signIn(loginEmail, password);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <FloatingDevices />
      
      <header className="absolute top-0 left-0 right-0 p-6 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cloud className="w-10 h-10 text-primary" strokeWidth={1.5} />
            <h1 className="text-xl font-semibold text-foreground">{t('login.title')}</h1>
          </div>
        </div>
      </header>

      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 shadow-xl relative z-10 bg-card/95 backdrop-blur-sm">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">{t('common.login')}</TabsTrigger>
              <TabsTrigger value="trial">{t('common.trial')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="flex items-center justify-center gap-4 p-1 bg-muted rounded-lg">
                  <button
                    type="button"
                    onClick={() => setLoginType('staffId')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      loginType === 'staffId' 
                        ? 'bg-background shadow-sm text-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <User className="h-4 w-4" />
                    {t('login.staffIdLogin')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginType('email')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      loginType === 'email' 
                        ? 'bg-background shadow-sm text-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Mail className="h-4 w-4" />
                    {t('login.emailLogin')}
                  </button>
                </div>

                <div className="space-y-2">
                  {loginType === 'staffId' ? (
                    <Input 
                      type="text" 
                      placeholder={t('login.staffIdPlaceholder')} 
                      value={staffId} 
                      onChange={e => setStaffId(e.target.value.toUpperCase())} 
                      className="h-11" 
                      required 
                    />
                  ) : (
                    <Input 
                      type="email" 
                      placeholder={t('login.emailPlaceholder')} 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      className="h-11" 
                      required 
                    />
                  )}
                </div>
                
                <div className="space-y-2">
                  <Input 
                    type="password" 
                    placeholder={t('login.passwordPlaceholder')} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="h-11" 
                    required 
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberPassword} 
                      onCheckedChange={checked => setRememberPassword(checked as boolean)} 
                    />
                    <Label htmlFor="remember" className="text-sm cursor-pointer">
                      {t('login.rememberPassword')}
                    </Label>
                  </div>
                  <a href="#" className="text-sm text-primary hover:underline">
                    {t('login.forgotPassword')}
                  </a>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-medium" 
                  disabled={isLoading}
                >
                  {isLoading ? t('login.loggingIn') : t('common.login')}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="trial">
              <div className="text-center py-12 text-muted-foreground">
                <p className="mb-4">{t('login.trialUnavailable')}</p>
                <p className="text-sm">{t('login.contactAdmin')}</p>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <footer className="absolute bottom-0 left-0 right-0 p-6 z-10 flex justify-end">
        <LanguageSwitcher variant="outline" showLabel />
      </footer>
    </div>
  );
}
