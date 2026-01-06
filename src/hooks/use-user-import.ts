import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface ImportUser {
  email: string;
  fullName: string;
  password: string;
  role: AppRole;
  phone?: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: { email: string; error: string }[];
}

const roleMap: Record<string, AppRole> = {
  '管理员': 'admin',
  'admin': 'admin',
  '经理': 'manager',
  'manager': 'manager',
  '主管': 'supervisor',
  'supervisor': 'supervisor',
  '保安': 'guard',
  'guard': 'guard',
};

export function useUserImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [parsedUsers, setParsedUsers] = useState<ImportUser[]>([]);
  const { toast } = useToast();

  const parseFile = async (file: File): Promise<ImportUser[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);

          const users: ImportUser[] = jsonData.map((row) => {
            const email = row['邮箱'] || row['email'] || row['Email'] || '';
            const fullName = row['姓名'] || row['name'] || row['Name'] || row['full_name'] || '';
            const password = row['密码'] || row['password'] || row['Password'] || '';
            const roleStr = row['角色'] || row['role'] || row['Role'] || 'guard';
            const phone = row['电话'] || row['phone'] || row['Phone'] || '';
            
            const role = roleMap[roleStr.toLowerCase()] || roleMap[roleStr] || 'guard';

            return {
              email: email.trim(),
              fullName: fullName.trim(),
              password: password.trim(),
              role,
              phone: phone.trim() || undefined,
            };
          }).filter(user => user.email && user.fullName && user.password);

          setParsedUsers(users);
          resolve(users);
        } catch (error) {
          reject(new Error('文件解析失败，请检查文件格式'));
        }
      };

      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsBinaryString(file);
    });
  };

  const importUsers = async (users: ImportUser[]): Promise<ImportResult> => {
    setIsImporting(true);
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (const user of users) {
      try {
        // Validate email format
        if (!user.email.includes('@')) {
          throw new Error('邮箱格式不正确');
        }
        if (user.password.length < 6) {
          throw new Error('密码至少需要6个字符');
        }

        // Register user
        const { data, error } = await supabase.auth.signUp({
          email: user.email,
          password: user.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: user.fullName }
          }
        });

        if (error) throw error;
        if (!data.user) throw new Error('注册失败');

        // Assign role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: data.user.id, role: user.role });
        
        if (roleError) throw roleError;

        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          email: user.email,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    setIsImporting(false);
    return result;
  };

  const clearParsedUsers = () => setParsedUsers([]);

  return {
    parseFile,
    importUsers,
    parsedUsers,
    isImporting,
    clearParsedUsers,
  };
}
