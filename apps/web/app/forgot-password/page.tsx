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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary to-primary-hover p-4">
      <div className="w-full max-w-sm rounded-lg bg-background p-8 shadow-lg">
        <h1 className="mb-1 text-lg font-semibold">Forgot your password?</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        {submitted ? (
          <p className="text-sm">
            If that email exists, a reset link will be sent. Check your inbox, then{' '}
            <Link href="/login" className="text-primary hover:underline">
              return to sign in
            </Link>
            .
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
          </Form>
        )}

        <div className="mt-4 text-center text-sm">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
