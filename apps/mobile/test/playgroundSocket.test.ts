import test from "node:test";
import assert from "node:assert/strict";
import { createPlaygroundSocket } from "../src/playground/playgroundSocket.ts";

test("playground socket connects and acknowledges chat:message", async () => {
  const socket = createPlaygroundSocket();
  await new Promise<void>((resolve) => socket.once("connect", () => resolve()));

  const result = await new Promise<{ message: string }>((resolve) => {
    socket.emit("chat:message", { roomId: "room-demo", message: "hello", type: "MESSAGE" }, (ack) =>
      resolve(ack),
    );
  });

  assert.equal(result.message, "메시지 전송 성공");
  socket.close();
});
