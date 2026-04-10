import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function useViewTransition() {
  const router = useRouter();
  
  const navigate = useCallback((href: string) => {
    if (!(document as any).startViewTransition) {
      router.push(href);
      return;
    }
    
    (document as any).startViewTransition(() => {
      router.push(href);
    });
  }, [router]);
  
  return navigate;
}