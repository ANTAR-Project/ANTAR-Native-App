import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useTheme } from "../../src/context/ThemeContext";
import { SEEDED_POLICY_MATRIX } from "../../src/policies";
import type { UserRole } from "../../src/types";

type RoleFilter = UserRole | "SERVICE";

const ROLES: RoleFilter[] = ["OWNER", "RESIDENT", "GUEST", "SERVICE"];

export default function PolicyMatrixScreen() {
  const { colors } = useTheme();
  const [selectedRole, setSelectedRole] = useState<RoleFilter>("OWNER");

  const rules = SEEDED_POLICY_MATRIX.filter((r) => r.role === selectedRole);
  const allowCount = rules.filter((r) => r.effect === "ALLOW").length;
  const denyCount = rules.filter((r) => r.effect === "DENY").length;

  return (
    <View style={{ backgroundColor: colors.bg }} className="flex-1">
      {/* Role picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ borderBottomColor: colors.hairline, borderBottomWidth: 1 }}
        className="max-h-14"
        contentContainerClassName="items-center gap-2 px-4"
      >
        {ROLES.map((r) => {
          const active = r === selectedRole;
          return (
            <Pressable
              key={r}
              onPress={() => setSelectedRole(r)}
              style={{
                backgroundColor: active ? colors.accent : colors.surface,
                borderColor: active ? colors.accent : colors.hairlineStrong,
                borderWidth: 1,
              }}
              className="rounded-full px-4 py-1.5"
            >
              <Text
                style={{ color: active ? colors.accentInk : colors.inkMuted }}
                className="text-[11px] font-bold tracking-wider"
              >
                {r}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerClassName="p-4 pb-12">
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.hairline,
            borderWidth: 1,
          }}
          className="rounded-2xl p-4"
        >
          <Text style={{ color: colors.ink }} className="text-sm font-semibold">
            {selectedRole} · {allowCount} ALLOW / {denyCount} DENY
          </Text>
          <Text style={{ color: colors.inkMuted }} className="mt-1.5 text-xs leading-4">
            Enforced server-side by policy-registry (gRPC :9001) & api-gateway.
            DENY (priority 100) overrides ALLOW; unmatched requests default to DENY.
          </Text>
        </View>

        <View className="mt-4 gap-2.5">
          {rules.map((rule, idx) => (
            <View
              key={`${rule.ruleName}-${rule.scope}-${rule.qualifier ?? "none"}-${idx}`}
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.hairline,
                borderWidth: 1,
              }}
              className="rounded-2xl p-4"
            >
              <View className="flex-row items-center justify-between gap-2">
                <Text
                  style={{ color: colors.ink }}
                  className="flex-1 font-mono text-xs font-semibold"
                >
                  {rule.ruleName}
                </Text>
                <View
                  style={{
                    backgroundColor:
                      rule.effect === "ALLOW" ? colors.emeraldBg : colors.crimsonBg,
                    borderColor:
                      rule.effect === "ALLOW"
                        ? colors.emeraldBorder
                        : colors.crimsonBorder,
                    borderWidth: 1,
                  }}
                  className="rounded-full px-2.5 py-0.5"
                >
                  <Text
                    style={{
                      color:
                        rule.effect === "ALLOW" ? colors.emerald : colors.crimson,
                    }}
                    className="text-[10px] font-bold"
                  >
                    {rule.effect} · p{rule.priority}
                  </Text>
                </View>
              </View>

              <Text style={{ color: colors.inkMuted }} className="mt-1.5 text-xs">
                {rule.domain} · {rule.action} {rule.resourceType} · Scope: {rule.scope}
                {rule.qualifier ? ` · Target: ${rule.qualifier}` : ""}
              </Text>

              {rule.conditions !== "{}" && (
                <Text
                  style={{ color: colors.accentWarm }}
                  className="mt-1.5 font-mono text-[11px]"
                >
                  conditions: {rule.conditions}
                </Text>
              )}

              {rule.note && (
                <Text style={{ color: colors.inkSubtle }} className="mt-1 text-[11px]">
                  {rule.note}
                </Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
