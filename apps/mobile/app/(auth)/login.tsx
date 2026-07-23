import { useRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Redirect } from 'expo-router';
import axios from 'axios';
import { Logo } from '@/components/Logo';
import { theme } from '@/theme';
import { useAuthStore } from '@/lib/auth-store';
import { loginSchema, type LoginInput } from '@/lib/schemas';
import { useLogin } from '@/hooks/useLogin';

export default function LoginScreen() {
  const isAuthenticated = useAuthStore((state) => state.accessToken !== null);
  const login = useLogin();

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { tenantSlug: '', email: '', password: '' },
  });

  const isUnauthorized = axios.isAxiosError(login.error) && login.error.response?.status === 401;

  const onSubmit = handleSubmit((input) => login.mutate(input));

  // Oturum açıksa (veya login başarılı olduysa) sekmelere yönlendir.
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Logo />
          <Text style={styles.title}>Hesabınıza giriş yapın</Text>
          <Text style={styles.subtitle}>Saha uygulamasına giriş yapın</Text>
        </View>

        {login.isError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {isUnauthorized
                ? 'E-posta, şifre veya firma kodu hatalı'
                : 'Giriş yapılamadı, lütfen tekrar deneyin'}
            </Text>
          </View>
        )}

        <View style={styles.form}>
          <Field label="Firma Kodu" error={errors.tenantSlug?.message}>
            <Controller
              control={control}
              name="tenantSlug"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.tenantSlug && styles.inputError]}
                  placeholder="Örn. demo-firma"
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              )}
            />
          </Field>

          <Field label="E-posta" error={errors.email?.message}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  ref={emailRef}
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="ornek@firma.com"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              )}
            />
          </Field>

          <Field label="Şifre" error={errors.password?.message}>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, errors.password && styles.inputError]}
                  placeholder="••••••••"
                  placeholderTextColor={theme.colors.textSecondary}
                  secureTextEntry
                  autoCapitalize="none"
                  returnKeyType="go"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  onSubmitEditing={onSubmit}
                />
              )}
            />
          </Field>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              (login.isPending || pressed) && styles.buttonPressed,
            ]}
            onPress={onSubmit}
            disabled={login.isPending}
          >
            {login.isPending ? (
              <ActivityIndicator color={theme.colors.surface} />
            ) : (
              <Text style={styles.buttonText}>Giriş Yap</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Alan sarmalayıcı: üstte etiket, altında (varsa) Türkçe hata mesajı. */
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  header: { alignItems: 'center', marginBottom: theme.spacing.xl },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  form: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
  },
  field: { marginBottom: theme.spacing.lg },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
  inputError: { borderColor: theme.colors.danger },
  fieldError: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.danger,
    marginTop: theme.spacing.xs,
  },
  button: {
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  buttonPressed: { backgroundColor: theme.colors.primaryDark },
  buttonText: {
    color: theme.colors.surface,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  errorText: { color: theme.colors.danger, fontSize: theme.fontSize.sm },
});
