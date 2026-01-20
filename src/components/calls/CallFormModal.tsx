import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Call, CallStatus } from '@/types';
import { format } from 'date-fns';

interface CallFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (call: Omit<Call, 'id' | 'createdAt' | 'updatedAt'>) => void;
  call?: Call;
}

const CALL_SOURCES = ['Website', 'Facebook', 'Instagram', 'Google Ads', 'Referral', 'Walk-in', 'Other'];
const CALL_STATUSES: { value: CallStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'not_answered', label: 'Not Answered' },
  { value: 'callback', label: 'Callback' },
  { value: 'converted', label: 'Converted' },
];

export default function CallFormModal({ open, onClose, onSave, call }: CallFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    source: '',
    status: 'new' as CallStatus,
    notes: '',
    callDate: format(new Date(), 'yyyy-MM-dd'),
    callTime: format(new Date(), 'HH:mm'),
  });

  useEffect(() => {
    if (call) {
      setFormData({
        name: call.name || '',
        phone: call.phone,
        email: call.email || '',
        source: call.source || '',
        status: call.status,
        notes: call.notes || '',
        callDate: format(call.callDate, 'yyyy-MM-dd'),
        callTime: call.callTime || '',
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        source: '',
        status: 'new',
        notes: '',
        callDate: format(new Date(), 'yyyy-MM-dd'),
        callTime: format(new Date(), 'HH:mm'),
      });
    }
  }, [call, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: formData.name || undefined,
      phone: formData.phone,
      email: formData.email || undefined,
      source: formData.source || undefined,
      status: formData.status,
      notes: formData.notes || undefined,
      callDate: new Date(formData.callDate),
      callTime: formData.callTime || undefined,
      createdBy: '', // Will be set by the context
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{call ? 'Edit Call' : 'Add New Call'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Enter phone number"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter name (optional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter email (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="callDate">Call Date</Label>
              <Input
                id="callDate"
                type="date"
                value={formData.callDate}
                onChange={(e) => setFormData({ ...formData, callDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="callTime">Call Time</Label>
              <Input
                id="callTime"
                type="time"
                value={formData.callTime}
                onChange={(e) => setFormData({ ...formData, callTime: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select
              value={formData.source}
              onValueChange={(value) => setFormData({ ...formData, source: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {CALL_SOURCES.map((source) => (
                  <SelectItem key={source} value={source.toLowerCase().replace(' ', '_')}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as CallStatus })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {CALL_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any notes..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{call ? 'Update Call' : 'Add Call'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
