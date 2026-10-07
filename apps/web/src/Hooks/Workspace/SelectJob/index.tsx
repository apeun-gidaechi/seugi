import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom';
import { paths } from '@/Constants/paths';
import Cookies from 'js-cookie';
import { joinWorkspace } from '@/Api/workspace';

type Role = 'NONE' | 'STUDENT' | 'TEACHER';

const index = () => {
    const navigate = useNavigate();
    const token = Cookies.get("accessToken");
    const [selectedRole, setSelectedRole] = useState<Role>('NONE');
    const location = useLocation();
    const { verificationCode, workspaceId } = location.state || {};

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        }
    }, []);

    const handleStudentClick = () => {
        setSelectedRole('STUDENT');
    };

    const handleTeacherClick = () => {
        setSelectedRole('TEACHER');
    };

    const getTextColor = (role: Role) => {
        return selectedRole === role ? '#000000' : '#808080';
    };

    const getBorderColor = (role: Role) => {
        return selectedRole === role ? '#1D93F3' : '#E0E0E0';
    };

    const handleSelectedJob = async () => {
        if (selectedRole === 'NONE') {
            alert("학생/선생님 선택해주세요");
            return;
        }

        try {
            await joinWorkspace({
                workspaceId: workspaceId,
                workspaceCode: verificationCode,
                role: selectedRole,
            });
            navigate(paths.waitingjoin, { state: { token } });
        } catch (error) {
            console.error("error", error);
        }
    };

    const Backclick = () => {
        navigate(paths.joinsuccess);
    }

    return {
        token,
        selectedRole,
        handleStudentClick,
        handleTeacherClick,
        getTextColor,
        getBorderColor,
        handleSelectedJob,
        Backclick,
        setSelectedRole
    }
}

export default index
