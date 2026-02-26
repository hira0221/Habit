import { SafeAreaView, StyleSheet, Switch, Text, View } from "react-native";

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>設定</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>通知（準備中）</Text>
          <Switch value={false} disabled />
        </View>
        <Text style={styles.note}>移行土台の作成後に Expo Notifications を接続します。</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1b202b",
    padding: 16
  },
  title: {
    color: "#e9edf5",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16
  },
  card: {
    backgroundColor: "#242b38",
    borderColor: "#3a4357",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  label: {
    color: "#e9edf5",
    fontSize: 16,
    fontWeight: "600"
  },
  note: {
    color: "#aab3c5",
    fontSize: 13
  }
});
