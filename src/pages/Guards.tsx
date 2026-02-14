import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const guardSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  employee_id: z.string().optional(),
  phone: z.string().optional(),
  company_id: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

type GuardFormData = z.infer<typeof guardSchema>;

export default function Guards() {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedGuard, setSelectedGuard] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<GuardFormData>({
    resolver: zodResolver(guardSchema),
    defaultValues: {
      name: "",
      employee_id: "",
      phone: "",
      company_id: "",
      status: "active",
    },
  });

  const { data: guards = [], isLoading } = useQuery({
    queryKey: ["guards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guards")
        .select(`
          *,
          companies (
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: GuardFormData) => {
      const { error } = await supabase.from("guards").insert([{
        name: data.name,
        employee_id: data.employee_id || null,
        phone: data.phone || null,
        company_id: data.company_id && data.company_id !== "none" ? data.company_id : null,
        status: data.status,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guards"] });
      toast({ title: t('common.createSuccess') });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t('common.createFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: GuardFormData) => {
      const { error } = await supabase
        .from("guards")
        .update({
          name: data.name,
          employee_id: data.employee_id || null,
          phone: data.phone || null,
          company_id: data.company_id && data.company_id !== "none" ? data.company_id : null,
          status: data.status,
        })
        .eq("id", selectedGuard.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guards"] });
      toast({ title: t('common.updateSuccess') });
      setIsDialogOpen(false);
      setSelectedGuard(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t('common.updateFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("guards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guards"] });
      toast({ title: t('common.deleteSuccess') });
      setIsDeleteDialogOpen(false);
      setSelectedGuard(null);
    },
    onError: (error: any) => {
      toast({
        title: t('common.deleteFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAdd = () => {
    setSelectedGuard(null);
    form.reset({
      name: "",
      employee_id: "",
      phone: "",
      company_id: "none",
      status: "active",
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (guard: any) => {
    setSelectedGuard(guard);
    form.reset({
      name: guard.name,
      employee_id: guard.employee_id || "",
      phone: guard.phone || "",
      company_id: guard.company_id || "none",
      status: guard.status || "active",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (guard: any) => {
    setSelectedGuard(guard);
    setIsDeleteDialogOpen(true);
  };

  const onSubmit = (data: GuardFormData) => {
    if (selectedGuard) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('guards.title')}</h1>
          <p className="text-muted-foreground">{t('guards.description')}</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {t('guards.addGuard')}
        </Button>
      </div>

      {isLoading ? (
        <div>{t('common.loading')}</div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('common.employeeId')}</TableHead>
                <TableHead>{t('common.phone')}</TableHead>
                <TableHead>{t('guards.company')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {t('guards.noGuards')}
                  </TableCell>
                </TableRow>
              ) : (
                guards.map((guard) => (
                  <TableRow key={guard.id}>
                    <TableCell className="font-medium">{guard.name}</TableCell>
                    <TableCell>{guard.employee_id || "-"}</TableCell>
                    <TableCell>{guard.phone || "-"}</TableCell>
                    <TableCell>{guard.companies?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={guard.status === "active" ? "default" : "secondary"}>
                        {guard.status === "active" ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(guard)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(guard)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedGuard ? t('guards.editGuard') : t('guards.addGuard')}</DialogTitle>
            <DialogDescription>
              {selectedGuard ? t('guards.editGuardDesc') : t('guards.addGuardDesc')}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('guards.guardName')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('guards.enterName')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employee_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.employeeId')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('guards.enterEmployeeId')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.phone')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('guards.enterPhone')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('guards.company')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('guards.selectCompany')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t('common.noCompany')}</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.status')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">{t('common.active')}</SelectItem>
                        <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit">
                  {selectedGuard ? t('common.update') : t('common.create')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('guards.deleteConfirm', { name: selectedGuard?.name })}
              {' '}{t('common.cannotUndo')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedGuard && deleteMutation.mutate(selectedGuard.id)}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
