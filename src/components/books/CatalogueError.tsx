import { useQueryClient } from "@tanstack/react-query";
import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { PublicLibraryLayout } from "@/components/layout/PublicLibraryLayout";
import { ErrorState } from "@/components/shared/states";
import { publicCatalogueQuery } from "@/services/public-catalogue";

export function CatalogueError({ reset }: ErrorComponentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  return (
    <PublicLibraryLayout>
      <ErrorState
        message="The catalogue could not be loaded. Please try again."
        onRetry={() => {
          void queryClient
            .resetQueries({ queryKey: publicCatalogueQuery.queryKey })
            .then(async () => {
              await router.invalidate({ sync: true });
              reset();
            });
        }}
      />
    </PublicLibraryLayout>
  );
}
