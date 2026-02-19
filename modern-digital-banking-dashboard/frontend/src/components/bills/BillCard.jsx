import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  LinearProgress,
  Tooltip,
  Divider,
} from "@mui/material";
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Paid as PaidIcon,
  CalendarToday as CalendarIcon,
  Category as CategoryIcon,
  MonetizationOn as MoneyIcon,
  Repeat as RepeatIcon,
  Notifications as NotificationsIcon,
} from "@mui/icons-material";
import { format, parseISO, differenceInDays, isPast, isToday } from "date-fns";
import { billService } from "../../services/billService";
import { useSnackbar } from "../../context/SnackbarContext";
import "./BillCard.css";

const BillCard = ({ bill, onUpdate, onDelete }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMarkPaidDialogOpen, setIsMarkPaidDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess } = useSnackbar();

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
    setIsMenuOpen(true);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setIsMenuOpen(false);
  };

  const handleEdit = () => {
    handleMenuClose();
    onUpdate(bill);
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    setIsDeleteDialogOpen(true);
  };

  const handleMarkPaidClick = () => {
    handleMenuClose();
    setIsMarkPaidDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setIsLoading(true);
    try {
      await billService.deleteBill(bill.id);
      showSuccess("Bill deleted successfully");
      onDelete(bill.id);
    } catch (error) {
      showSuccess("Failed to delete bill");
    } finally {
      setIsLoading(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleMarkPaidConfirm = async () => {
    setIsLoading(true);
    try {
      const updatedBill = await billService.markBillAsPaid(bill.id);
      showSuccess("Bill marked as paid successfully");
      onUpdate(updatedBill);
    } catch (error) {
      showSuccess("Failed to mark bill as paid");
    } finally {
      setIsLoading(false);
      setIsMarkPaidDialogOpen(false);
    }
  };

  // Calculate days until due
  const dueDate = parseISO(bill.due_date);
  const daysUntilDue = differenceInDays(dueDate, new Date());
  const isOverdue = isPast(dueDate) && !bill.is_paid && !isToday(dueDate);
  const isDueToday = isToday(dueDate) && !bill.is_paid;

  // Get status color and text
  const getStatusInfo = () => {
    if (bill.is_paid) {
      return {
        color: "success",
        text: "Paid",
        icon: <PaidIcon fontSize="small" />,
      };
    } else if (isOverdue) {
      return {
        color: "error",
        text: "Overdue",
        icon: <NotificationsIcon fontSize="small" />,
      };
    } else if (isDueToday) {
      return {
        color: "warning",
        text: "Due Today",
        icon: <CalendarIcon fontSize="small" />,
      };
    } else if (daysUntilDue <= 3) {
      return {
        color: "warning",
        text: `Due in ${daysUntilDue} days`,
        icon: <CalendarIcon fontSize="small" />,
      };
    } else {
      return {
        color: "info",
        text: `Due in ${daysUntilDue} days`,
        icon: <CalendarIcon fontSize="small" />,
      };
    }
  };

  const statusInfo = getStatusInfo();

  // Format currency
  const formatCurrency = (amount, currency) => {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
    });
    return formatter.format(amount);
  };

  // Format frequency
  const formatFrequency = (frequency) => {
    const map = {
      monthly: "Monthly",
      quarterly: "Quarterly",
      biannually: "Bi-Annually",
      annually: "Annually",
      one_time: "One Time",
    };
    return map[frequency] || frequency;
  };

  // Calculate progress for due date
  const calculateDueProgress = () => {
    if (bill.is_paid) return 100;
    if (isOverdue) return 0;

    const reminderDays = bill.reminder_days || 3;
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - reminderDays);

    const totalDays = differenceInDays(dueDate, reminderDate);
    const daysRemaining = differenceInDays(dueDate, new Date());

    if (daysRemaining > totalDays) return 0;
    if (daysRemaining < 0) return 100;

    return ((totalDays - daysRemaining) / totalDays) * 100;
  };

  const progressValue = calculateDueProgress();

  return (
    <>
      <Card
        className={`bill-card ${isOverdue ? "overdue" : ""} ${bill.is_paid ? "paid" : ""}`}
      >
        {isLoading && <LinearProgress />}

        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="flex-start"
            mb={2}
          >
            <Box>
              <Typography variant="h6" component="div" gutterBottom>
                {bill.name}
              </Typography>
              {bill.description && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {bill.description}
                </Typography>
              )}
            </Box>

            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                label={statusInfo.text}
                color={statusInfo.color}
                size="small"
                icon={statusInfo.icon}
                variant={bill.is_paid ? "filled" : "outlined"}
              />
              <IconButton
                size="small"
                onClick={handleMenuOpen}
                aria-label="bill actions"
                aria-controls={isMenuOpen ? "bill-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={isMenuOpen ? "true" : undefined}
              >
                <MoreVertIcon />
              </IconButton>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2}>
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                display="flex"
                alignItems="center"
                gap={0.5}
              >
                <MoneyIcon fontSize="small" />
                Amount
              </Typography>
              <Typography variant="h6" color="primary.main">
                {formatCurrency(bill.amount, bill.currency)}
                {bill.currency !== "USD" && bill.amount_usd && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    ≈ {formatCurrency(bill.amount_usd, "USD")}
                  </Typography>
                )}
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                display="flex"
                alignItems="center"
                gap={0.5}
              >
                <CalendarIcon fontSize="small" />
                Due Date
              </Typography>
              <Typography variant="body1">
                {format(dueDate, "MMM dd, yyyy")}
              </Typography>
              {!bill.is_paid && (
                <Typography
                  variant="caption"
                  color={
                    isOverdue
                      ? "error.main"
                      : isDueToday
                        ? "warning.main"
                        : "text.secondary"
                  }
                >
                  {isOverdue
                    ? `${Math.abs(daysUntilDue)} days overdue`
                    : isDueToday
                      ? "Due today"
                      : `${daysUntilDue} days remaining`}
                </Typography>
              )}
            </Box>

            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                display="flex"
                alignItems="center"
                gap={0.5}
              >
                <CategoryIcon fontSize="small" />
                Category
              </Typography>
              <Chip
                label={bill.category}
                size="small"
                variant="outlined"
                sx={{ mt: 0.5 }}
              />
            </Box>

            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                display="flex"
                alignItems="center"
                gap={0.5}
              >
                <RepeatIcon fontSize="small" />
                Frequency
              </Typography>
              <Typography variant="body1">
                {formatFrequency(bill.frequency)}
              </Typography>
            </Box>
          </Box>

          {!bill.is_paid && !isOverdue && (
            <Box mt={3}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="caption" color="text.secondary">
                  Time until due
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {Math.round(progressValue)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progressValue}
                color={daysUntilDue <= 3 ? "warning" : "primary"}
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Box>
          )}

          {isOverdue && (
            <Alert severity="error" sx={{ mt: 2 }}>
              This bill is {Math.abs(daysUntilDue)} days overdue. Please pay
              immediately to avoid penalties.
            </Alert>
          )}

          {isDueToday && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This bill is due today. Please make the payment.
            </Alert>
          )}
        </CardContent>

        <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
          <Box display="flex" gap={1}>
            <Tooltip title="Reminder Settings">
              <Chip
                label={`${bill.reminder_days || 3} day reminder`}
                size="small"
                variant="outlined"
                icon={<NotificationsIcon fontSize="small" />}
              />
            </Tooltip>
            {bill.paid_date && (
              <Tooltip title="Payment Date">
                <Chip
                  label={`Paid on ${format(parseISO(bill.paid_date), "MMM dd")}`}
                  size="small"
                  variant="outlined"
                  color="success"
                />
              </Tooltip>
            )}
          </Box>

          {!bill.is_paid && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<PaidIcon />}
              onClick={handleMarkPaidClick}
              disabled={isLoading}
            >
              Mark as Paid
            </Button>
          )}
        </CardActions>
      </Card>

      {/* Action Menu */}
      <Menu
        id="bill-menu"
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={handleMenuClose}
        MenuListProps={{
          "aria-labelledby": "bill-actions-button",
        }}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit Bill
        </MenuItem>
        {!bill.is_paid && (
          <MenuItem onClick={handleMarkPaidClick}>
            <PaidIcon fontSize="small" sx={{ mr: 1 }} />
            Mark as Paid
          </MenuItem>
        )}
        <MenuItem onClick={handleDeleteClick} sx={{ color: "error.main" }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete Bill
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: "#ffffff",
            color: "#111827",
            borderRadius: "12px",
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(2px)",
          },
        }}
      >
        <DialogTitle id="delete-dialog-title">Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the bill "{bill.name}"? This action
            cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIsDeleteDialogOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mark as Paid Confirmation Dialog */}
      <Dialog
        open={isMarkPaidDialogOpen}
        onClose={() => setIsMarkPaidDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: "#ffffff",
            color: "#111827",
            borderRadius: "12px",
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(2px)",
          },
        }}
      >
        <DialogTitle id="mark-paid-dialog-title">Mark as Paid</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to mark "{bill.name}" as paid? This will award
            reward points for on-time payment.
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            You will earn reward points for paying this bill. Late payments earn
            fewer points.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIsMarkPaidDialogOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMarkPaidConfirm}
            color="success"
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Mark as Paid"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

BillCard.propTypes = {
  bill: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
      .isRequired,
    currency: PropTypes.string.isRequired,
    amount_usd: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    due_date: PropTypes.string.isRequired,
    is_paid: PropTypes.bool.isRequired,
    paid_date: PropTypes.string,
    category: PropTypes.string.isRequired,
    frequency: PropTypes.string.isRequired,
    reminder_days: PropTypes.number,
    user_id: PropTypes.number.isRequired,
    created_at: PropTypes.string,
    updated_at: PropTypes.string,
  }).isRequired,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default BillCard;
