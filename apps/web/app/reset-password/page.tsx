'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { passwordSchema } from '@ml-trading-ops/shared';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ApiClientError, apiClient } from '@/lib/api-client';

// passwordResetConfirmSchema (packages/shared) only covers {token,
// newPassword} — the confirm-match check is a form-only concern, so it's
// composed here rather than added to the shared schema.
const formSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormInput = z.infer<typeof formSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values: FormInput) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      await apiClient.post('/auth/password-reset-confirm', { token, newPassword: values.newPassword });
      router.push('/login?resetSuccess=1');
    } catch (err) {
      setSubmitError(err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-sm rounded-lg bg-background p-8 shadow-lg text-center">
        <p className="text-sm font-medium text-destructive">This reset link is missing its token.</p>
        <Link href="/forgot-password" className="mt-4 inline-block text-sm text-primary hover:underline">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-lg bg-background p-8 shadow-lg">
      <h1 className="mb-1 text-lg font-semibold">Set a new password</h1>
      <p className="mb-6 text-sm text-muted-foreground">At least 10 characters, with a letter and a number.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {submitError && <p className="text-sm font-medium text-destructive">{submitError}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save new password'}
          </Button>
        </form>
      </Form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary to-primary-hover p-4">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
