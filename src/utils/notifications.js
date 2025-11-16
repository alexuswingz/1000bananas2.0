/**
 * Reusable Notification and Dialog Utilities
 * 
 * This file provides examples and helper functions for using
 * toast notifications and confirmation dialogs across the application.
 */

import { toast } from 'sonner';

/**
 * Toast Notification Examples
 * Use these anywhere in your components after importing { toast } from 'sonner'
 */

// Success Toast
export const showSuccessToast = (message, description) => {
  toast.success(message, {
    description: description,
    duration: 4000,
  });
};

// Error Toast
export const showErrorToast = (message, description) => {
  toast.error(message, {
    description: description,
    duration: 5000,
  });
};

// Info Toast
export const showInfoToast = (message, description) => {
  toast.info(message, {
    description: description,
    duration: 4000,
  });
};

// Warning Toast
export const showWarningToast = (message, description) => {
  toast.warning(message, {
    description: description,
    duration: 4000,
  });
};

// Loading Toast (with promise)
export const showLoadingToast = async (promise, messages) => {
  return toast.promise(promise, {
    loading: messages.loading || 'Loading...',
    success: messages.success || 'Success!',
    error: messages.error || 'Error occurred',
  });
};

/**
 * Example Usage in Components:
 * 
 * import { toast } from 'sonner';
 * import { useDialog } from '../context/DialogContext';
 * 
 * function MyComponent() {
 *   const { showDialog } = useDialog();
 * 
 *   // Simple success toast
 *   const handleSuccess = () => {
 *     toast.success('Operation successful!', {
 *       description: 'Your data has been saved.',
 *     });
 *   };
 * 
 *   // Error toast
 *   const handleError = () => {
 *     toast.error('Operation failed', {
 *       description: 'Please try again later.',
 *     });
 *   };
 * 
 *   // Confirmation dialog with different types
 *   const handleDelete = () => {
 *     showDialog({
 *       title: 'Delete Item',
 *       message: 'Are you sure you want to delete this item? This action cannot be undone.',
 *       confirmText: 'Delete',
 *       cancelText: 'Cancel',
 *       type: 'danger', // Types: 'info', 'warning', 'danger', 'success'
 *       onConfirm: () => {
 *         // Perform delete action
 *         toast.success('Item deleted successfully!');
 *       },
 *     });
 *   };
 * 
 *   // Loading toast with promise
 *   const handleSave = async () => {
 *     const savePromise = saveDataToAPI();
 *     
 *     toast.promise(savePromise, {
 *       loading: 'Saving your data...',
 *       success: 'Data saved successfully!',
 *       error: 'Failed to save data',
 *     });
 *   };
 * 
 *   return (
 *     <div>
 *       <button onClick={handleSuccess}>Show Success</button>
 *       <button onClick={handleError}>Show Error</button>
 *       <button onClick={handleDelete}>Delete with Confirmation</button>
 *       <button onClick={handleSave}>Save with Loading</button>
 *     </div>
 *   );
 * }
 */

/**
 * Dialog Types and Use Cases:
 * 
 * 1. INFO (Blue) - General information, viewing details
 *    - Viewing item details
 *    - Showing additional information
 *    - Confirming navigation
 * 
 * 2. SUCCESS (Green) - Confirming positive actions
 *    - Saving data
 *    - Launching products
 *    - Completing tasks
 * 
 * 3. WARNING (Yellow) - Cautionary actions
 *    - Discarding unsaved changes
 *    - Overwriting existing data
 *    - Actions that might have consequences
 * 
 * 4. DANGER (Red) - Destructive actions
 *    - Deleting items
 *    - Removing records
 *    - Irreversible operations
 */


