import React, { useState, useEffect } from "react";
import { Avatar as AvatarPrimitive, avatarSize } from "@/Components/ui";
import DefaultProfileImage from "@/Assets/image/profile/Avatar.svg";
import { getMyInfos } from "@/Api/profile";

interface AvatarProps {
  size?: keyof typeof avatarSize;
  imageUrl?: string;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;
const normalizeImageUrl = (url: string) => (url.startsWith("/") ? `${SERVER_URL}${url}` : url);

const Avatar = ({ size = "medium", imageUrl }: AvatarProps) => {
  const [userProfileImage, setProfileImage] = useState(DefaultProfileImage);

  useEffect(() => {
    if (imageUrl) {
      setProfileImage(normalizeImageUrl(imageUrl));
      return;
    }
    const fetchProfileImage = async () => {
      try {
        const res = await getMyInfos();
        const fetchedImage = res.picture;

        if (fetchedImage) {
          setProfileImage(normalizeImageUrl(fetchedImage));
        } else {
          setProfileImage(DefaultProfileImage);
        }
      } catch (error) {
        console.error("프로필 이미지 가져오기 오류:", error);
      }
    };

    fetchProfileImage();
    // const intervalId = setInterval(fetchProfileImage, 10000);

    // return () => {
    //   clearInterval(intervalId);
    // };
  }, [imageUrl]);

  return <AvatarPrimitive src={userProfileImage} size={size} alt="" />;
};

export default Avatar;
