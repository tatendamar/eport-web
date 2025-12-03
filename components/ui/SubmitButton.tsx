"use client";
import { Button } from "./Button";
import { useFormStatus } from "react-dom";

type Props = React.ComponentProps<typeof Button> & {
  pendingText?: string;
};

export function SubmitButton({ children, pendingText = "Please wait...", ...rest }: Props) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      aria-busy={pending}
      disabled={pending || rest.disabled}
      {...rest}
    >
      {pending ? pendingText : children}
    </Button>
  );
}
