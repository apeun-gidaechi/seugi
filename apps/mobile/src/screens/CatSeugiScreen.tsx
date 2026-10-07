import { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { Workspace } from "@seugi/contracts";
import { Button } from "../components/ui";
import { api } from "../services/api";

type ChatMessage = { id: string; role: "assistant" | "user"; content: string };

const suggestions = ["오늘 급식 뭐야?", "오늘의 시간표 알려줘"];

export function CatSeugiScreen({ workspace }: { workspace: Workspace }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "안녕? 반갑다스기! 학교에 대한 건 뭐든 물어보라스기!",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const list = useRef<FlatList<ChatMessage>>(null);

  const send = async (content = draft) => {
    const text = content.trim();
    if (!text || busy) return;
    setDraft("");
    setError("");
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", content: text },
    ]);
    setBusy(true);
    try {
      const result = await api.askCatSeugi(text, workspace.id);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.data ?? "답변을 받지 못했습니다.",
        },
      ]);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "전송 실패 · 다시 시도해 주세요",
      );
    } finally {
      setBusy(false);
      requestAnimationFrame(() =>
        list.current?.scrollToEnd({ animated: true }),
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlatList
        ref={list}
        style={styles.messages}
        contentContainerStyle={styles.messageList}
        data={messages}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() =>
          list.current?.scrollToEnd({ animated: true })
        }
        renderItem={({ item }) => (
          <View
            style={[styles.messageRow, item.role === "user" && styles.userRow]}
          >
            <Text
              style={[
                styles.bubble,
                item.role === "user"
                  ? styles.userBubble
                  : styles.assistantBubble,
              ]}
            >
              {item.content}
            </Text>
          </View>
        )}
        ListFooterComponent={
          busy ? (
            <Text style={styles.loading}>캣스기가 답변 중이에요…</Text>
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null
        }
      />
      {messages.length === 1 ? (
        <View style={styles.suggestions}>
          {suggestions.map((suggestion) => (
            <TouchableOpacity
              key={suggestion}
              onPress={() => void send(suggestion)}
              disabled={busy}
              style={styles.suggestion}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => void send()}
          returnKeyType="send"
          placeholder="메세지 보내기"
          style={styles.input}
          editable={!busy}
        />
        <Button
          label={busy ? "…" : "전송"}
          onPress={() => void send()}
          disabled={busy || !draft.trim()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SeugiColor.Primary050 },
  messages: { flex: 1 },
  messageList: { padding: 12, gap: 8, flexGrow: 1, justifyContent: "flex-end" },
  messageRow: { flexDirection: "row", justifyContent: "flex-start" },
  userRow: { justifyContent: "flex-end" },
  bubble: {
    maxWidth: "86%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    color: SeugiColor.Gray800,
  },
  assistantBubble: {
    backgroundColor: SeugiColor.White,
    borderTopLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: SeugiColor.Primary100,
    borderTopRightRadius: 4,
  },
  loading: { padding: 12, color: SeugiColor.Gray500, fontSize: 12 },
  error: { padding: 12, color: SeugiColor.Red500 },
  suggestions: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  suggestion: {
    flex: 1,
    padding: 10,
    borderRadius: 16,
    backgroundColor: SeugiColor.Primary100,
  },
  suggestionText: {
    color: SeugiColor.Gray700,
    fontSize: 12,
    textAlign: "center",
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: SeugiColor.White,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: SeugiColor.Gray300,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: SeugiColor.White,
  },
});
