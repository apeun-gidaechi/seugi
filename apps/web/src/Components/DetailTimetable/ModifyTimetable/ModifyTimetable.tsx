import React, { useState, useEffect } from "react";
import * as S from "./ModifyTimetable.style";
import CancleImg from "@/Assets/image/profile/CancleImg.svg";
import { getTimeTable } from "@/Api/Home";
import { updateTimetableEntry } from "@/Api/timetable";
import Cookies from "js-cookie";

const ModifyTimetable = () => {
  const workspaceId = Cookies.get("workspaceId") || "";
  const [inputValue, setInputValue] = useState("");
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const data = await getTimeTable(workspaceId);
        setId(data[0]?.id ?? null);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTimetable();
  }, []);

  const handleCancelClick = () => {
    setInputValue("");
  };

  const handleChangeSubject = async () => {
    if (id === null) {
      console.error("ID가 없습니다.");
      return;
    }

    try {
      await updateTimetableEntry(id, inputValue);
    } catch (err) {
      console.error(err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      return;
    }
  };

  return (
    <S.ModifyDiv>
      <S.TitleDiv>
        <S.Title>시간표 수정</S.Title>
        <S.CompleteButton onClick={handleChangeSubject}>
          <S.subtitle>완료</S.subtitle>
        </S.CompleteButton>
      </S.TitleDiv>
      <S.InputDiv>
        <S.InputTag
          placeholder="과목 이름을 입력해주세요"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <S.CancleButton onClick={handleCancelClick}>
          <S.ButtonImg src={CancleImg} />
        </S.CancleButton>
      </S.InputDiv>
    </S.ModifyDiv>
  );
};

export default ModifyTimetable;
