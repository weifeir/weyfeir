import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';

const StatusUpdateModal = ({ open, order, onClose, onUpdateStatus }) => {
  const [selectedStatus, setSelectedStatus] = useState(order?.status || 'pending');
  const [updating, setUpdating] = useState(false);

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'default' },
    { value: 'processing', label: 'Processing', color: 'info' },
    { value: 'assigned', label: 'Assigned', color: 'primary' },
    { value: 'on-the-way', label: 'On the way', color: 'warning' },
    { value: 'completed', label: 'Completed', color: 'success' },
    { value: 'cancelled', label: 'Cancelled', color: 'error' }
  ];

  const handleStatusUpdate = async () => {
    setUpdating(true);
    try {
      await onUpdateStatus(order.id, selectedStatus);
      onClose();
    } finally {
      setUpdating(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Update Order Status - #{order.orderNumber || order.id?.substring(0, 8)}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Current Status:
          </Typography>
          <Chip
            label={order.status}
            color={
              order.status === 'completed' ? 'success' :
              order.status === 'processing' ? 'info' :
              order.status === 'assigned' ? 'primary' :
              order.status === 'on-the-way' ? 'warning' :
              order.status === 'cancelled' ? 'error' : 'default'
            }
            size="small"
          />
        </Box>

        <FormControl fullWidth>
          <InputLabel>New Status</InputLabel>
          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            label="New Status"
          >
            {statusOptions.map((status) => (
              <MenuItem key={status.value} value={status.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={status.label}
                    color={status.color}
                    size="small"
                    sx={{ minWidth: 80 }}
                  />
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedStatus !== order.status && (
          <Alert severity="info" sx={{ mt: 2 }}>
            This will update the order status from "{order.status}" to "{selectedStatus}".
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleStatusUpdate}
          color="primary"
          variant="contained"
          disabled={updating || selectedStatus === order.status}
        >
          {updating ? <CircularProgress size={24} /> : 'Update Status'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StatusUpdateModal;
