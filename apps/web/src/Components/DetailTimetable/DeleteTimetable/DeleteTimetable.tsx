import React, { useEffect, useState } from 'react';
import * as S from './DeleteTimetable.style';
import { getTimeTable } from '@/Api/Home';
import Cookies from 'js-cookie';
import { deleteTimetableEntry } from '@/Api/timetable';

interface DeleteTimetableProps {
    onCancel: () => void;
}

const DeleteTimetable = ({ onCancel }: DeleteTimetableProps) => {
    const workspaceId = Cookies.get("workspaceId") || "";
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

    const handleDelete = async () => {
        try {
            if (!id) return;
            await deleteTimetableEntry(id);
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <S.DeleteDiv>
            <S.TitleDiv>
                <S.Title>시간표를 삭제 하시겠습니까?</S.Title>
            </S.TitleDiv>
            <S.ButtonDiv>
                <S.CancleButton onClick={onCancel}>
                    <S.CancleButtonSpan>취소</S.CancleButtonSpan>
                </S.CancleButton>
                <S.DeleteButton onClick={handleDelete}>
                    <S.DeleteButtonSpan>삭제</S.DeleteButtonSpan>
                </S.DeleteButton>
            </S.ButtonDiv>
        </S.DeleteDiv>
    );
}

export default DeleteTimetable;
