import React from "react";

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return <div className={["rounded-lg border border-gray-200 bg-white shadow-sm", className].join(" ")}>{children}</div>;
}

export function CardBody({ children, className = "" }: CardProps) {
  return <div className={["p-4", className].join(" ")}>{children}</div>;
}
