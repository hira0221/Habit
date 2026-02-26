import { Link } from "expo-router";
import { useEffect } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { useHabitsStore } from "@/features/habits/useHabitsStore";

export default function HomeScreen() {
  const { habits, activeSlot, initialize, setActiveSlot, toggleHabit } = useHabitsStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const visible = habits.filter(h => h.slot === activeSlot);
  const completed = visible.filter(h => h.done).length;
  const progress = visible.length === 0 ? 0 : Math.round((completed / visible.length) * 100);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>習慣チェック</Text>
        <Link href="/settings" asChild>
          <Pressable style={styles.settingsBtn}>
            <Text style={styles.settingsText}>設定</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.slotRow}>
        {(["morning", "noon", "night"] as const).map(slot => (
          <Pressable
            key={slot}
            onPress={() => setActiveSlot(slot)}
            style={[styles.slotBtn, activeSlot === slot && styles.slotBtnActive]}
          >
            <Text style={[styles.slotText, activeSlot === slot && styles.slotTextActive]}>{label(slot)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.progressText}>達成率 {progress}%</Text>

      <View style={styles.list}>
        {visible.length === 0 ? (
          <Text style={styles.empty}>この時間帯の習慣はまだありません</Text>
        ) : (
          visible.map(item => (
            <Pressable key={item.id} onPress={() => toggleHabit(item.id)} style={[styles.item, item.done && styles.itemDone]}>
              <Text style={styles.itemText}>{item.text}</Text>
              <Text style={styles.itemState}>{item.done ? "完了" : "未完了"}</Text>
            </Pressable>
          ))
        )}
      </View>
    </SafeAreaView>
  );
}

function label(slot: "morning" | "noon" | "night") {
  if (slot === "morning") return "朝";
  if (slot === "noon") return "昼";
  return "夜";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1b202b",
    paddingHorizontal: 16,
    paddingTop: 10
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    color: "#e9edf5",
    fontSize: 28,
    fontWeight: "700"
  },
  settingsBtn: {
    borderWidth: 1,
    borderColor: "#3a4357",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#2d3647"
  },
  settingsText: {
    color: "#e9edf5",
    fontWeight: "600"
  },
  slotRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16
  },
  slotBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#3a4357",
    borderRadius: 18,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#2d3647"
  },
  slotBtnActive: {
    backgroundColor: "#63a4ff",
    borderColor: "#63a4ff"
  },
  slotText: {
    color: "#e9edf5",
    fontWeight: "600"
  },
  slotTextActive: {
    color: "#08131f"
  },
  progressText: {
    color: "#aab3c5",
    marginTop: 16,
    marginBottom: 8,
    fontSize: 16
  },
  list: {
    flex: 1,
    gap: 8
  },
  empty: {
    color: "#aab3c5",
    marginTop: 12
  },
  item: {
    borderWidth: 1,
    borderColor: "#3a4357",
    borderRadius: 14,
    backgroundColor: "#242b38",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  itemDone: {
    backgroundColor: "#173428"
  },
  itemText: {
    color: "#e9edf5",
    fontSize: 16,
    flex: 1,
    marginRight: 8
  },
  itemState: {
    color: "#aab3c5",
    fontWeight: "600"
  }
});
