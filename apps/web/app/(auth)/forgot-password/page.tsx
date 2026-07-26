'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { passwordResetRequestSchema, type PasswordResetRequestInput } from '@ml-trading-ops/shared';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<PasswordResetRequestInput>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: PasswordResetRequestInput) {
    setSubmitting(true);
    try {
      // Same response whether or not the email exists — apps/api never
      // leaks account existence, and neither does this page.
      await apiClient.post('/auth/password-reset-request', values);
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  }

  return (
    <>
      <p className="text-eyebrow text-text-tertiary">RESET PASSWORD</p>
      <h1 className="mt-1 text-h2 text-text-primary">Forgot your password?</h1>
      <p className="mt-1 text-body-sm text-text-secondary">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {submitted ? (
        <p className="mt-6 text-body-sm text-text-primary">
          If that email exists, a reset link will be sent. Check your inbox, then{' '}
          <Link href="/login" className="text-accent-500 hover:underline">
            return to sign in
          </Link>
          .
        </p>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        </Form>
      )}

      <div className="mt-3 text-center text-body-sm">
        <Link href="/login" className="text-accent-500 hover:underline">
          Back to sign in
        </Link>
      </div>
    </>
  );
}
