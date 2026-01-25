import { DocumentUpload } from '@/components/DocumentUpload';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { employeeStatusOptions, getEmployeeColumns } from '@/components/ui/data-table/columns';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type Employee, employeeApi } from '@/lib/api';
import { type EmployeeFormData, createFormValidator, employeeFormSchema } from '@/lib/form-schemas';
import { queryKeys } from '@/lib/query-client';
import { cn } from '@/lib/utils';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { format } from 'date-fns';
import {
  Briefcase,
  Building,
  CalendarIcon,
  CheckCircle,
  Download,
  Edit,
  FileText,
  Loader2,
  LogOut,
  Plus,
  UserCheck,
  UserMinus,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as { message: string }).message;
  }
  return String(error);
}

export const Route = createFileRoute('/dashboard/business-partner/employees')({
  component: EmployeesManagementPage,
});

function EmployeesManagementPage() {
  const queryClient = useQueryClient();
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // KTP document upload state
  const [ktpPendingFile, setKtpPendingFile] = useState<File | null>(null);
  // Viewed employee documents state
  const [viewedKtpDocument, setViewedKtpDocument] = useState<{
    url: string;
    filename: string;
  } | null>(null);
  const [ktpDocumentUrl, setKtpDocumentUrl] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      employeeNumber: '',
      department: '',
      position: '',
      managerId: '',
      dateOfBirth: '',
      gender: undefined as 'male' | 'female' | undefined,
      nationalId: '',
      npwp: '',
      joinDate: '',
      baseSalary: 0,
      // Bank Info
      bankName: '',
      bankAccountNumber: '',
      bankAccountName: '',
    },
    validators: {
      onChange: createFormValidator(employeeFormSchema),
    },
    onSubmit: async ({ value }) => {
      const submitData = {
        name: value.name,
        department: value.department,
        position: value.position,
        baseSalary: value.baseSalary,
        email: value.email || undefined,
        phone: value.phone || undefined,
        employeeNumber: value.employeeNumber || undefined,
        managerId: value.managerId || undefined,
        dateOfBirth: value.dateOfBirth || undefined,
        gender: value.gender || undefined,
        nationalId: value.nationalId || undefined,
        npwp: value.npwp || undefined,
        joinDate: value.joinDate || undefined,
        // Bank Info
        bankName: value.bankName || undefined,
        bankAccountNumber: value.bankAccountNumber || undefined,
        bankAccountName: value.bankAccountName || undefined,
      };
      if (formMode === 'add') {
        await createEmployeeMutation.mutateAsync(submitData);
      } else if (formMode === 'edit' && selectedEmployee) {
        const { employeeNumber: _, ...updateData } = submitData;
        await updateEmployeeMutation.mutateAsync({ id: selectedEmployee.id, data: updateData });
      }
    },
  });

  const {
    data: employeesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.employees.all,
    queryFn: () => employeeApi.getAll(),
  });

  const employees = employeesData?.employees || [];

  const createEmployeeMutation = useMutation({
    mutationFn: (data: EmployeeFormData) => employeeApi.create(data),
    onSuccess: async (createdEmployee) => {
      // Upload pending KTP file if exists
      if (ktpPendingFile && createdEmployee.id) {
        try {
          const formData = new FormData();
          formData.append('file', ktpPendingFile, ktpPendingFile.name);
          formData.append('employeeId', createdEmployee.id);
          formData.append('documentType', 'ktp');

          const response = await fetch(
            `${import.meta.env.VITE_BUSINESS_PARTNER_SERVICE_URL || 'http://localhost:8793'}/api/employees/documents/upload`,
            {
              method: 'POST',
              body: formData,
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
            console.error('KTP upload failed:', errorData.error);
            toast.error('Employee created but KTP upload failed', {
              description: errorData.error,
            });
          } else {
            toast.success('Employee created with KTP document');
          }
        } catch (err) {
          console.error('KTP upload error:', err);
          toast.error('Employee created but KTP upload failed');
        }
        setKtpPendingFile(null);
      } else {
        toast.success('Employee created successfully');
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      setFormDrawerOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error('Failed to create employee', { description: error.message });
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<EmployeeFormData, 'employeeNumber'>>;
    }) => employeeApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      toast.success('Employee updated successfully');
      setFormDrawerOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error('Failed to update employee', { description: error.message });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: (id: string) => employeeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      toast.success('Employee deleted successfully');
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete employee', { description: error.message });
    },
  });

  const terminateEmployeeMutation = useMutation({
    mutationFn: (id: string) => employeeApi.terminate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      toast.success('Employee terminated');
      setViewDrawerOpen(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to terminate employee', { description: error.message });
    },
  });

  const resignEmployeeMutation = useMutation({
    mutationFn: (id: string) => employeeApi.resign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      toast.success('Employee resignation recorded');
      setViewDrawerOpen(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to record resignation', { description: error.message });
    },
  });

  const activateEmployeeMutation = useMutation({
    mutationFn: (id: string) => employeeApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      toast.success('Employee activated');
      setViewDrawerOpen(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to activate employee', { description: error.message });
    },
  });

  const handleViewEmployee = async (employee: Employee) => {
    setSelectedEmployee(employee);
    setViewedKtpDocument(null);
    setViewDrawerOpen(true);

    // Fetch employee's KTP document
    try {
      const docs = await employeeApi.getDocuments(employee.id);
      const ktpDoc = docs.documents?.find((d) => d.type === 'ktp');
      if (ktpDoc) {
        // Store relative URL - will construct full URL when displaying
        setViewedKtpDocument({ url: ktpDoc.url, filename: ktpDoc.filename });
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  };

  const handleAddEmployee = () => {
    setFormMode('add');
    setSelectedEmployee(null);
    form.reset();
    // Reset KTP document state for new employee
    setKtpPendingFile(null);
    setKtpDocumentUrl(null);
    setFormDrawerOpen(true);
  };

  const handleEditEmployee = async (employee: Employee) => {
    setFormMode('edit');
    setSelectedEmployee(employee);
    form.setFieldValue('name', employee.name);
    form.setFieldValue('email', employee.email || '');
    form.setFieldValue('phone', employee.phone || '');
    form.setFieldValue('employeeNumber', employee.employeeNumber);
    form.setFieldValue('department', employee.department || '');
    form.setFieldValue('position', employee.position || '');
    form.setFieldValue('managerId', employee.managerId || '');
    form.setFieldValue(
      'dateOfBirth',
      employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : ''
    );
    form.setFieldValue('gender', employee.gender || undefined);
    form.setFieldValue('nationalId', employee.nationalId || '');
    form.setFieldValue('npwp', employee.npwp || '');
    form.setFieldValue(
      'joinDate',
      employee.joinDate ? new Date(employee.joinDate).toISOString().split('T')[0] : ''
    );
    form.setFieldValue('baseSalary', employee.baseSalary || 0);
    // Bank Info
    form.setFieldValue('bankName', employee.bankName || '');
    form.setFieldValue('bankAccountNumber', employee.bankAccountNumber || '');
    form.setFieldValue('bankAccountName', employee.bankAccountName || '');

    // Reset pending file and load existing KTP document
    setKtpPendingFile(null);
    setKtpDocumentUrl(null);

    // Fetch existing KTP document
    try {
      const docs = await employeeApi.getDocuments(employee.id);
      const ktpDoc = docs.documents?.find((d) => d.type === 'ktp');
      if (ktpDoc) {
        // Construct full URL for the document
        const baseUrl =
          import.meta.env.VITE_BUSINESS_PARTNER_SERVICE_URL || 'http://localhost:8793';
        setKtpDocumentUrl(`${baseUrl}${ktpDoc.url}`);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }

    setViewDrawerOpen(false);
    setFormDrawerOpen(true);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (employeeToDelete) {
      deleteEmployeeMutation.mutate(employeeToDelete.id);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: callbacks are stable
  const columns = useMemo(
    () =>
      getEmployeeColumns({
        onView: handleViewEmployee,
        onEdit: handleEditEmployee,
        onDelete: handleDeleteEmployee,
      }),
    []
  );

  const activeEmployees = employees.filter((e) => e.employmentStatus === 'active').length;
  const onLeaveEmployees = employees.filter((e) => e.employmentStatus === 'on_leave').length;
  const departments = new Set(employees.map((e) => e.department).filter(Boolean)).size;

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
            <p className="text-muted-foreground mt-1">Manage employee records</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-destructive font-medium">Error loading employees</p>
              <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.employees.all })}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground mt-1">Manage company employees and staff</p>
        </div>
        <Button onClick={handleAddEmployee} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">All records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEmployees}</div>
            <p className="text-xs text-muted-foreground">Currently working</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onLeaveEmployees}</div>
            <p className="text-xs text-muted-foreground">Temporary absence</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments}</div>
            <p className="text-xs text-muted-foreground">Active departments</p>
          </CardContent>
        </Card>
      </div>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
          <CardDescription>View and manage employee records</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={employees}
            searchKey="name"
            searchPlaceholder="Search by name, employee number..."
            isLoading={isLoading}
            onRowClick={handleViewEmployee}
            filterableColumns={[
              { id: 'employmentStatus', title: 'Status', options: employeeStatusOptions },
            ]}
          />
        </CardContent>
      </Card>

      {/* View Drawer */}
      <Drawer open={viewDrawerOpen} onOpenChange={setViewDrawerOpen}>
        <DrawerContent side="right">
          <DrawerHeader>
            <DrawerTitle>{selectedEmployee?.name}</DrawerTitle>
            <DrawerDescription>Employee Details</DrawerDescription>
          </DrawerHeader>

          {selectedEmployee && (
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Employee Number</p>
                    <p className="font-mono font-medium">{selectedEmployee.employeeNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Code</p>
                    <p className="font-mono font-medium">{selectedEmployee.code}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedEmployee.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedEmployee.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-mono font-medium">{selectedEmployee.phone || '-'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    variant={
                      selectedEmployee.employmentStatus === 'active'
                        ? 'default'
                        : selectedEmployee.employmentStatus === 'terminated'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {(selectedEmployee.employmentStatus as string).replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                  Position & Department
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">{selectedEmployee.department || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Position</p>
                    <p className="font-medium">{selectedEmployee.position || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">
                      {selectedEmployee.dateOfBirth
                        ? new Date(selectedEmployee.dateOfBirth).toLocaleDateString('id-ID')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gender</p>
                    <p className="font-medium capitalize">{selectedEmployee.gender || '-'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">National ID (KTP)</p>
                  <p className="font-mono font-medium">{selectedEmployee.nationalId || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">NPWP</p>
                  <p className="font-mono font-medium">{selectedEmployee.npwp || '-'}</p>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                  Employment Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Join Date</p>
                    <p className="font-medium">
                      {selectedEmployee.joinDate
                        ? new Date(selectedEmployee.joinDate).toLocaleDateString('id-ID')
                        : '-'}
                    </p>
                  </div>
                  {selectedEmployee.endDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">End Date</p>
                      <p className="font-medium">
                        {new Date(selectedEmployee.endDate).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Base Salary</p>
                  <p className="font-medium">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      maximumFractionDigits: 0,
                    }).format(selectedEmployee.baseSalary)}
                  </p>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                  Bank Account
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Bank Name</p>
                    <p className="font-medium">{selectedEmployee.bankName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Account Number</p>
                    <p className="font-mono font-medium">
                      {selectedEmployee.bankAccountNumber || '-'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Holder Name</p>
                  <p className="font-medium">{selectedEmployee.bankAccountName || '-'}</p>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">Documents</h3>
                {viewedKtpDocument ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">KTP Document</p>
                          <p className="text-xs text-muted-foreground">
                            {viewedKtpDocument.filename}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Construct full URL and open in new tab for download
                          const baseUrl =
                            import.meta.env.VITE_BUSINESS_PARTNER_SERVICE_URL ||
                            'http://localhost:8793';
                          const fullUrl = `${baseUrl}${viewedKtpDocument.url}`;
                          window.open(fullUrl, '_blank');
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                    {/* Preview image if it's an image file */}
                    {viewedKtpDocument.url && (
                      <div className="rounded-lg overflow-hidden border">
                        <img
                          src={`${import.meta.env.VITE_BUSINESS_PARTNER_SERVICE_URL || 'http://localhost:8793'}${viewedKtpDocument.url}`}
                          alt="KTP Document"
                          className="w-full h-auto max-h-48 object-contain bg-muted"
                          onError={(e) => {
                            // Hide image if it fails to load (e.g., PDF)
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No documents uploaded</p>
                )}
              </div>
            </div>
          )}

          <DrawerFooter>
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button
                onClick={() => selectedEmployee && handleEditEmployee(selectedEmployee)}
                className="w-full sm:w-auto"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              {selectedEmployee?.employmentStatus === 'active' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() =>
                      selectedEmployee && resignEmployeeMutation.mutate(selectedEmployee.id)
                    }
                    disabled={resignEmployeeMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Resign
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      selectedEmployee && terminateEmployeeMutation.mutate(selectedEmployee.id)
                    }
                    disabled={terminateEmployeeMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    Terminate
                  </Button>
                </>
              )}
              {selectedEmployee?.employmentStatus !== 'active' && (
                <Button
                  variant="outline"
                  onClick={() =>
                    selectedEmployee && activateEmployeeMutation.mutate(selectedEmployee.id)
                  }
                  disabled={activateEmployeeMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Activate
                </Button>
              )}
              <DrawerClose asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  Close
                </Button>
              </DrawerClose>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Form Drawer */}
      <Drawer open={formDrawerOpen} onOpenChange={setFormDrawerOpen}>
        <DrawerContent side="left">
          <DrawerHeader>
            <DrawerTitle>{formMode === 'add' ? 'Add New Employee' : 'Edit Employee'}</DrawerTitle>
            <DrawerDescription>
              {formMode === 'add' ? 'Create a new employee record' : 'Update employee information'}
            </DrawerDescription>
          </DrawerHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="name">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Full Name *</Label>
                    <Input
                      id={field.name}
                      placeholder="John Doe"
                      maxLength={100}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(getErrorMessage).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="employeeNumber">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Employee Number</Label>
                    <Input
                      id={field.name}
                      placeholder={formMode === 'add' ? 'Auto-generated' : 'EMP001'}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      disabled={true}
                      className="bg-muted"
                    />
                    {formMode === 'add' && (
                      <p className="text-xs text-muted-foreground">
                        Employee number will be auto-generated
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="email">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Email</Label>
                    <Input
                      id={field.name}
                      type="email"
                      placeholder="john@company.com"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(getErrorMessage).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="phone">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Mobile Phone</Label>
                    <Input
                      id={field.name}
                      placeholder="08123456789"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(getErrorMessage).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field
                name="department"
                validators={{
                  onChange: ({ value }) => {
                    if (!value || value.trim().length === 0) {
                      return 'Department is required';
                    }
                    if (value.length < 2) {
                      return 'Department must be at least 2 characters';
                    }
                    if (/\d/.test(value)) {
                      return 'Department should not contain numbers';
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>
                      Department <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={field.name}
                      placeholder="Engineering"
                      maxLength={50}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className={field.state.meta.errors.length > 0 ? 'border-destructive' : ''}
                    />
                    {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(getErrorMessage).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field
                name="position"
                validators={{
                  onChange: ({ value }) => {
                    if (!value || value.trim().length === 0) {
                      return 'Position is required';
                    }
                    if (value.length < 2) {
                      return 'Position must be at least 2 characters';
                    }
                    if (/\d/.test(value)) {
                      return 'Position should not contain numbers';
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>
                      Position <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={field.name}
                      placeholder="Software Engineer"
                      maxLength={50}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className={field.state.meta.errors.length > 0 ? 'border-destructive' : ''}
                    />
                    {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(getErrorMessage).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="dateOfBirth">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Date of Birth</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id={field.name}
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.state.value && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.state.value
                            ? format(new Date(field.state.value), 'PPP')
                            : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          captionLayout="dropdown"
                          selected={field.state.value ? new Date(field.state.value) : undefined}
                          onSelect={(date) =>
                            field.handleChange(date ? date.toISOString().split('T')[0] : '')
                          }
                          defaultMonth={
                            field.state.value ? new Date(field.state.value) : new Date(1990, 0)
                          }
                          startMonth={new Date(1920, 0)}
                          endMonth={new Date()}
                          disabled={(date) => date > new Date() || date < new Date('1920-01-01')}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </form.Field>

              <form.Field name="gender">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Gender</Label>
                    <Select
                      value={field.state.value || ''}
                      onValueChange={(v) => field.handleChange(v as 'male' | 'female')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="nationalId">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>National ID (KTP/NIK)</Label>
                    <Input
                      id={field.name}
                      placeholder="3201234567890001"
                      maxLength={16}
                      value={field.state.value}
                      onChange={(e) => {
                        // Only allow digits
                        const value = e.target.value.replace(/\D/g, '');
                        field.handleChange(value);
                      }}
                      onBlur={field.handleBlur}
                    />
                    <p className="text-xs text-muted-foreground">16 digit NIK number</p>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(getErrorMessage).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="npwp">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>NPWP</Label>
                    <Input
                      id={field.name}
                      placeholder="01.234.567.8-901.000"
                      value={field.state.value}
                      onChange={(e) => {
                        // Allow digits, dots, and dashes for NPWP format
                        const value = e.target.value.replace(/[^\d.-]/g, '');
                        field.handleChange(value);
                      }}
                      onBlur={field.handleBlur}
                    />
                    <p className="text-xs text-muted-foreground">Format: XX.XXX.XXX.X-XXX.XXX</p>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(getErrorMessage).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="joinDate">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Join Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id={field.name}
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.state.value && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.state.value
                            ? format(new Date(field.state.value), 'PPP')
                            : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          captionLayout="dropdown"
                          selected={field.state.value ? new Date(field.state.value) : undefined}
                          onSelect={(date) =>
                            field.handleChange(date ? date.toISOString().split('T')[0] : '')
                          }
                          defaultMonth={
                            field.state.value ? new Date(field.state.value) : new Date()
                          }
                          startMonth={new Date(2000, 0)}
                          endMonth={new Date(2030, 11)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </form.Field>

              <form.Field
                name="baseSalary"
                validators={{
                  onChange: ({ value }) => {
                    if (value === undefined || value === 0) return undefined;
                    if (value < 0) {
                      return 'Base salary cannot be negative';
                    }
                    if (value > 999999999999) {
                      return 'Base salary cannot exceed Rp 999.999.999.999';
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => {
                  // Format number to Rupiah display (with dots as thousand separators)
                  const formatRupiah = (num: number | undefined): string => {
                    if (num === undefined || num === 0) return '';
                    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                  };

                  // Parse Rupiah string back to number
                  const parseRupiah = (str: string): number => {
                    const cleaned = str.replace(/\./g, '');
                    const num = Number.parseInt(cleaned, 10);
                    return isNaN(num) ? 0 : num;
                  };

                  return (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>
                        Base Salary <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          Rp
                        </span>
                        <Input
                          id={field.name}
                          type="text"
                          placeholder="0"
                          className={`pl-10 ${field.state.meta.errors.length > 0 ? 'border-destructive' : ''}`}
                          value={formatRupiah(field.state.value)}
                          onChange={(e) => {
                            // Only allow digits and dots
                            const value = e.target.value.replace(/[^\d.]/g, '');
                            const numValue = parseRupiah(value);
                            field.handleChange(Math.max(0, numValue));
                          }}
                          onBlur={field.handleBlur}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Max: Rp 999.999.999.999</p>
                      {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                        <p className="text-sm text-destructive">
                          {field.state.meta.errors.map(getErrorMessage).join(', ')}
                        </p>
                      )}
                    </div>
                  );
                }}
              </form.Field>
            </div>

            {/* Bank Info Section */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                Bank Account (for salary payment)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <form.Field
                  name="bankName"
                  validators={{
                    onChange: ({ value }) => {
                      if (!value) return undefined;
                      if (value.length > 50) {
                        return 'Bank name must be less than 50 characters';
                      }
                      return undefined;
                    },
                  }}
                >
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Bank Name</Label>
                      <Input
                        id={field.name}
                        placeholder="BCA, Mandiri, BRI, etc."
                        maxLength={50}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        className={field.state.meta.errors.length > 0 ? 'border-destructive' : ''}
                      />
                      {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                        <p className="text-sm text-destructive">
                          {field.state.meta.errors.map(getErrorMessage).join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>

                <form.Field
                  name="bankAccountNumber"
                  validators={{
                    onChange: ({ value }) => {
                      if (!value) return undefined;
                      // Remove non-digits for validation
                      const digitsOnly = value.replace(/\D/g, '');
                      if (
                        digitsOnly.length > 0 &&
                        (digitsOnly.length < 10 || digitsOnly.length > 20)
                      ) {
                        return 'Bank account number must be 10-20 digits';
                      }
                      return undefined;
                    },
                  }}
                >
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Account Number</Label>
                      <Input
                        id={field.name}
                        placeholder="1234567890"
                        maxLength={20}
                        value={field.state.value}
                        onChange={(e) => {
                          // Only allow digits
                          const value = e.target.value.replace(/\D/g, '');
                          field.handleChange(value);
                        }}
                        onBlur={field.handleBlur}
                        className={field.state.meta.errors.length > 0 ? 'border-destructive' : ''}
                      />
                      <p className="text-xs text-muted-foreground">10-20 digits</p>
                      {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                        <p className="text-sm text-destructive">
                          {field.state.meta.errors.map(getErrorMessage).join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>
              </div>

              <form.Field
                name="bankAccountName"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) return undefined;
                    if (value.length > 100) {
                      return 'Account name must be less than 100 characters';
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Account Holder Name</Label>
                    <Input
                      id={field.name}
                      placeholder="Name as on bank account"
                      maxLength={100}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className={field.state.meta.errors.length > 0 ? 'border-destructive' : ''}
                    />
                    <p className="text-xs text-muted-foreground">
                      Must match the name registered with the bank
                    </p>
                    {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(getErrorMessage).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>

            {/* KTP Document Upload */}
            <DocumentUpload
              employeeId={formMode === 'edit' ? selectedEmployee?.id : undefined}
              documentType="ktp"
              label="KTP Document"
              currentDocument={ktpDocumentUrl || undefined}
              onFileSelect={(file) => setKtpPendingFile(file)}
              onUploadSuccess={(result) => {
                setKtpDocumentUrl(result.url);
                setKtpPendingFile(null);
                toast.success('KTP document uploaded successfully');
              }}
              onUploadError={(error) => {
                toast.error('Failed to upload KTP document', { description: error });
              }}
            />

            <DrawerFooter className="px-0">
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={form.state.isSubmitting || !form.state.canSubmit}
                >
                  {form.state.isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {formMode === 'add' ? 'Creating...' : 'Updating...'}
                    </>
                  ) : formMode === 'add' ? (
                    'Create Employee'
                  ) : (
                    'Update Employee'
                  )}
                </Button>
                <DrawerClose asChild>
                  <Button type="button" variant="outline" className="w-full sm:w-auto">
                    Cancel
                  </Button>
                </DrawerClose>
              </div>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{employeeToDelete?.name}"? This will terminate the
              employee record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEmployeeMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteEmployeeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEmployeeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
