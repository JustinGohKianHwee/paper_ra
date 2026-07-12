"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthFormState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthFormState = {};

export function LoginForm({ next, allowSignup = false }: { next?: string; allowSignup?: boolean }) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [signInState, signInAction, signInPending] = useActionState(signIn, initialState);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, initialState);

  // When sign-ups are disabled, sign-in is the only mode.
  const effectiveMode = allowSignup ? mode : "sign-in";
  const state = effectiveMode === "sign-in" ? signInState : signUpState;
  const pending = effectiveMode === "sign-in" ? signInPending : signUpPending;

  return (
    <Card>
      <CardContent className="pt-6">
        <form
          action={effectiveMode === "sign-in" ? signInAction : signUpAction}
          className="space-y-4"
        >
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={effectiveMode === "sign-in" ? "current-password" : "new-password"}
              required
              minLength={8}
            />
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          {state.message ? <p className="text-sm text-muted-foreground">{state.message}</p> : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Please wait…" : effectiveMode === "sign-in" ? "Sign in" : "Create account"}
          </Button>

          {allowSignup ? (
            <button
              type="button"
              className="w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
              onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
            >
              {mode === "sign-in" ? "First time? Create an account" : "Already registered? Sign in"}
            </button>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
