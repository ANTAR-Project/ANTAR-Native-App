import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { MOCK_ELEMENTS, MOCK_RESIDENTS } from "../../src/data/mock";

type Grants = Record<string, Record<string, boolean>>;

const INITIAL: Grants = Object.fromEntries(
  MOCK_RESIDENTS.map((r, i) => [
    r.id,
    Object.fromEntries(MOCK_ELEMENTS.map((e, j) => [e.id, (i + j) % 2 === 0])),
  ])
);

export default function Permissions() {
  const [grants, setGrants] = useState<Grants>(INITIAL);
  const [selected, setSelected] = useState(MOCK_RESIDENTS[0].id);

  const current = grants[selected];
  const grantedCount = MOCK_ELEMENTS.filter((e) => current[e.id]).length;

  const setOne = (elementId: string, value: boolean) =>
    // TODO: call the grant/revoke permission endpoint
    setGrants((prev) => ({
      ...prev,
      [selected]: { ...prev[selected], [elementId]: value },
    }));

  const setAll = (value: boolean) =>
    setGrants((prev) => ({
      ...prev,
      [selected]: Object.fromEntries(MOCK_ELEMENTS.map((e) => [e.id, value])),
    }));

  return (
    <View className="flex-1 bg-blue-950">
      {/* Resident picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-16 border-b border-blue-800"
        contentContainerClassName="items-center gap-2 px-4"
      >
        {MOCK_RESIDENTS.map((r) => {
          const active = r.id === selected;
          return (
            <Pressable
              key={r.id}
              onPress={() => setSelected(r.id)}
              className={`rounded-full px-4 py-2 ${active ? "bg-blue-200" : "bg-blue-800"}`}
            >
              <Text
                className={`text-sm font-semibold ${
                  active ? "text-blue-900" : "text-blue-200"
                }`}
              >
                {r.username}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerClassName="p-4 pb-10">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-blue-300">
            {grantedCount} of {MOCK_ELEMENTS.length} elements allowed
          </Text>
          <View className="flex-row gap-4">
            <Pressable onPress={() => setAll(true)}>
              <Text className="text-sm font-semibold text-blue-200">Grant all</Text>
            </Pressable>
            <Pressable onPress={() => setAll(false)}>
              <Text className="text-sm font-semibold text-red-300">Revoke all</Text>
            </Pressable>
          </View>
        </View>

        <View className="mt-4 gap-2.5">
          {MOCK_ELEMENTS.map((el) => (
            <View key={el.id} className="flex-row items-center rounded-2xl bg-blue-800 p-4">
              <View className="flex-1">
                <Text className="text-base font-semibold text-blue-100">{el.name}</Text>
                <Text className="mt-0.5 text-xs capitalize text-blue-300">{el.kind}</Text>
              </View>
              <Switch
                value={!!current[el.id]}
                onValueChange={(v) => setOne(el.id, v)}
                trackColor={{ false: "#1e3a8a", true: "#60a5fa" }}
                thumbColor="#e0f2fe"
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}