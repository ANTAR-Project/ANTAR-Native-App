import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SEEDED_POLICY_MATRIX } from "../../src/policies";
import type { UserRole } from "../../src/types";

type RoleFilter = UserRole | "SERVICE";

const ROLES: RoleFilter[] = ["OWNER", "RESIDENT", "GUEST", "SERVICE"];

export default function PolicyMatrixScreen() {
  const [selectedRole, setSelectedRole] = useState<RoleFilter>("OWNER");

  const rules = SEEDED_POLICY_MATRIX.filter((r) => r.role === selectedRole);
  const allowCount = rules.filter((r) => r.effect === "ALLOW").length;
  const denyCount = rules.filter((r) => r.effect === "DENY").length;

  return (
    <View className="flex-1 bg-blue-950">
      {/* Role picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-16 border-b border-blue-900"
        contentContainerClassName="items-center gap-2 px-4"
      >
        {ROLES.map((r) => {
          const active = r === selectedRole;
          return (
            <Pressable
              key={r}
              onPress={() => setSelectedRole(r)}
              className={`rounded-full px-4 py-2 ${active ? "bg-blue-200" : "bg-blue-900"}`}
            >
              <Text
                className={`text-xs font-bold ${
                  active ? "text-blue-950" : "text-blue-200"
                }`}
              >
                {r}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerClassName="p-4 pb-12">
        <View className="rounded-2xl border border-blue-800 bg-blue-900/60 p-4">
          <Text className="text-sm font-bold text-blue-100">
            {selectedRole} · {allowCount} ALLOW / {denyCount} DENY
          </Text>
          <Text className="mt-1 text-xs leading-4 text-blue-300">
            Enforced server-side by policy-registry (gRPC :9001) & api-gateway.
            DENY (priority 100) overrides ALLOW; unmatched requests default to DENY.
          </Text>
        </View>

        <View className="mt-4 gap-2.5">
          {rules.map((rule, idx) => (
            <View
              key={`${rule.ruleName}-${rule.scope}-${rule.qualifier ?? "none"}-${idx}`}
              className="rounded-2xl border border-blue-800 bg-blue-900/70 p-3.5"
            >
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 font-mono text-xs font-bold text-blue-100">
                  {rule.ruleName}
                </Text>
                <View
                  className={`rounded-full px-2.5 py-0.5 ${
                    rule.effect === "ALLOW" ? "bg-emerald-950" : "bg-red-950"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      rule.effect === "ALLOW" ? "text-emerald-300" : "text-red-300"
                    }`}
                  >
                    {rule.effect} (p{rule.priority})
                  </Text>
                </View>
              </View>

              <Text className="mt-1.5 text-xs text-blue-300">
                {rule.domain} · {rule.action} {rule.resourceType} · Scope: {rule.scope}
                {rule.qualifier ? ` · Target: ${rule.qualifier}` : ""}
              </Text>

              {rule.conditions !== "{}" && (
                <Text className="mt-1 font-mono text-[11px] text-amber-300">
                  conditions: {rule.conditions}
                </Text>
              )}

              {rule.note && (
                <Text className="mt-1 text-[11px] text-blue-400">{rule.note}</Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
