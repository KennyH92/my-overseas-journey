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

      

      <footer className="absolute bottom-0 left-0 right-0 p-6 text-center text-xs text-muted-foreground z-10">
        
      </footer>
    </div>;
}