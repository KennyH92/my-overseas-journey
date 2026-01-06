import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserImport, type ImportUser, type ImportResult } from '@/hooks/use-user-import';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const roleLabels: Record<AppRole, string> = {
  admin: '管理员',
  manager: '经理',
  supervisor: '主管',
  guard: '保安',
};

export function UserImportDialog() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { parseFile, importUsers, parsedUsers, isImporting, clearParsedUsers } = useUserImport();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await parseFile(file);
      setResult(null);
      toast({ title: '文件解析成功', description: `共识别 ${parsedUsers.length} 个用户` });
    } catch (error) {
      toast({
        title: '文件解析失败',
        description: error instanceof Error ? error.message : '请检查文件格式',
        variant: 'destructive',
      });
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (parsedUsers.length === 0) return;

    const importResult = await importUsers(parsedUsers);
    setResult(importResult);
    
    if (importResult.success > 0) {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-counts'] });
    }

    toast({
      title: '导入完成',
      description: `成功 ${importResult.success} 个，失败 ${importResult.failed} 个`,
      variant: importResult.failed > 0 ? 'destructive' : 'default',
    });
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      clearParsedUsers();
      setResult(null);
    }
  };

  const downloadTemplate = () => {
    const template = '姓名,邮箱,密码,角色,电话\n张三,zhangsan@example.com,password123,保安,13800138000\n李四,lisi@example.com,password456,主管,13900139000';
    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '用户导入模板.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          批量导入
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            批量导入用户
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              <Upload className="h-4 w-4 mr-2" />
              选择文件
            </Button>
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              下载模板
            </Button>
            <span className="text-sm text-muted-foreground">
              支持 .xlsx, .xls, .csv 格式
            </span>
          </div>

          {parsedUsers.length > 0 && !result && (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>姓名</TableHead>
                      <TableHead>邮箱</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>电话</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedUsers.slice(0, 10).map((user, index) => (
                      <TableRow key={index}>
                        <TableCell>{user.fullName}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{roleLabels[user.role]}</Badge>
                        </TableCell>
                        <TableCell>{user.phone || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedUsers.length > 10 && (
                <p className="text-sm text-muted-foreground text-center">
                  还有 {parsedUsers.length - 10} 条记录未显示...
                </p>
              )}
              <Button 
                onClick={handleImport} 
                className="w-full"
                disabled={isImporting}
              >
                {isImporting ? '导入中...' : `确认导入 ${parsedUsers.length} 个用户`}
              </Button>
            </>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex gap-4 justify-center">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span>成功: {result.success}</span>
                </div>
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <span>失败: {result.failed}</span>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>邮箱</TableHead>
                        <TableHead>错误信息</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((err, index) => (
                        <TableRow key={index}>
                          <TableCell>{err.email}</TableCell>
                          <TableCell className="text-destructive">{err.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <Button onClick={() => handleClose(false)} className="w-full">
                完成
              </Button>
            </div>
          )}

          {parsedUsers.length === 0 && !result && (
            <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>请选择包含用户数据的Excel或CSV文件</p>
              <p className="text-sm mt-2">
                文件需包含列：姓名、邮箱、密码、角色（可选）、电话（可选）
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
