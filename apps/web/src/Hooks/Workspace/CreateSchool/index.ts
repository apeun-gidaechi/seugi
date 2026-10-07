import { useState, ChangeEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import createSchoolImg from '@/Assets/image/join-school/createshoolimg.svg';
import { paths } from '@/Constants/paths';
import Cookies from 'js-cookie';
import { SeugiApiError } from '@seugi/api-client';
import { uploadImage } from '@/Api/files';
import { createWorkspace } from '@/Api/workspace';

const index = () => {
    const navigate = useNavigate();
    const token = Cookies.get("accessToken");
    const [workspaceName, setWorkspaceName] = useState<string>('');
    const [workspaceImageUrl, setWorkspaceImageUrl] = useState<string | null>(null);

    const isworkspaceImg = workspaceImageUrl ? workspaceImageUrl : createSchoolImg;

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    const handleCreateSchool = async () => {
        if (!workspaceName.trim()) {
            alert('학교 이름을 입력해주세요.');
            return;
        }

        try {
            await createWorkspace({
                workspaceName,
                workspaceImageUrl: workspaceImageUrl ?? ''
            });
            navigate(paths.home);

        } catch (error) {
            if (error instanceof SeugiApiError && error.status === 401) {
                navigate(paths.login);
            } else {
                console.error('Error:', error);
            }
        }
    };

    const handleChangeImage = async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) {
            console.warn('No files selected');
            return;
        }

        const formData = new FormData();
        formData.append('type', 'IMG');
        formData.append('file', e.target.files[0]);

        try {
            const uploaded = await uploadImage(formData);
            setWorkspaceImageUrl(uploaded.url);
        } catch (error) {
            if (error instanceof SeugiApiError && error.status === 401) {
                navigate(paths.login);
            } else {
                console.error('Error:', error);
            }
        }
    };

    const Backclick = () => {
        navigate(paths.selectschool);
    };

    return {
        token,
        workspaceName,
        workspaceImageUrl,
        isworkspaceImg,
        setWorkspaceName,
        handleCreateSchool,
        handleChangeImage,
        Backclick,
    }
}

export default index
