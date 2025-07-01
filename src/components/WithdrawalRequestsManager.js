import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Stack
} from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import { auth, db } from '../firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import SectionCard from './SectionCard';

const WithdrawalRequestsManager = () => {
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [processingRequest, setProcessingRequest] = useState(false);

  // Fetch withdrawal requests when component mounts
  useEffect(() => {
    fetchWithdrawalRequests();
  }, []);

  const fetchWithdrawalRequests = async () => {
    setLoading(true);
    try {
      const requestsQuery = query(
        collection(db, 'withdrawalRequests'),
        orderBy('timestamp', 'desc')
      );
      const requestDocs = await getDocs(requestsQuery);
      
      const requests = await Promise.all(requestDocs.docs.map(async (doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        };
      }));
      
      setWithdrawalRequests(requests);
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error);
      alert('Failed to load withdrawal requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request) => {
    let confirmMessage = `Are you sure you want to approve the withdrawal of $${request.amount.toFixed(2)} for ${request.sellerName}?`;
    
    // Add payment method specific details to the confirmation
    if (request.paymentMethod === 'Bank' && request.paymentDetails) {
      confirmMessage += `\n\nBank payment details:\nBank: ${request.paymentDetails.bankName || '-'}\nAccount: ${request.paymentDetails.bankAccountName || '-'}\nNumber: ${request.paymentDetails.bankAccountNumber || '-'}\nIFSC: ${request.paymentDetails.ifscCode || '-'}`;
    } else if (request.paymentDetails?.walletAddress) {
      confirmMessage += `\n\nWallet address: ${request.paymentDetails.walletAddress}`;
    } else if (request.walletAddress) {
      confirmMessage += `\n\nWallet address: ${request.walletAddress}`;
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    setProcessingRequest(true);
    try {
      const requestRef = doc(db, 'withdrawalRequests', request.id);
      const sellerRef = doc(db, 'sellers', request.sellerId);
      
      // Get the current seller data
      const sellerDoc = await getDoc(sellerRef);
      if (!sellerDoc.exists()) {
        throw new Error('Seller not found');
      }
      
      const sellerData = sellerDoc.data();
      const currentBalance = sellerData.walletBalance || 0;
      
      // Check if seller has sufficient balance
      if (currentBalance < request.amount) {
        alert(`Seller has insufficient balance. Available: $${currentBalance.toFixed(2)}, Requested: $${request.amount.toFixed(2)}`);
        setProcessingRequest(false);
        return;
      }
      
      // Calculate new balance
      const newBalance = currentBalance - request.amount;
      
      // Update withdrawal request status
      await updateDoc(requestRef, {
        status: 'approved',
        approvedBy: auth.currentUser.email,
        approvalDate: serverTimestamp()
      });
      
      // Update seller's wallet balance
      await updateDoc(sellerRef, {
        walletBalance: newBalance,
        lastUpdated: serverTimestamp()
      });
      
      // Add transaction record
      await addDoc(collection(db, 'transactions'), {
        sellerId: request.sellerId,
        amount: -request.amount, // Negative amount for withdrawal
        type: 'withdrawal',
        status: 'completed',
        timestamp: serverTimestamp(),
        previousBalance: currentBalance,
        newBalance: newBalance,
        note: `Withdrawal approved by admin (${auth.currentUser.email})`
      });
      
      // Refresh withdrawal requests
      await fetchWithdrawalRequests();
      
      alert(`Withdrawal request approved successfully. $${request.amount.toFixed(2)} has been withdrawn from seller's wallet.`);
    } catch (error) {
      console.error('Error approving withdrawal request:', error);
      alert('Failed to approve withdrawal request. Please try again.');
    } finally {
      setProcessingRequest(false);
    }
  };

  const openRejectConfirmation = (request) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setOpenRejectDialog(true);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    setProcessingRequest(true);
    try {
      const requestRef = doc(db, 'withdrawalRequests', selectedRequest.id);
      
      // Update withdrawal request status
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectionReason: rejectionReason,
        rejectedBy: auth.currentUser.email,
        rejectionDate: serverTimestamp()
      });
      
      // Refresh withdrawal requests
      await fetchWithdrawalRequests();
      
      // Close dialog
      setOpenRejectDialog(false);
      setSelectedRequest(null);
      
      alert('Withdrawal request rejected successfully.');
    } catch (error) {
      console.error('Error rejecting withdrawal request:', error);
      alert('Failed to reject withdrawal request. Please try again.');
    } finally {
      setProcessingRequest(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'pending':
      default:
        return 'warning';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <SectionCard title="Pending Withdrawal Requests">
        {withdrawalRequests.filter(req => req.status === 'pending').length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Seller</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Payment Method</TableCell>
                  <TableCell>Wallet Address</TableCell>
                  <TableCell>Note</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {withdrawalRequests
                  .filter(request => request.status === 'pending')
                  .map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        {request.timestamp.toLocaleDateString()} {request.timestamp.toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        {request.sellerName}<br />
                        <Typography variant="caption" color="textSecondary">
                          {request.sellerEmail}
                        </Typography>
                      </TableCell>
                      <TableCell>${request.amount.toFixed(2)}</TableCell>
                      <TableCell>{request.paymentMethod}</TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {request.paymentMethod === 'Bank' && request.paymentDetails ? (
                          <Tooltip title={`Bank: ${request.paymentDetails.bankName || '-'}
Account Name: ${request.paymentDetails.bankAccountName || '-'}
Account Number: ${request.paymentDetails.bankAccountNumber || '-'}
IFSC Code: ${request.paymentDetails.ifscCode || '-'}`}>
                            <span>Bank Transfer Details</span>
                          </Tooltip>
                        ) : request.paymentDetails?.walletAddress ? (
                          <Tooltip title={request.paymentDetails.walletAddress}>
                            <span>{request.paymentDetails.walletAddress}</span>
                          </Tooltip>
                        ) : request.walletAddress ? (
                          <Tooltip title={request.walletAddress}>
                            <span>{request.walletAddress}</span>
                          </Tooltip>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {request.note || '-'}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => handleApprove(request)}
                            disabled={processingRequest}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            onClick={() => openRejectConfirmation(request)}
                            disabled={processingRequest}
                          >
                            Reject
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="textSecondary" sx={{ p: 2 }}>
            No pending withdrawal requests.
          </Typography>
        )}
      </SectionCard>

      <SectionCard title="Processed Withdrawal Requests" sx={{ mt: 4 }}>
        {withdrawalRequests.filter(req => req.status !== 'pending').length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Seller</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Payment Method</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Processed By</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {withdrawalRequests
                  .filter(request => request.status !== 'pending')
                  .map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        {request.timestamp.toLocaleDateString()} {request.timestamp.toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        {request.sellerName}<br />
                        <Typography variant="caption" color="textSecondary">
                          {request.sellerEmail}
                        </Typography>
                      </TableCell>
                      <TableCell>${request.amount.toFixed(2)}</TableCell>
                      <TableCell>{request.paymentMethod}</TableCell>
                      <TableCell>
                        <Chip 
                          label={request.status.charAt(0).toUpperCase() + request.status.slice(1)} 
                          color={getStatusColor(request.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {request.approvedBy || request.rejectedBy || '-'}
                      </TableCell>
                      <TableCell>
                        {request.status === 'rejected' && request.rejectionReason ? (
                          <Tooltip title={`Reason: ${request.rejectionReason}`}>
                            <InfoOutlined fontSize="small" color="error" />
                          </Tooltip>
                        ) : request.paymentMethod === 'Bank' && request.paymentDetails ? (
                          <Tooltip title={`Bank: ${request.paymentDetails.bankName || '-'}
Account Name: ${request.paymentDetails.bankAccountName || '-'}
Account Number: ${request.paymentDetails.bankAccountNumber || '-'}
IFSC Code: ${request.paymentDetails.ifscCode || '-'}`}>
                            <span>Bank Transfer Details</span>
                          </Tooltip>
                        ) : request.paymentDetails?.walletAddress ? (
                          <span>{request.paymentDetails.walletAddress.substring(0, 15)}...</span>
                        ) : request.walletAddress ? (
                          <span>{request.walletAddress.substring(0, 15)}...</span>
                        ) : (
                          request.note || '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="textSecondary" sx={{ p: 2 }}>
            No processed withdrawal requests.
          </Typography>
        )}
      </SectionCard>

      {/* Rejection Reason Dialog */}
      <Dialog open={openRejectDialog} onClose={() => setOpenRejectDialog(false)}>
        <DialogTitle>Reject Withdrawal Request</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Please provide a reason for rejecting this withdrawal request of ${selectedRequest?.amount.toFixed(2)} from {selectedRequest?.sellerName}.
          </Typography>
          
          {selectedRequest?.paymentMethod === 'Bank' && selectedRequest?.paymentDetails ? (
            <Box sx={{ mt: 2, mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Bank Payment Details:</Typography>
              <Typography variant="body2">Bank: {selectedRequest.paymentDetails.bankName || '-'}</Typography>
              <Typography variant="body2">Account Name: {selectedRequest.paymentDetails.bankAccountName || '-'}</Typography>
              <Typography variant="body2">Account Number: {selectedRequest.paymentDetails.bankAccountNumber || '-'}</Typography>
              <Typography variant="body2">IFSC Code: {selectedRequest.paymentDetails.ifscCode || '-'}</Typography>
            </Box>
          ) : selectedRequest?.paymentDetails?.walletAddress ? (
            <Box sx={{ mt: 2, mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Payment Details:</Typography>
              <Typography variant="body2">Method: {selectedRequest.paymentMethod}</Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                Address: {selectedRequest.paymentDetails.walletAddress}
              </Typography>
            </Box>
          ) : selectedRequest?.walletAddress ? (
            <Box sx={{ mt: 2, mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Payment Details:</Typography>
              <Typography variant="body2">Method: {selectedRequest.paymentMethod}</Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                Address: {selectedRequest.walletAddress}
              </Typography>
            </Box>
          ) : null}

          <TextField
            autoFocus
            margin="dense"
            label="Rejection Reason"
            fullWidth
            variant="outlined"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            multiline
            rows={3}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRejectDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleReject} 
            color="error" 
            variant="contained"
            disabled={!rejectionReason.trim() || processingRequest}
          >
            Reject Request
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default WithdrawalRequestsManager; 