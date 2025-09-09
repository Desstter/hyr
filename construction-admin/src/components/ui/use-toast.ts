import { toast as sonnerToast } from "sonner";

interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

export const toast = (props: ToastProps) => {
  const { title, description, variant, action, duration } = props;

  // Format message based on title and description
  let message = title || "";
  if (description) {
    message = title ? `${title}\n${description}` : description;
  }

  // Configure toast options
  const options: {
    duration: number;
    action?: { label: string; onClick: () => void };
  } = {
    duration: duration || 4000,
  };

  // Add action button if provided
  if (action) {
    options.action = {
      label: action.label,
      onClick: action.onClick,
    };
  }

  // Display toast based on variant
  if (variant === "destructive") {
    return sonnerToast.error(message, options);
  } 
    return sonnerToast.success(message, options);
  
};

// Export individual toast methods for convenience
export const toastSuccess = (message: string, options?: Partial<ToastProps>) =>
  toast({ title: message, ...options });

export const toastError = (message: string, options?: Partial<ToastProps>) =>
  toast({ title: message, variant: "destructive", ...options });

export const toastInfo = (message: string, options?: Partial<ToastProps>) =>
  sonnerToast(message, { duration: options?.duration || 4000 });

// Default export for compatibility
const toastUtils = { toast, toastSuccess, toastError, toastInfo };
export default toastUtils;
