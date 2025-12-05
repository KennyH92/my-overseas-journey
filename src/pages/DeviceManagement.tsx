import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Smartphone, MapPin } from 'lucide-react';

export default function DeviceManagement() {
  const [search, setSearch] = useState('');

  // Fetch checkpoints as devices (they have QR/NFC codes)
  const { data: devices, isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checkpoints')
        .select(`
          *,
          sites:site_id(name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredDevices = devices?.filter(device =>
    device.name.toLowerCase().includes(search.toLowerCase()) ||
    device.qr_code?.toLowerCase().includes(search.toLowerCase()) ||
    device.nfc_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">设备管理</h1>
        <p className="text-muted-foreground">管理巡更点设备和标识码</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              设备列表
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索设备..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>设备名称</TableHead>
                  <TableHead>所属站点</TableHead>
                  <TableHead>二维码</TableHead>
                  <TableHead>NFC码</TableHead>
                  <TableHead>位置</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      暂无设备数据
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDevices?.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">{device.name}</TableCell>
                      <TableCell>{device.sites?.name || '-'}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {device.qr_code || '-'}
                        </code>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {device.nfc_code || '-'}
                        </code>
                      </TableCell>
                      <TableCell>
                        {device.latitude && device.longitude ? (
                          <span className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {device.latitude.toFixed(4)}, {device.longitude.toFixed(4)}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={device.status === 'active' ? 'default' : 'secondary'}>
                          {device.status === 'active' ? '启用' : '停用'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
