"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { ArrowRightIcon, LockIcon, UserIcon } from "@/components/icons";
import { signIn, signUp, type AuthState } from "@/lib/actions";
import { cn } from "@/lib/cn";

type Mode = "signin" | "signup";

function Field({
  label,
  name,
  type = "text",
  placeholder,
  hint,
  autoComplete,
  invalid,
  prefix,
  autoFocus,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  hint?: string;
  autoComplete?: string;
  invalid?: boolean;
  prefix?: string;
  autoFocus?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="label-caps text-[11px] text-muted">{label}</span>
      <span
        className={cn(
          "flex h-13 items-center gap-2 rounded-none border bg-surface px-3.5 transition focus-within:border-gold",
          invalid ? "border-warn" : "border-line",
        )}
      >
        {prefix ? <span className="text-[13px] text-dim tabular-nums">{prefix}</span> : null}
        <input
          name={name}
          type={type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required
          className="h-full w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-dim/70"
        />
      </span>
      {hint ? <span className="text-[11.5px] text-dim">{hint}</span> : null}
    </label>
  );
}

export function AuthForm({ mode, refused }: { mode: Mode; refused?: boolean }) {
  const action = mode === "signin" ? signIn : signUp;
  const [state, submit, pending] = useActionState<AuthState, FormData>(action, null);
  const bad = (field: string) => state?.field === field;

  return (
    <form action={submit} className="flex flex-col gap-4" data-testid="auth-form">
      {refused ? (
        <p className="rise rounded-none border border-warn/45 bg-warn/10 px-3.5 py-3 text-[12.5px] text-warn">
          Ce compte n&apos;a pas accès à cette partie de la plateforme.
        </p>
      ) : null}

      {state?.error ? (
        <p role="alert" className="shake rounded-none border border-warn/45 bg-warn/10 px-3.5 py-3 text-[12.5px] text-warn">
          {state.error}
        </p>
      ) : null}

      {mode === "signup" ? (
        <Field
          label="Nom"
          name="name"
          placeholder="Ariel N."
          autoComplete="name"
          defaultValue={state?.values?.name}
          invalid={bad("name")}
          autoFocus
        />
      ) : null}

      {mode === "signup" ? (
        // Le sexe ouvre les tableaux hommes, dames et mixtes : on le demande
        // une fois, ici, plutôt qu'au pied d'un tournoi.
        <fieldset className="flex flex-col gap-2">
          <legend className="label-caps pb-2 text-[11px] text-muted">Je suis</legend>
          <div className={cn("grid grid-cols-2 gap-2", bad("sexe") && "rounded-none ring-1 ring-warn")}>
            {[
              ["homme", "Un homme"],
              ["femme", "Une femme"],
            ].map(([valeur, libelle]) => (
              <label
                key={valeur}
                className="flex h-12 cursor-pointer items-center justify-center rounded-none border border-line bg-surface text-[14px] text-dim transition has-checked:border-gold has-checked:bg-gold/15 has-checked:text-ink"
              >
                <input type="radio" name="sexe" value={valeur} required className="sr-only" />
                {libelle}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <Field
        label="Numéro de téléphone"
        name="phone"
        type="tel"
        prefix="+237"
        placeholder="6 77 45 12 08"
        autoComplete="tel"
        defaultValue={state?.values?.phone}
        invalid={bad("phone")}
        autoFocus={mode === "signin"}
      />

      <Field
        label="Mot de passe"
        name="password"
        type="password"
        placeholder="••••••••"
        autoComplete={mode === "signin" ? "current-password" : "new-password"}
        hint={mode === "signup" ? "Six caractères au minimum." : undefined}
        invalid={bad("password")}
      />

      <Button size="lg" loading={pending} className="mt-1 w-full" type="submit">
        {mode === "signin" ? "Se connecter" : "Créer mon compte"}
        {pending ? null : <ArrowRightIcon size={17} />}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-[12.5px] text-muted">
        {mode === "signin" ? (
          <>
            <UserIcon size={14} /> Pas encore de Pass ?
            <Link href="/inscription" className="text-gold-text underline-offset-4 hover:underline">
              Créer un compte
            </Link>
          </>
        ) : (
          <>
            <LockIcon size={14} /> Déjà un compte ?
            <Link href="/connexion" className="text-gold-text underline-offset-4 hover:underline">
              Se connecter
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
