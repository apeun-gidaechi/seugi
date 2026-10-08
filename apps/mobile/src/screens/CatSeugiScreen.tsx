import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { Workspace } from "@seugi/contracts";
import { api } from "../services/api";
import { SeugiChatTextField } from "../design-system/TextField";
import { SeugiLoadingIndicator } from "../design-system/LoadingIndicator";
import { catseugiVisibleText } from "../utils/catseugi";

type ChatMessage = { id: string; role: "assistant" | "user"; content: string };

const suggestions =
  Platform.OS === "ios"
    ? ["오늘 급식 뭐야?", "8월 행사 알려줘"]
    : ["오늘 급식 뭐야?", "오늘의 시간표 알려줘"];

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
  const [participants, setParticipants] = useState<Array<{ id: string; name: string }>>([]);
  const list = useRef<FlatList<ChatMessage>>(null);
  useEffect(() => {
    let active = true;
    api
      .workspaceMembers(workspace.id)
      .then((result) => {
        if (active) setParticipants((result.data ?? []).map(({ id, name }) => ({ id, name })));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [workspace.id]);

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
      let answerParticipants = participants;
      if (result.data) {
        try {
          const keyword = (JSON.parse(result.data) as { keyword?: string }).keyword;
          if ((keyword === "사람 뽑기" || keyword === "팀짜기") && !answerParticipants.length) {
            const members = await api.workspaceMembers(workspace.id);
            answerParticipants = (members.data ?? []).map(({ id, name }) => ({ id, name }));
            setParticipants(answerParticipants);
          }
        } catch {
          /* Non-envelope answers are rendered as ordinary text. */
        }
      }
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.data
            ? catseugiVisibleText(result.data, answerParticipants)
            : "답변을 받지 못했습니다.",
        },
      ]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "전송 실패 · 다시 시도해 주세요");
    } finally {
      setBusy(false);
      requestAnimationFrame(() => list.current?.scrollToEnd({ animated: true }));
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
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[styles.messageRow, item.role === "user" && styles.userRow]}>
            <Text
              style={[
                styles.bubble,
                item.role === "user" ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              {item.content}
            </Text>
          </View>
        )}
        ListFooterComponent={
          busy && Platform.OS === "android" ? (
            <View style={[styles.bubble, styles.assistantBubble, styles.loadingBubble]}>
              <SeugiLoadingIndicator />
            </View>
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null
        }
      />
      {Platform.OS === "ios" ? (
        messages.length === 1
      ) : messages.length === 1 || !!draft.trim() ? (
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
      <SeugiChatTextField
        value={draft}
        onChangeText={setDraft}
        onSendClick={() => void send()}
        placeholder="메세지 보내기"
        editable={!busy}
        sendEnabled={!busy && !!draft.trim()}
      />
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
  loadingBubble: { minWidth: 60, minHeight: 40, justifyContent: "center", alignItems: "center" },
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
});
