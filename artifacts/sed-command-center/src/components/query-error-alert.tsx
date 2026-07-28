import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatApiError } from "@/lib/api-error";

interface QueryErrorAlertProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

export function QueryErrorAlert({
  error,
  onRetry,
  title = "Data gagal dimuat",
}: QueryErrorAlertProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>{formatApiError(error)}</span>
        {onRetry && (
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            Coba lagi
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
