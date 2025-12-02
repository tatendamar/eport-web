import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function Home() {
  return (
    <section className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Asset Manager</h1>
      <p className="mt-2 text-gray-700">Manage assets with role-based access.</p>
      <Card className="mt-6">
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Get Started</h2>
              <p className="text-sm text-gray-600">Sign in to access your dashboard.</p>
            </div>
            <Link href="/login">
              <Button>Login</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </section>
  );
}
