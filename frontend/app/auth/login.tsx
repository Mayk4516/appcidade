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
  Check,
  Sparkles,
} from "lucide-react-native";
import { useTheme, makeStyles } from "@/src/theme";
import { useAuth, DEMO_USERS } from "@/src/context/AuthContext";
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
      if (!res.ok) {
        throw new Error(data.detail || "Falha na autenticação");
      }

      await login(data.access_token, data.user);
      if (data.user.role === "store_owner") {
        router.replace("/owner/dashboard" as any);
      } else if (data.user.role === "super_admin") {
        router.replace("/admin/dashboard" as any);
      } else {
        router.replace("/(tabs)" as any);
      }
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
      if (role === "store_owner") {
        router.replace("/owner/dashboard" as any);
      } else if (role === "super_admin") {
        router.replace("/admin/dashboard" as any);
      } else {
        router.replace("/(tabs)" as any);
      }
    } catch (e: any) {
      setErrorMessage(e?.message || "Erro ao entrar com conta demo");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <Pressable
          testID="auth-back-btn"
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {mode === "login" ? "Entrar na Plataforma" : "Criar Nova Conta"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1-Tap Quick Demo Cards */}
        <View style={styles.demoSection}>
          <Text style={styles.demoSectionLabel}>
            ENTRAR RAPIDAMENTE COM CONTAS DEMO
          </Text>

          <View style={styles.demoGrid}>
            <Pressable
              testID="quick-demo-consumer-btn"
              style={[styles.demoCard, { borderColor: "#A7F3D0" }]}
              onPress={() => handleQuickDemo("user")}
            >
              <User size={18} color="#047857" />
              <Text style={styles.demoCardTitle}>Consumidor</Text>
              <Text style={styles.demoCardSubtitle}>Explorar lojas</Text>
            </Pressable>

            <Pressable
              testID="quick-demo-owner-btn"
              style={[styles.demoCard, { borderColor: colors.brandPrimary }]}
              onPress={() => handleQuickDemo("store_owner")}
            >
              <Store size={18} color={colors.brandPrimary} />
              <Text style={styles.demoCardTitle}>Lojista</Text>
              <Text style={styles.demoCardSubtitle}>Painel SaaS</Text>
            </Pressable>

            <Pressable
              testID="quick-demo-admin-btn"
              style={[styles.demoCard, { borderColor: "#C7D2FE" }]}
              onPress={() => handleQuickDemo("super_admin")}
            >
              <Shield size={18} color="#4338CA" />
              <Text style={styles.demoCardTitle}>Admin</Text>
              <Text style={styles.demoCardSubtitle}>Governança</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.orDividerRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OU USE SEUS DADOS</Text>
          <View style={styles.orLine} />
        </View>

        {/* Mode Switcher Tabs */}
        <View style={styles.modeTabs}>
          <Pressable
            testID="auth-mode-login-tab"
            style={[styles.modeTab, mode === "login" && styles.modeTabActive]}
            onPress={() => setMode("login")}
          >
            <Text
              style={[
                styles.modeTabText,
                mode === "login" && styles.modeTabTextActive,
              ]}
            >
              Fazer Login
            </Text>
          </Pressable>

          <Pressable
            testID="auth-mode-register-tab"
            style={[styles.modeTab, mode === "register" && styles.modeTabActive]}
            onPress={() => setMode("register")}
          >
            <Text
              style={[
                styles.modeTabText,
                mode === "register" && styles.modeTabTextActive,
              ]}
            >
              Cadastrar
            </Text>
          </Pressable>
        </View>

        {/* Error message */}
        {errorMessage ? (
          <View style={styles.errorBox} testID="auth-error-box">
            <Text style={styles.errorBoxText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Inputs */}
        {mode === "register" && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nome Completo</Text>
              <View style={styles.inputWrapper}>
                <User size={18} color={colors.muted} />
                <TextInput
                  testID="auth-name-input"
                  style={styles.textInput}
                  placeholder="Seu nome ou da empresa"
                  placeholderTextColor={colors.muted}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>WhatsApp / Telefone</Text>
              <View style={styles.inputWrapper}>
                <Phone size={18} color={colors.muted} />
                <TextInput
                  testID="auth-phone-input"
                  style={styles.textInput}
                  placeholder="(11) 99999-9999"
                  placeholderTextColor={colors.muted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Role picker for registration */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Tipo de Conta</Text>
              <View style={styles.roleSelectionRow}>
                <Pressable
                  testID="role-select-consumer"
                  style={[
                    styles.roleRadioBtn,
                    selectedRole === "user" && styles.roleRadioBtnActive,
                  ]}
                  onPress={() => setSelectedRole("user")}
                >
                  <Text
                    style={[
                      styles.roleRadioText,
                      selectedRole === "user" && styles.roleRadioTextActive,
                    ]}
                  >
                    Consumidor
                  </Text>
                </Pressable>

                <Pressable
                  testID="role-select-owner"
                  style={[
                    styles.roleRadioBtn,
                    selectedRole === "store_owner" && styles.roleRadioBtnActive,
                  ]}
                  onPress={() => setSelectedRole("store_owner")}
                >
                  <Text
                    style={[
                      styles.roleRadioText,
                      selectedRole === "store_owner" && styles.roleRadioTextActive,
                    ]}
                  >
                    Lojista (Cadastrar Loja)
                  </Text>
                </Pressable>
              </View>
            </View>
          </>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>E-mail</Text>
          <View style={styles.inputWrapper}>
            <Mail size={18} color={colors.muted} />
            <TextInput
              testID="auth-email-input"
              style={styles.textInput}
              placeholder="seuemail@exemplo.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Senha</Text>
          <View style={styles.inputWrapper}>
            <Lock size={18} color={colors.muted} />
            <TextInput
              testID="auth-password-input"
              style={styles.textInput}
              placeholder="Sua senha secreta"
              placeholderTextColor={colors.muted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
        </View>

        {/* Submit button */}
        <Pressable
          testID="auth-submit-btn"
          style={styles.submitBtn}
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
        </Pressable>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.onSurface,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  demoSection: {
    marginBottom: 20,
  },
  demoSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.brandPrimary,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  demoGrid: {
    flexDirection: "row",
    gap: 8,
  },
  demoCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  demoCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
    marginTop: 4,
  },
  demoCardSubtitle: {
    fontSize: 10,
    color: colors.muted,
  },
  orDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 16,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  orText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 0.6,
  },
  modeTabs: {
    flexDirection: "row",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  modeTabActive: {
    backgroundColor: colors.surfaceSecondary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  modeTabTextActive: {
    color: colors.onSurfaceSecondary,
    fontWeight: "700",
  },
  errorBox: {
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorBoxText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: "600",
  },
  inputContainer: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: colors.onSurface,
    height: "100%",
  },
  roleSelectionRow: {
    flexDirection: "row",
    gap: 8,
  },
  roleRadioBtn: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  roleRadioBtnActive: {
    borderColor: colors.brandPrimary,
    backgroundColor: colors.brandTertiary,
  },
  roleRadioText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  roleRadioTextActive: {
    color: colors.brandPrimary,
    fontWeight: "700",
  },
  submitBtn: {
    backgroundColor: colors.brandPrimary,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
}));
