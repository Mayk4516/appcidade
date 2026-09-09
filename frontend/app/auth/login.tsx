import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Mail,
  Lock,
  User,
  Phone,
  Store,
  Shield,
  MapPin,
} from "lucide-react-native";
import { useTheme, makeStyles, INK, TACTILE_CARD } from "@/src/theme";
import { PressableScale } from "@/src/components/PressableScale";
import { useAuth } from "@/src/context/AuthContext";
import { UserRole } from "@/src/types";

export default function AuthLoginScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const { login, switchDemoRole } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("user");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleCustomAuth = async () => {
    setErrorMessage("");
    if (!email || !password) {
      setErrorMessage("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    setIsLoading(true);
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "";
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { email: email.trim(), password }
          : {
              name: name.trim() || email.split("@")[0],
              email: email.trim(),
              password,
              role: selectedRole,
              phone: phone.trim(),
            };

      const res = await fetch(`${backendUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Falha na autenticação");

      await login(data.access_token, data.user);
      if (data.user.role === "store_owner") router.replace("/owner/dashboard" as any);
      else if (data.user.role === "super_admin") router.replace("/admin/dashboard" as any);
      else router.replace("/(tabs)" as any);
    } catch (e: any) {
      setErrorMessage(e.message || "Erro de conexão com o servidor");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async (role: UserRole) => {
    setErrorMessage("");
    setIsLoading(true);
    try {
      await switchDemoRole(role);
      if (role === "store_owner") router.replace("/owner/dashboard" as any);
      else if (role === "super_admin") router.replace("/admin/dashboard" as any);
      else router.replace("/(tabs)" as any);
    } catch (e: any) {
      setErrorMessage(e?.message || "Erro ao entrar com conta demo");
    } finally {
      setIsLoading(false);
    }
  };

  const demoCards: { role: UserRole; label: string; sub: string; Icon: any; bg: string; fg: string; testID: string }[] = [
    { role: "user", label: "Consumidor", sub: "Explorar lojas", Icon: User, bg: "#DCFCE7", fg: "#15803D", testID: "quick-demo-consumer-btn" },
    { role: "store_owner", label: "Lojista", sub: "Painel SaaS", Icon: Store, bg: colors.brandTertiary, fg: colors.brandPrimary, testID: "quick-demo-owner-btn" },
    { role: "super_admin", label: "Admin", sub: "Governança", Icon: Shield, bg: "#EEF2FF", fg: "#4338CA", testID: "quick-demo-admin-btn" },
  ];

  return (
    <View style={styles.container}>
      {/* Dark hero header */}
      <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
        <Pressable
          testID="auth-back-btn"
          style={styles.backBtn}
          hitSlop={8}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
        <View style={styles.brandBlock}>
          <View style={styles.brandMark}>
            <MapPin size={26} color="#FFFFFF" />
          </View>
          <Text style={styles.brandTitle}>CityHub</Text>
          <Text style={styles.brandSubtitle}>
            {mode === "login" ? "Bem-vindo de volta à sua cidade" : "Crie sua conta e comece agora"}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Demo quick cards */}
        <Text style={styles.groupLabel}>ENTRAR RAPIDAMENTE (DEMO)</Text>
        <View style={styles.demoGrid}>
          {demoCards.map((d) => (
            <PressableScale
              key={d.role}
              testID={d.testID}
              style={styles.demoCard}
              haptic="medium"
              onPress={() => handleQuickDemo(d.role)}
            >
              <View style={[styles.demoIcon, { backgroundColor: d.bg }]}>
                <d.Icon size={22} color={d.fg} />
              </View>
              <Text style={styles.demoCardTitle}>{d.label}</Text>
              <Text style={styles.demoCardSub}>{d.sub}</Text>
            </PressableScale>
          ))}
        </View>

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OU USE SEUS DADOS</Text>
          <View style={styles.orLine} />
        </View>

        {/* Mode tabs */}
        <View style={styles.modeTabs}>
          <Pressable
            testID="auth-mode-login-tab"
            style={[styles.modeTab, mode === "login" && styles.modeTabActive]}
            onPress={() => setMode("login")}
          >
            <Text style={[styles.modeTabText, mode === "login" && styles.modeTabTextActive]}>
              Fazer Login
            </Text>
          </Pressable>
          <Pressable
            testID="auth-mode-register-tab"
            style={[styles.modeTab, mode === "register" && styles.modeTabActive]}
            onPress={() => setMode("register")}
          >
            <Text style={[styles.modeTabText, mode === "register" && styles.modeTabTextActive]}>
              Cadastrar
            </Text>
          </Pressable>
        </View>

        {errorMessage ? (
          <View style={styles.errorBox} testID="auth-error-box">
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {mode === "register" && (
          <>
            <Field label="Nome Completo">
              <User size={18} color={colors.muted} />
              <TextInput
                testID="auth-name-input"
                style={styles.input}
                placeholder="Seu nome ou da empresa"
                placeholderTextColor={colors.muted}
                value={name}
                onChangeText={setName}
              />
            </Field>
            <Field label="WhatsApp / Telefone">
              <Phone size={18} color={colors.muted} />
              <TextInput
                testID="auth-phone-input"
                style={styles.input}
                placeholder="(11) 99999-9999"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </Field>
            <Text style={styles.fieldLabel}>Tipo de Conta</Text>
            <View style={styles.roleRow}>
              <Pressable
                testID="role-select-consumer"
                style={[styles.roleBtn, selectedRole === "user" && styles.roleBtnActive]}
                onPress={() => setSelectedRole("user")}
              >
                <Text style={[styles.roleBtnText, selectedRole === "user" && styles.roleBtnTextActive]}>
                  Consumidor
                </Text>
              </Pressable>
              <Pressable
                testID="role-select-owner"
                style={[styles.roleBtn, selectedRole === "store_owner" && styles.roleBtnActive]}
                onPress={() => setSelectedRole("store_owner")}
              >
                <Text style={[styles.roleBtnText, selectedRole === "store_owner" && styles.roleBtnTextActive]}>
                  Lojista
                </Text>
              </Pressable>
            </View>
          </>
        )}

        <Field label="E-mail">
          <Mail size={18} color={colors.muted} />
          <TextInput
            testID="auth-email-input"
            style={styles.input}
            placeholder="seuemail@exemplo.com"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </Field>

        <Field label="Senha">
          <Lock size={18} color={colors.muted} />
          <TextInput
            testID="auth-password-input"
            style={styles.input}
            placeholder="Sua senha secreta"
            placeholderTextColor={colors.muted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </Field>

        <PressableScale
          testID="auth-submit-btn"
          style={styles.submitBtn}
          haptic="medium"
          onPress={handleCustomAuth}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>
              {mode === "login" ? "Entrar na Conta" : "Criar Minha Conta"}
            </Text>
          )}
        </PressableScale>
      </ScrollView>
    </View>
  );
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  const styles = useStyles();
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrapper}>{children}</View>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  hero: {
    backgroundColor: colors.surfaceInverse,
    paddingHorizontal: 20,
    paddingBottom: 32,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  brandBlock: {
    alignItems: "center",
    marginTop: 12,
  },
  brandMark: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.brandPrimary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 4,
    borderBottomColor: colors.brandSecondary,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.brandPrimary,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  demoGrid: {
    flexDirection: "row",
    gap: 10,
  },
  demoCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 12,
    alignItems: "center",
    ...TACTILE_CARD,
  },
  demoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  demoCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.onSurface,
  },
  demoCardSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 22,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  orText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 0.6,
  },
  modeTabs: {
    flexDirection: "row",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 16,
    padding: 5,
    marginBottom: 20,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    borderRadius: 12,
  },
  modeTabActive: {
    backgroundColor: colors.surfaceSecondary,
    ...TACTILE_CARD,
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.muted,
  },
  modeTabTextActive: {
    color: colors.onSurface,
    fontWeight: "800",
  },
  errorBox: {
    backgroundColor: "#FEE2E2",
    borderWidth: 2,
    borderColor: "#FCA5A5",
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: "700",
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 54,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.onSurface,
    height: "100%",
  },
  roleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  roleBtn: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  roleBtnActive: {
    borderColor: colors.brandPrimary,
    backgroundColor: colors.brandTertiary,
  },
  roleBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
  },
  roleBtnTextActive: {
    color: colors.brandPrimary,
    fontWeight: "800",
  },
  submitBtn: {
    backgroundColor: colors.brandPrimary,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    borderBottomWidth: 4,
    borderBottomColor: INK,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
}));
