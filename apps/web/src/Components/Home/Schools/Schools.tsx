import React from 'react';
import SchoolImg from "@/Assets/image/home/school.svg";
import * as S from '@/Components/Home/Schools/Schools.style';
import Changeschool from '@/Components/Home/ChangeSchool/ChangeSchool';
import ArrowImg from "@/Assets/image/home/arrow.svg";
import useSchools from '@/Hooks/HomeHook/Schools/index';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/Constants/paths';
import type { PendingWorkspaceCard, WorkspaceCard } from '@/Api/workspace';

interface Props {
    workspaces: WorkspaceCard[];
    pendingWorkspaces: PendingWorkspaceCard[];
}

const Schools = ({ workspaces, pendingWorkspaces }: Props) => {
    const { ...Schools } = useSchools();
    const navigate = useNavigate();

    const handleSetting = () => {
        navigate(paths.admingeneral);
    }

    return (
        <S.UpContainer>
            {Schools.showChangeschool && (
                <div ref={Schools.ChangeSchoolRef}>
                    <Changeschool
                        onClose={Schools.handleOnClicked}
                        workspaces={workspaces}
                        pendingWorkspaces={pendingWorkspaces}
                    />
                </div>
            )}
            <S.SchoolTitleBox>
                <S.SchoolTitleDiv>
                    <S.SchoolImg src={SchoolImg} />
                    <S.MySchooliTitle>내 학교</S.MySchooliTitle>
                </S.SchoolTitleDiv>
                <S.ButtonDiv>
                    <S.ArrowLButton onClick={handleSetting} className="Calendar">
                        <S.ArrowLogo src={ArrowImg} />
                    </S.ArrowLButton>
                </S.ButtonDiv>
            </S.SchoolTitleBox>
            {workspaces && workspaces.length > 0 ? (
                <>
                    <S.SchoolBox>
                        <S.SchoolName>{Schools.workspaceName}</S.SchoolName>
                        <S.ChangeSchool onClick={Schools.handleOnClicked} className='ChangeSchool'>
                            전환
                        </S.ChangeSchool>
                    </S.SchoolBox>
                </>
            ) : (
                <S.NoSchoolDiv>
                    <S.NoSchoolMessage>가입된 학교가 없습니다.</S.NoSchoolMessage>
                </S.NoSchoolDiv>
            )}
        </S.UpContainer>
    );
}

export default Schools;
