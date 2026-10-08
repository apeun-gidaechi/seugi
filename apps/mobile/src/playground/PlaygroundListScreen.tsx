import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
} from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { PlaygroundDemoEntry } from "./types";

export function PlaygroundListScreen({
  entries,
  onSelect,
}: {
  title: string;
  entries: PlaygroundDemoEntry[];
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return entries;
    return entries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(normalized) ||
        entry.group.toLowerCase().includes(normalized) ||
        entry.id.includes(normalized),
    );
  }, [entries, query]);

  const sections = useMemo(() => {
    const groups = new Map<string, PlaygroundDemoEntry[]>();
    for (const entry of filtered) {
      const list = groups.get(entry.group) ?? [];
      list.push(entry);
      groups.set(entry.group, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "ko"));
  }, [filtered]);

  const flatData = useMemo(
    () =>
      sections.flatMap(([group, items]) => [
        { type: "header" as const, group },
        ...items.map((item) => ({ type: "row" as const, item })),
      ]),
    [sections],
  );

  const renderItem = ({
    item,
  }: ListRenderItemInfo<
    { type: "header"; group: string } | { type: "row"; item: PlaygroundDemoEntry }
  >) => {
    if (item.type === "header") {
      return <Text style={styles.group}>{item.group}</Text>;
    }
    const row = item.item;
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => onSelect(row.id)}
        style={styles.row}
      >
        <Text style={styles.rowTitle}>{row.title}</Text>
        {row.subtitle ? <Text style={styles.rowSubtitle}>{row.subtitle}</Text> : null}
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="검색"
          placeholderTextColor={SeugiColor.Gray500}
          style={styles.search}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>
      <FlatList
        data={flatData}
        keyExtractor={(item, index) =>
          item.type === "header" ? `h-${item.group}` : `r-${item.item.id}-${index}`
        }
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>일치하는 항목이 없습니다.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SeugiColor.Primary050 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  search: {
    backgroundColor: SeugiColor.White,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: SeugiColor.Gray800,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SeugiColor.Gray300,
  },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  group: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "700",
    color: SeugiColor.Gray600,
    textTransform: "uppercase",
  },
  row: {
    backgroundColor: SeugiColor.White,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SeugiColor.Gray200,
  },
  rowTitle: { fontSize: 16, fontWeight: "600", color: SeugiColor.Gray800 },
  rowSubtitle: { marginTop: 4, fontSize: 13, color: SeugiColor.Gray600 },
  empty: { textAlign: "center", color: SeugiColor.Gray600, marginTop: 24 },
});
