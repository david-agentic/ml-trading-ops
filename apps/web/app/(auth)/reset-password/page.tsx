'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { passwordSchema } from '@ml-trading-ops/shared';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { BlurFadeIn } from '@/components/animate-ui/BlurFadeIn';
import { RiseCard } from '@/components/animate-ui/RiseCard';
import { ShimmerButton } from '@/components/animate-ui/ShimmerButton';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ApiClientError, apiClient } from '@/lib/api-client';

const CARD_CLASS =
  'w-full max-w-[420px] rounded-lg border border-subtle bg-surface-card p-6 shadow-lg lg:mt-0 lg:shadow-md';

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
      <RiseCard delay={0.1} className={CARD_CLASS}>
        <div className="text-center">
          <p className="text-body-sm font-medium text-danger-500">This reset link is missing its token.</p>
          <Link href="/forgot-password" className="mt-4 inline-block text-body-sm text-accent-500 hover:underline">
            Request a new reset link
          </Link>
        </div>
      </RiseCard>
    );
  }

  return (
    <RiseCard delay={0.1} className={CARD_CLASS}>
      <BlurFadeIn as="p" delay={0.2}>
        <p className="text-eyebrow text-text-tertiary">RESET PASSWORD</p>
      </BlurFadeIn>
      <BlurFadeIn as="p" delay={0.28}>
        <h1 className="mt-1 text-h2 text-text-primary">Set a new password</h1>
      </BlurFadeIn>
      <BlurFadeIn as="p" delay={0.36}>
        <p className="mt-1 text-body-sm text-text-secondary">At least 10 characters, with a letter and a number.</p>
      </BlurFadeIn>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
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

          {submitError && <p className="text-body-sm font-medium text-danger-500">{submitError}</p>}

          <ShimmerButton
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? 'Saving…' : 'Save new password'}
          </ShimmerButton>
        </form>
      </Form>
    </RiseCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
