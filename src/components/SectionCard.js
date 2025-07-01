import React from 'react';
import { Card, CardHeader, CardContent, alpha } from '@mui/material';
import { styled } from '@mui/material/styles';

// Styled component for section cards
const StyledSectionCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  overflow: 'visible',
  marginBottom: theme.spacing(4),
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  background: 'linear-gradient(to bottom right, #ffffff, #fafbff)',
  '&:hover': {
    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.12)',
    transform: 'translateY(-4px)',
  },
  '& .MuiCardHeader-root': {
    paddingBottom: theme.spacing(2),
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    position: 'relative',
    background: 'linear-gradient(to right, rgba(63, 81, 181, 0.05), rgba(92, 107, 192, 0.02))',
    '&:after': {
      content: '""',
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: '60px',
      height: 4,
      background: 'linear-gradient(to right, #3f51b5, #5c6bc0)',
      borderRadius: '0 0 4px 0',
      transition: 'width 0.3s ease',
    }
  },
  '&:hover .MuiCardHeader-root:after': {
    width: 120,
  },
  '& .MuiCardContent-root': {
    padding: theme.spacing(3),
    '& .MuiTableContainer-root': {
      borderRadius: 16,
      boxShadow: 'none',
      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    },
    '& .MuiTableHead-root .MuiTableCell-root': {
      backgroundColor: alpha(theme.palette.primary.main, 0.04),
      color: theme.palette.text.primary,
      fontWeight: 600,
      borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
    },
    '& .MuiTableBody-root .MuiTableRow-root:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.02),
    }
  }
}));

const SectionCard = ({ title, children, ...props }) => {
  return (
    <StyledSectionCard {...props}>
      <CardHeader title={title} />
      <CardContent>
        {children}
      </CardContent>
    </StyledSectionCard>
  );
};

export default SectionCard; 
