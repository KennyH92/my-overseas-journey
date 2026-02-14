import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, ClipboardList } from 'lucide-react';
import SiteListTab from '@/components/sites/SiteListTab';
import CheckpointListTab from '@/components/sites/CheckpointListTab';

export default function Sites() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('sites.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('sites.description')}</p>
      </div>

      <Tabs defaultValue="sites" className="w-full">
        <TabsList>
          <TabsTrigger value="sites" className="gap-2">
            <MapPin className="w-4 h-4" />
            {t('sites.siteList')}
          </TabsTrigger>
          <TabsTrigger value="checkpoints" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            {t('sites.checkpointList')}
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
