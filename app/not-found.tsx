import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "404 | Padel Manager" };

export default function NotFound() {
  return (
    <div className="text-center py-20">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-muted-foreground text-sm mt-2">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <div className="mt-6">
        <Link href="/">
          <Button variant="outline">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}