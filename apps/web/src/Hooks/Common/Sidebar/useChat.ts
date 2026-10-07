import {useEffect, useState} from "react";
import Cookies from "js-cookie";
import {useLocation} from "react-router-dom";
import type { ChatRoom } from "@/Components/common/ChatRoom";
import { createPersonalChatRoom, searchChatRooms } from "@/Api/chat";

type ApiRoom = { id: string; workspaceId: string; type: string; name: string; adminId: string; image?: string; memberIds: string[] };
const toChatRoom = (room: ApiRoom): ChatRoom => ({ id: room.id, workspaceId: room.workspaceId, type: room.type, roomAdmin: Number(room.adminId), chatName: room.name, chatRoomImg: room.image ?? "", createdAt: "", chatStatusEnum: "ALIVE", joinUserInfo: [], lastMessage: "", lastMessageTimestamp: "", notReadCnt: 0 });

// Axios 인스턴스 생성
// export const SeugiCustomAxios: AxiosInstance = axios.create({
//   baseURL: SERVER_URL,
// });

// useChatSidebar 훅 정의
const useChat = () => {  
  const location = useLocation();
  const pathname = location.pathname;

  const [personalChatRooms, updatePersonalChatRooms] = useState<ChatRoom[]>([]); // 개인 채팅방 상태
  const [groupChatRooms, updateGroupChatRooms] = useState<ChatRoom[]>([]); // 그룹 채팅방 상태
  const selectedChatRooms: ChatRoom[] = pathname === "/groupchat"
    ? Array.isArray(groupChatRooms) ? groupChatRooms : []
    : Array.isArray(personalChatRooms) ? personalChatRooms : [];

  const [selectedRoom, setSelectedRoom] = useState<ChatRoom>(); // 선택한 채팅방

  useEffect(() => {
    fetchChatRooms();
  }, [pathname]);

  // 채팅방 목록 가져오는 함수
  const fetchChatRooms = async () => {
    try {
      const storedWorkspaceId = Cookies.get("workspaceId") || null; // 쿠키에서 workspaceId 가져오기

      // 경로에 따라 개인 또는 그룹 채팅방 검색
      if (pathname === "/chat") {
        if (!storedWorkspaceId) return;
        const rooms = await searchChatRooms(storedWorkspaceId, "", "personal");
        const personalRooms = (rooms as ApiRoom[]).map(toChatRoom);
        updatePersonalChatRooms(personalRooms);
      } else if (pathname === "/groupchat") {
        if (!storedWorkspaceId) return;
        const rooms = await searchChatRooms(storedWorkspaceId, "", "group");
        const groupRooms = (rooms as ApiRoom[]).map(toChatRoom);
        updateGroupChatRooms(groupRooms);
      }
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
    }
  };

  const createRoom = async (roomName: string) => {
    const workspaceId = Cookies.get("workspaceId");
    if (!workspaceId) return;
    try {
      await createPersonalChatRoom(workspaceId, roomName);

      // const newRoomList = [...personalChatRooms, roomName]; // 새로운 방 추가
      // updatePersonalChatRooms(newRoomList); // 업데이트된 상태 저장
      // handleChatRoomClick(roomName);
    } catch (error) {
      console.error(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleChatRoomClick = (room: ChatRoom) => {
    setSelectedRoom(room);
  };

  return {
    handleChatRoomClick,
    selectedChatRooms,
    selectedRoom
  };
};

export default useChat;
