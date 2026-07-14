'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, ROLE_HOME_PATH, type LoginInput, type Role } from '@ml-trading-ops/shared';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ApiClientError, apiClient } from '@/lib/api-client';

const REMEMBER_EMAIL_KEY = 'mlt-ops:remember-email';

interface LoginResponse {
  user: { id: string; email: string; name: string; role: Role };
}

export default function LoginPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberEmail: false },
  });

  useEffect(() => {
    const remembered = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (remembered) {
      form.setValue('email', remembered);
      form.setValue('rememberEmail', true);
    }
    // Only ever run once on mount to prefill from a previous session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(values: LoginInput) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const { user } = await apiClient.post<LoginResponse>('/auth/login', values);

      if (values.rememberEmail) {
        window.localStorage.setItem(REMEMBER_EMAIL_KEY, values.email);
      } else {
        window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      router.push(ROLE_HOME_PATH[user.role]);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setSubmitError(
          err.code === 'RATE_LIMITED'
            ? 'Too many attempts. Please wait a few minutes and try again.'
            : err.message,
        );
      } else {
        setSubmitError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary to-primary-hover p-4">
      <div className="w-full max-w-sm rounded-lg bg-background p-8 shadow-lg">
        <div className="mb-6 flex justify-center">
          <Image src="/brand/logo-full.png" alt="ML Trading International" width={180} height={130} priority />
        </div>

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

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rememberEmail"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">Remember my email</FormLabel>
                </FormItem>
              )}
            />

            {submitError && <p className="text-sm font-medium text-destructive">{submitError}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </Form>

        <div className="mt-4 text-center text-sm">
          <Link href="/forgot-password" className="text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}
