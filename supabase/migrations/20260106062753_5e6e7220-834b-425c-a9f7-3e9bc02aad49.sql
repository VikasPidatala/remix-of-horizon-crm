-- Create policy to allow admins and managers to delete leaves
CREATE POLICY "Admins can delete any leave" 
ON public.leaves 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can delete staff leaves" 
ON public.leaves 
FOR DELETE 
USING (has_role(auth.uid(), 'manager'::app_role) AND user_role = 'staff');

CREATE POLICY "Users can delete own pending leaves" 
ON public.leaves 
FOR DELETE 
USING ((user_id = auth.uid()::text) AND (status = 'pending'));