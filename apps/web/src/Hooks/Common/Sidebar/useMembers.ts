import { useEffect, useState } from 'react';
import { getWorkspaceMembers } from '@/Api/admin';

interface Member {
  id: string;
  name: string;
  department: string;
}

const useMembers = (workspaceId: string) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResult, setSearchResult] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  useEffect(() => {
    if (searchTerm) {
      searchMembers(searchTerm);
    } else {
      setSearchResult([]);
    }
  }, [searchTerm]);

  const searchMembers = async (term: string) => {
    if (workspaceId) {
      try {
        const response = await getWorkspaceMembers(workspaceId);

        const members: Member[] = response.map((m) => ({
          id: m.member.id,
          name: m.member.nick || m.member.name,
          department: m.member.belong || "",
        }));

        setSearchResult(members.filter(
          (item) =>
            item.name.toLowerCase().includes(term.toLowerCase()) ||
            item.department.toLowerCase().includes(term.toLowerCase())
        ));
      } catch (error) {
        console.error("Error fetching members:", error);
        alert('멤버를 가져오는 중 오류가 발생했습니다.');
      }
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleMemberClick = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((memberId) => memberId !== id) : [...prev, id]
    );
  };

  const combinedResults = [
    ...selectedMembers.map((id) => searchResult.find((item) => item.id === id)!).filter(Boolean),
    ...searchResult.filter((item) => !selectedMembers.includes(item.id)),
  ];

  return {
    searchTerm,
    handleSearchChange,
    handleMemberClick,
    combinedResults,
    selectedMembers,
  };
};

export default useMembers;
