import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Cloud } from 'lucide-react';
import { FloatingDevices } from '@/components/FloatingDevices';
import { useAuth } from '@/components/auth/AuthProvider';
export default function Login() {
  const {
    user,
    signIn,
    loading
  } = useAuth();
  const [email, setEmail] = useState('');
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
      await signIn(email, password);
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="min-h-screen bg-background relative overflow-hidden">
      <FloatingDevices />
      
      <header className="absolute top-0 left-0 right-0 p-6 z-10">
        <div className="flex items-center gap-3">
          <Cloud className="w-10 h-10 text-primary" strokeWidth={1.5} />
          <h1 className="text-xl font-semibold text-foreground">国管巡更系统-港不</h1>
        </div>
      </header>

      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 shadow-xl relative z-10 bg-card/95 backdrop-blur-sm">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="trial">试用</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Input type="email" placeholder="邮箱地址" value={email} onChange={e => setEmail(e.target.value)} className="h-11" required />
                </div>
                
                <div className="space-y-2">
                  <Input type="password" placeholder="密码" value={password} onChange={e => setPassword(e.target.value)} className="h-11" required />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember" checked={rememberPassword} onCheckedChange={checked => setRememberPassword(checked as boolean)} />
                    <Label htmlFor="remember" className="text-sm cursor-pointer">
                      记住密码
                    </Label>
                  </div>
                  <a href="#" className="text-sm text-primary hover:underline">
                    忘记密码？
                  </a>
                </div>
                
                <Button type="submit" className="w-full h-11 text-base font-medium" disabled={isLoading}>
                  {isLoading ? '登录中...' : '登录'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="trial">
              <div className="text-center py-12 text-muted-foreground">
                <p className="mb-4">试用模式暂不可用</p>
                <p className="text-sm">请联系管理员获取访问权限</p>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <footer className="absolute bottom-0 left-0 right-0 p-6 text-center text-xs text-muted-foreground z-10">
        
      </footer>
    </div>;
}