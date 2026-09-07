import type { ReactNode } from "react";
import { Card, CardHeader, CardBody } from "../ui/Card";

export function ChartCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} action={action} />
      <CardBody>{children}</CardBody>
    </Card>
  );
}
