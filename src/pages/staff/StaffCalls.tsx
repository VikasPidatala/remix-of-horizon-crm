import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Plus, Phone } from 'lucide-react';
import { useCalls } from '@/contexts/CallsContext';
import { useData } from '@/contexts/DataContext';
import CallList from '@/components/calls/CallList';
import CallFormModal from '@/components/calls/CallFormModal';
import CallExcelImport from '@/components/calls/CallExcelImport';
import LeadFormModal from '@/components/leads/LeadFormModal';
import { Call, CallStatus, Lead } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function StaffCalls() {
  const { calls, loading, addCall, addBulkCalls, updateCall, deleteCall } = useCalls();
  const { addLead, projects } = useData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCall, setEditingCall] = useState<Call | undefined>();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [convertingCall, setConvertingCall] = useState<Call | null>(null);

  const handleSaveCall = async (callData: Omit<Call, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingCall) {
      await updateCall(editingCall.id, callData);
    } else {
      await addCall(callData);
    }
    setEditingCall(undefined);
  };

  const handleBulkImport = async (callsData: Omit<Call, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>[]) => {
    await addBulkCalls(callsData);
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteCall(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleConvertToLead = (call: Call) => {
    setConvertingCall(call);
  };

  const handleSaveLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    await addLead(leadData);
    
    if (convertingCall) {
      await updateCall(convertingCall.id, { status: 'converted' });
      setConvertingCall(null);
    }
  };

  const handleStatusChange = async (id: string, status: CallStatus) => {
    await updateCall(id, { status });
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <TopBar title="Calls" />
        <div className="flex-1 p-4 md:p-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar title="Calls" />
      <div className="flex-1 p-4 md:p-6 space-y-6 overflow-auto">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex items-center gap-2">
            <Phone className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Call Records</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <CallExcelImport onImport={handleBulkImport} />
            <Button onClick={() => setShowAddModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Call
            </Button>
          </div>
        </div>

        <CallList
          calls={calls}
          onEdit={setEditingCall}
          onDelete={setDeleteConfirmId}
          onConvertToLead={handleConvertToLead}
          onStatusChange={handleStatusChange}
        />
      </div>

      <CallFormModal
        open={showAddModal || !!editingCall}
        onClose={() => {
          setShowAddModal(false);
          setEditingCall(undefined);
        }}
        onSave={handleSaveCall}
        call={editingCall}
      />

      {convertingCall && (
        <LeadFormModal
          open={!!convertingCall}
          onClose={() => setConvertingCall(null)}
          onSave={handleSaveLead}
          projects={projects}
          lead={{
            id: '',
            name: convertingCall.name || '',
            phone: convertingCall.phone,
            email: convertingCall.email || '',
            address: '',
            requirementType: 'apartment',
            bhkRequirement: '2',
            budgetMin: 0,
            budgetMax: 0,
            description: convertingCall.notes || '',
            source: convertingCall.source as any || 'call',
            status: 'pending',
            notes: [],
            createdBy: '',
            createdAt: new Date(),
            updatedAt: new Date(),
          }}
        />
      )}

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Call</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this call record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
