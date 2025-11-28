import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Cloud } from "lucide-react";
import { FloatingDevices } from "@/components/FloatingDevices";

const Index = () => {
  const [companyCode, setCompanyCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [rememberPassword, setRememberPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login submitted", { companyCode, username, password, captcha });
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Floating Background Devices */}
      <FloatingDevices />
      
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 p-6 z-10">
        <div className="flex items-center gap-3">
          <Cloud className="w-10 h-10 text-primary" strokeWidth={1.5} />
          <h1 className="text-xl font-semibold text-foreground">Guard Patrol System</h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 shadow-xl relative z-10 bg-card/95 backdrop-blur-sm">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="trial">Trial</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Company Code"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value)}
                    className="h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Captcha"
                      value={captcha}
                      onChange={(e) => setCaptcha(e.target.value)}
                      className="h-11 flex-1"
                    />
                    <div className="w-28 h-11 bg-muted rounded-md flex items-center justify-center text-2xl font-bold tracking-wider text-muted-foreground border border-border">
                      3702
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberPassword}
                      onCheckedChange={(checked) => setRememberPassword(checked as boolean)}
                    />
                    <Label htmlFor="remember" className="text-sm cursor-pointer">
                      Remember Password
                    </Label>
                  </div>
                  <a href="#" className="text-sm text-primary hover:underline">
                    Retrieve password
                  </a>
                </div>
                
                <Button type="submit" className="w-full h-11 text-base font-medium">
                  Login
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="trial">
              <div className="text-center py-12 text-muted-foreground">
                <p className="mb-4">Trial mode is currently unavailable.</p>
                <p className="text-sm">Please contact your administrator for access.</p>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 p-6 text-center text-xs text-muted-foreground z-10">
        <p>© 2001-2025 | All Rights Reserved | 辽ICP备11019552号 - 3 | JWM Hi-Tech Development Ltd. | Series cloud Version 2.1.0</p>
      </footer>
    </div>
  );
};

export default Index;
