import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, ClipboardList } from 'lucide-react';
import SiteListTab from '@/components/sites/SiteListTab';
import CheckpointListTab from '@/components/sites/CheckpointListTab';

export default function Sites() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">站点管理</h1>
        <p className="text-muted-foreground mt-1">管理巡更站点及检查点信息</p>
      </div>

      <Tabs defaultValue="sites" className="w-full">
        <TabsList>
          <TabsTrigger value="sites" className="gap-2">
            <MapPin className="w-4 h-4" />
            站点列表
          </TabsTrigger>
          <TabsTrigger value="checkpoints" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            巡更检查点
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sites">
          <SiteListTab />
        </TabsContent>
        <TabsContent value="checkpoints">
          <CheckpointListTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
