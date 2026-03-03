import { toast } from "@/hooks/use-toast"

export const notify = {
  success: (message: string, description?: string) => {
    return toast({
      title: message,
      description,
      variant: "success",
    })
  },

  error: (message: string, description?: string) => {
    return toast({
      title: message,
      description,
      variant: "destructive",
    })
  },

  info: (message: string, description?: string) => {
    return toast({
      title: message,
      description,
      variant: "default",
    })
  },

  warning: (message: string, description?: string) => {
    return toast({
      title: message,
      description,
      variant: "destructive",
    })
  },
}

export { toast }
